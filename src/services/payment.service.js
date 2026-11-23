import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";
import { getStripe } from "../config/stripe.js";

const normalizeStatus = (status) =>
  String(status || "")
    .toLowerCase()
    .replaceAll("_", "-")
    .replace("on-progress", "in-progress");

const getObjectId = (value) => {
  if (value instanceof ObjectId) return value;
  if (typeof value === "string" && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  return null;
};

const toIsoString = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && !Number.isNaN(new Date(value).getTime())) {
    return new Date(value).toISOString();
  }
  return null;
};

const getClientOrigin = () =>
  (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/+$/, "");

export const createBookingCheckoutSession = async (bookingId, user) => {
  const database = getDatabase();
  const bookingObjectId = new ObjectId(bookingId);
  const booking = await database.collection("bookings").findOne({
    _id: bookingObjectId,
    customerId: user.id,
  });

  if (!booking) return { error: "booking-not-found" };
  if (normalizeStatus(booking.status) !== "completed") {
    return { error: "booking-not-completed" };
  }
  if (String(booking.paymentStatus || "").toLowerCase() === "paid") {
    return { error: "already-paid" };
  }
  if (booking.paymentRequested !== true) {
    return { error: "payment-not-requested" };
  }

  const serviceId = getObjectId(booking.serviceId);
  const service = serviceId
    ? await database.collection("services").findOne({ _id: serviceId })
    : null;
  if (!service) return { error: "service-not-found" };

  const amount = Number(
    booking.finalAmount ?? booking.basePrice ?? service.basePrice,
  );
  const unitAmount = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(unitAmount) ||
    unitAmount > 99_999_999 ||
    Math.abs(amount - unitAmount / 100) > 0.001
  ) {
    return { error: "invalid-payment-amount" };
  }

  const bookings = database.collection("bookings");
  const lockId = randomUUID();
  const now = new Date();
  const lockResult = await bookings.updateOne(
    {
      _id: booking._id,
      customerId: user.id,
      paymentStatus: { $not: /^paid$/i },
      $or: [
        { "stripeCheckout.lockExpiresAt": { $exists: false } },
        { "stripeCheckout.lockExpiresAt": { $lte: now } },
      ],
    },
    {
      $set: {
        "stripeCheckout.lockId": lockId,
        "stripeCheckout.lockExpiresAt": new Date(now.getTime() + 120_000),
      },
    },
  );
  if (lockResult.modifiedCount === 0) return { error: "checkout-in-progress" };

  try {
    const lockedBooking = await bookings.findOne({
      _id: booking._id,
      customerId: user.id,
      "stripeCheckout.lockId": lockId,
    });
    if (!lockedBooking) return { error: "checkout-lock-lost" };

    const stripe = getStripe();
    const existingSessionId = lockedBooking.stripeCheckout?.sessionId;
    let isExistingSessionExpired = false;
    if (existingSessionId) {
      const existingSession =
        await stripe.checkout.sessions.retrieve(existingSessionId);
      if (existingSession.status === "open" && existingSession.url) {
        return { url: existingSession.url };
      }
      if (
        existingSession.status === "complete" &&
        existingSession.payment_status === "paid"
      ) {
        return {
          url: `${getClientOrigin()}/dashboard/customer/payment/success?session_id=${encodeURIComponent(existingSession.id)}`,
        };
      }
      if (existingSession.status === "complete") {
        return { error: "payment-processing" };
      }
      if (existingSession.status !== "expired") {
        return { error: "session-cannot-be-reused" };
      }
      isExistingSessionExpired = true;
    }

    const idempotencyKey =
      !isExistingSessionExpired &&
      typeof lockedBooking.stripeCheckout?.idempotencyKey === "string"
        ? lockedBooking.stripeCheckout.idempotencyKey
        : randomUUID();
    const checkoutStateUpdate = await bookings.updateOne(
      { _id: booking._id, "stripeCheckout.lockId": lockId },
      {
        $set: { "stripeCheckout.idempotencyKey": idempotencyKey },
        ...(isExistingSessionExpired
          ? {
              $unset: {
                "stripeCheckout.sessionId": "",
                "stripeCheckout.createdAt": "",
              },
            }
          : {}),
      },
    );
    if (checkoutStateUpdate.matchedCount === 0) {
      throw new Error("Could not save payment session state");
    }

    const clientOrigin = getClientOrigin();
    const checkoutPayload = {
      mode: "payment",
      customer_email: user.email,
      client_reference_id: bookingId,
      line_items: [
        {
          price_data: {
            currency: "bdt",
            unit_amount: unitAmount,
            product_data: {
              name: service.title || "FixMate repair service",
              description: `${service.category || "Repair"} · ${service.serviceMode || "Service"}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId,
        customerId: user.id,
        serviceTitle: String(service.title || ""),
        category: String(service.category || ""),
        serviceMode: String(service.serviceMode || ""),
        technicianName: String(service.technicianName || ""),
      },
      payment_intent_data: {
        metadata: {
          bookingId,
          customerId: user.id,
        },
      },
      success_url: `${clientOrigin}/dashboard/customer/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientOrigin}/dashboard/customer/payment/cancel?booking_id=${encodeURIComponent(bookingId)}`,
    };

    let attemptKey = idempotencyKey;
    let checkoutSession;
    for (let attempt = 1; attempt <= 2 && !checkoutSession; attempt += 1) {
      try {
        checkoutSession = await stripe.checkout.sessions.create(checkoutPayload, {
          idempotencyKey: attemptKey,
        });
      } catch (error) {
        const statusCode = Number(error?.statusCode ?? 0);
        if (statusCode >= 400 && statusCode < 500) {
          // Stripe replays the stored response for a reused idempotency key, so
          // a rejected request would keep failing on every retry. Drop the key
          // for definitive rejections; network/5xx errors keep it so a retry
          // can recover a session Stripe may already have created.
          await bookings.updateOne(
            { _id: booking._id, "stripeCheckout.lockId": lockId },
            { $unset: { "stripeCheckout.idempotencyKey": "" } },
          );
        }
        // A stale key from an earlier attempt (for example after the amount
        // changed) can only be reused with identical parameters. Retry once
        // with a fresh key instead of failing the payment.
        if (
          error?.type !== "StripeIdempotencyError" ||
          attempt === 2
        ) {
          throw error;
        }
        attemptKey = randomUUID();
        await bookings.updateOne(
          { _id: booking._id, "stripeCheckout.lockId": lockId },
          { $set: { "stripeCheckout.idempotencyKey": attemptKey } },
        );
      }
    }
    if (!checkoutSession) {
      throw new Error("Could not create a Stripe checkout session");
    }
    if (!checkoutSession.url) return { error: "missing-checkout-url" };

    const savedSession = await bookings.updateOne(
      { _id: booking._id, "stripeCheckout.lockId": lockId },
      {
        $set: {
          "stripeCheckout.sessionId": checkoutSession.id,
          "stripeCheckout.createdAt": new Date(),
        },
      },
    );
    if (savedSession.modifiedCount === 0) {
      throw new Error("Could not save Stripe checkout session");
    }

    return { url: checkoutSession.url };
  } finally {
    await bookings.updateOne(
      { _id: booking._id, "stripeCheckout.lockId": lockId },
      {
        $unset: {
          "stripeCheckout.lockId": "",
          "stripeCheckout.lockExpiresAt": "",
        },
      },
    );
  }
};

export const confirmStripeCheckout = async (sessionId, customerId) => {
  const checkout = await getStripe().checkout.sessions.retrieve(sessionId);
  if (
    checkout.status !== "complete" ||
    checkout.payment_status !== "paid" ||
    checkout.metadata?.customerId !== customerId
  ) {
    throw new Error("Stripe could not verify this completed payment");
  }

  const bookingId = checkout.metadata.bookingId;
  const transactionId =
    typeof checkout.payment_intent === "string"
      ? checkout.payment_intent
      : checkout.payment_intent?.id;
  const amount = checkout.amount_total;
  if (
    !bookingId ||
    !/^[a-f\d]{24}$/i.test(bookingId) ||
    !transactionId ||
    checkout.currency !== "bdt" ||
    typeof amount !== "number" ||
    amount <= 0
  ) {
    throw new Error("Stripe returned incomplete payment details");
  }

  const database = getDatabase();
  const bookings = database.collection("bookings");
  const bookingObjectId = new ObjectId(bookingId);
  const booking = await bookings.findOne({
    _id: bookingObjectId,
    customerId,
  });
  if (!booking) {
    throw new Error("The paid booking does not belong to this customer");
  }

  const existingPayment = booking.stripePayment;
  if (
    String(booking.paymentStatus || "").toLowerCase() === "paid" &&
    existingPayment?.checkoutSessionId === checkout.id
  ) {
    return {
      amount: existingPayment.amount,
      transactionId: existingPayment.transactionId,
      paymentDate: toIsoString(existingPayment.paidAt),
    };
  }
  if (String(booking.paymentStatus || "").toLowerCase() === "paid") {
    throw new Error("This booking has already been paid");
  }
  if (booking.paymentRequested !== true) {
    throw new Error("The technician has not requested payment for this booking");
  }

  const serviceId = getObjectId(booking.serviceId);
  const service = serviceId
    ? await database.collection("services").findOne({ _id: serviceId })
    : null;
  const metadata = checkout.metadata;
  const paymentDate = new Date();
  const paidAmount = amount / 100;
  const stripePayment = {
    checkoutSessionId: checkout.id,
    transactionId,
    amount: paidAmount,
    currency: checkout.currency,
    paidAt: paymentDate,
    serviceTitle: metadata.serviceTitle || service?.title || "",
    category: metadata.category || service?.category || "",
    serviceMode: metadata.serviceMode || service?.serviceMode || "",
    technicianName: metadata.technicianName || service?.technicianName || "",
  };

  const updateResult = await bookings.updateOne(
    {
      _id: bookingObjectId,
      customerId,
      paymentStatus: { $ne: "paid" },
      paymentRequested: true,
    },
    {
      $set: {
        paymentStatus: "paid",
        paymentRequested: false,
        finalAmount: paidAmount,
        stripePayment,
        updatedAt: paymentDate,
      },
    },
  );
  if (updateResult.modifiedCount === 0) {
    const currentBooking = await bookings.findOne({
      _id: bookingObjectId,
      customerId,
    });
    if (currentBooking?.stripePayment?.checkoutSessionId === checkout.id) {
      return {
        amount: currentBooking.stripePayment.amount,
        transactionId: currentBooking.stripePayment.transactionId,
        paymentDate: toIsoString(currentBooking.stripePayment.paidAt),
      };
    }
    throw new Error("This booking has already been paid");
  }

  return {
    amount: paidAmount,
    transactionId,
    paymentDate: paymentDate.toISOString(),
  };
};

export const getCustomerPaymentHistory = async (customerId) => {
  const database = getDatabase();
  const bookings = await database
    .collection("bookings")
    .find({
      customerId,
      paymentStatus: { $regex: "^paid$", $options: "i" },
    })
    .sort({ "stripePayment.paidAt": -1, updatedAt: -1 })
    .toArray();

  const serviceIds = [
    ...new Map(
      bookings.flatMap((booking) => {
        const id = getObjectId(booking.serviceId);
        return id ? [[id.toString(), id]] : [];
      }),
    ).values(),
  ];
  const services = serviceIds.length
    ? await database
        .collection("services")
        .find(
          { _id: { $in: serviceIds } },
          {
            projection: {
              title: 1,
              category: 1,
              technicianName: 1,
              basePrice: 1,
            },
          },
        )
        .toArray()
    : [];
  const serviceById = new Map(
    services.map((service) => [service._id.toString(), service]),
  );

  return bookings.map((booking) => {
    const service = serviceById.get(booking.serviceId?.toString() || "");
    const payment = booking.stripePayment;
    return {
      id: booking._id.toString(),
      service: payment?.category || service?.category || "",
      title: payment?.serviceTitle || service?.title || "Service unavailable",
      technicianName:
        payment?.technicianName || service?.technicianName || "",
      amount:
        payment?.amount ??
        booking.finalAmount ??
        booking.basePrice ??
        service?.basePrice ??
        null,
      transactionId: payment?.transactionId || null,
      paymentDate:
        toIsoString(payment?.paidAt) ??
        toIsoString(booking.updatedAt) ??
        toIsoString(booking.createdAt),
    };
  });
};

export const getAdminPaymentTransactions = async () => {
  const database = getDatabase();
  const bookings = await database
    .collection("bookings")
    .find({ paymentStatus: { $regex: "^paid$", $options: "i" } })
    .sort({ "stripePayment.paidAt": -1, updatedAt: -1, _id: -1 })
    .toArray();

  const serviceIds = [
    ...new Map(
      bookings.flatMap((booking) => {
        const id = getObjectId(booking.serviceId);
        return id ? [[id.toString(), id]] : [];
      }),
    ).values(),
  ];
  const services = serviceIds.length
    ? await database
        .collection("services")
        .find(
          { _id: { $in: serviceIds } },
          { projection: { title: 1, technicianName: 1 } },
        )
        .toArray()
    : [];
  const serviceById = new Map(
    services.map((service) => [service._id.toString(), service]),
  );

  const transactions = bookings.map((booking) => {
    const service = serviceById.get(booking.serviceId?.toString() || "");
    const payment = booking.stripePayment;
    const rawAmount =
      payment?.amount ?? booking.finalAmount ?? booking.basePrice ?? null;
    const parsedAmount = rawAmount === null ? null : Number(rawAmount);

    return {
      id: booking._id.toString(),
      customerName: String(booking.customerName || "Customer unavailable"),
      technicianName: String(
        payment?.technicianName ||
          service?.technicianName ||
          booking.technicianName ||
          "",
      ),
      serviceTitle: String(
        payment?.serviceTitle || service?.title || "Service unavailable",
      ),
      amount:
        parsedAmount !== null && Number.isFinite(parsedAmount)
          ? parsedAmount
          : null,
      transactionId:
        typeof payment?.transactionId === "string"
          ? payment.transactionId
          : null,
      paymentDate:
        toIsoString(payment?.paidAt) ??
        toIsoString(booking.updatedAt) ??
        toIsoString(booking.createdAt),
    };
  });

  const totalCents = transactions.reduce(
    (total, transaction) =>
      total +
      (transaction.amount === null
        ? 0
        : Math.round(transaction.amount * 100)),
    0,
  );

  return { transactions, totalRevenue: totalCents / 100 };
};

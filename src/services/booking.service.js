import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";

const activeBookingStatuses = [
  "requested",
  "accepted",
  "in-progress",
  "on-progress",
  "pending",
];

// Find Active Booking
export const findActiveBooking = async (customerId, serviceId) => {
  return getDatabase()
    .collection("bookings")
    .findOne(
      {
        customerId,
        serviceId: new ObjectId(serviceId),
        status: { $in: activeBookingStatuses },
      },
      { projection: { _id: 1 } },
    );
};

// Bookings By Customer ID
export const getBookingsByCustomerId = async (customerId) => {
  const database = getDatabase();
  const bookings = await database
    .collection("bookings")
    .find({ customerId })
    .sort({ createdAt: -1 })
    .toArray();

  return Promise.all(
    bookings.map(async (booking) => {
      const serviceId =
        booking.serviceId instanceof ObjectId
          ? booking.serviceId
          : typeof booking.serviceId === "string" &&
              ObjectId.isValid(booking.serviceId)
            ? new ObjectId(booking.serviceId)
            : null;

      const service = serviceId
        ? await database.collection("services").findOne(
            { _id: serviceId },
            {
              projection: {
                title: 1,
                serviceImage: 1,
                technicianName: 1,
                basePrice: 1,
                category: 1,
                serviceMode: 1,
              },
            },
          )
        : null;

      return { ...booking, service };
    }),
  );
};

// Bookings for services owned by a technician
export const getBookingsByTechnicianId = async (technicianId) => {
  const database = getDatabase();
  const services = await database
    .collection("services")
    .find(
      { technicianId },
      { projection: { _id: 1, title: 1, basePrice: 1 } },
    )
    .toArray();

  if (services.length === 0) {
    return [];
  }

  const serviceById = new Map(
    services.map((service) => [service._id.toString(), service]),
  );
  const serviceIds = services.flatMap((service) => [
    service._id,
    service._id.toString(),
  ]);
  const bookings = await database
    .collection("bookings")
    .find({ serviceId: { $in: serviceIds } })
    .sort({ createdAt: -1 })
    .toArray();

  return bookings.map((booking) => {
    const serviceId = booking.serviceId?.toString() || "";
    const bookingDate =
      booking.bookingDate instanceof Date
        ? booking.bookingDate.toISOString()
        : String(booking.bookingDate || "");

    return {
      _id: booking._id.toString(),
      serviceId,
      customerName: booking.customerName || "",
      phone: booking.phone || "",
      address: booking.address || "",
      bookingDate,
      problemDescription: booking.problemDescription || "",
      status: booking.status || "requested",
      paymentStatus: booking.paymentStatus || "unpaid",
      paymentRequested: booking.paymentRequested === true,
      finalAmount: booking.finalAmount,
      service: serviceById.get(serviceId) || null,
    };
  });
};

const adminBookingStatusAliases = {
  requested: ["requested", "pending"],
  accepted: ["accepted"],
  "in-progress": ["in-progress", "in_progress", "on-progress", "on_progress"],
  completed: ["completed"],
  cancelled: ["cancelled", "canceled"],
  rejected: ["rejected"],
};

const normalizeAdminBookingStatus = (status) => {
  const value = String(status || "requested")
    .toLowerCase()
    .replaceAll("_", "-");
  if (value === "pending") return "requested";
  if (value === "on-progress") return "in-progress";
  if (value === "canceled") return "cancelled";
  return value;
};

export const getAllBookingsForAdmin = async (status = "all") => {
  const database = getDatabase();
  const bookingQuery = {};

  if (status !== "all") {
    const aliases = adminBookingStatusAliases[status];
    if (!aliases) {
      throw new Error("Invalid booking status filter");
    }
    bookingQuery.status = {
      $regex: `^(?:${aliases.join("|")})$`,
      $options: "i",
    };
  }

  const bookings = await database
    .collection("bookings")
    .find(bookingQuery)
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  const serviceIds = [
    ...new Map(
      bookings.flatMap((booking) => {
        const id =
          booking.serviceId instanceof ObjectId
            ? booking.serviceId
            : typeof booking.serviceId === "string" &&
                ObjectId.isValid(booking.serviceId)
              ? new ObjectId(booking.serviceId)
              : null;
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
    const serviceId = booking.serviceId?.toString() || "";
    const service = serviceById.get(serviceId);
    const bookingDate =
      booking.bookingDate instanceof Date
        ? booking.bookingDate.toISOString()
        : String(booking.bookingDate || "");

    return {
      _id: booking._id.toString(),
      service: service ? { title: service.title || "" } : null,
      customerName: booking.customerName || "",
      technicianName:
        service?.technicianName || booking.technicianName || "",
      bookingDate,
      status: normalizeAdminBookingStatus(booking.status),
      paymentStatus: booking.paymentStatus || "unpaid",
      amount:
        booking.finalAmount ??
        booking.basePrice ??
        service?.basePrice ??
        null,
    };
  });
};

const getBookingOwnedByTechnician = async (bookingId, technicianId) => {
  if (!ObjectId.isValid(bookingId)) {
    return null;
  }

  const database = getDatabase();
  const booking = await database
    .collection("bookings")
    .findOne({ _id: new ObjectId(bookingId) });

  if (!booking) {
    return null;
  }

  const serviceId =
    booking.serviceId instanceof ObjectId
      ? booking.serviceId
      : typeof booking.serviceId === "string" &&
          ObjectId.isValid(booking.serviceId)
        ? new ObjectId(booking.serviceId)
        : null;

  if (!serviceId) {
    return null;
  }

  const service = await database.collection("services").findOne({
    _id: serviceId,
    technicianId,
  });

  return service ? booking : null;
};

const normalizeStatus = (status) => {
  const value = String(status || "")
    .toLowerCase()
    .replaceAll("_", "-");
  if (value === "pending") return "requested";
  if (value === "on-progress") return "in-progress";
  return value;
};

export const updateBookingStatusByTechnician = async (
  bookingId,
  technicianId,
  nextStatus,
) => {
  const booking = await getBookingOwnedByTechnician(bookingId, technicianId);
  if (!booking) {
    return { error: "booking-not-found" };
  }

  const allowedNextStatuses = {
    requested: ["accepted", "rejected"],
    accepted: ["in-progress"],
    "in-progress": ["completed"],
  };
  const currentStatus = normalizeStatus(booking.status);

  if (!allowedNextStatuses[currentStatus]?.includes(nextStatus)) {
    return { error: "invalid-transition" };
  }

  const result = await getDatabase()
    .collection("bookings")
    .updateOne(
      { _id: booking._id, status: booking.status },
      { $set: { status: nextStatus, updatedAt: new Date() } },
    );

  if (result.modifiedCount === 0) {
    return { error: "invalid-transition" };
  }

  return { bookingId: booking._id.toString(), status: nextStatus };
};

export const requestBookingPaymentByTechnician = async (
  bookingId,
  technicianId,
  finalAmount,
) => {
  const booking = await getBookingOwnedByTechnician(bookingId, technicianId);
  if (!booking) {
    return { error: "booking-not-found" };
  }

  if (normalizeStatus(booking.status) !== "completed") {
    return { error: "booking-not-completed" };
  }

  if (String(booking.paymentStatus || "").toLowerCase() === "paid") {
    return { error: "already-paid" };
  }
  if (booking.paymentRequested === true) {
    return { error: "already-requested" };
  }

  const paymentStatusFilter =
    booking.paymentStatus === undefined
      ? { paymentStatus: { $exists: false } }
      : { paymentStatus: booking.paymentStatus };
  const result = await getDatabase()
    .collection("bookings")
    .updateOne(
      {
        _id: booking._id,
        status: booking.status,
        paymentRequested: { $ne: true },
        ...paymentStatusFilter,
      },
      {
        $set: {
          finalAmount,
          paymentRequested: true,
          paymentRequestedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );

  if (result.modifiedCount === 0) {
    return { error: "already-requested" };
  }

  return {
    bookingId: booking._id.toString(),
    finalAmount,
    paymentStatus: booking.paymentStatus || "unpaid",
    paymentRequested: true,
  };
};

// Cancel Booking By ID
export const cancelBookingById = async (bookingId, customerId) => {
  return getDatabase()
    .collection("bookings")
    .updateOne(
      {
        _id: new ObjectId(bookingId),
        customerId,
        status: { $in: ["requested", "pending"] },
      },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
};

// Booking Add
export const addBooking = async (bookingData) => {
  const database = getDatabase();
  const serviceObjectId = new ObjectId(bookingData.serviceId);
  const service = await database.collection("services").findOne({
    _id: serviceObjectId,
  });

  if (!service) {
    return { error: "service-not-found" };
  }

  if (service.isActive === false || service.availability === "Not-Active") {
    return { error: "service-unavailable" };
  }

  const existingBooking = await findActiveBooking(
    bookingData.customerId,
    bookingData.serviceId,
  );

  if (existingBooking) {
    return { error: "active-booking" };
  }

  const booking = {
    serviceId: serviceObjectId,
    customerId: bookingData.customerId,
    customerName: bookingData.customerName,
    customerEmail: bookingData.customerEmail,
    phone: bookingData.phone,
    bookingDate: bookingData.bookingDate,
    address: bookingData.address,
    problemDescription: bookingData.problemDescription,
    status: "requested",
    paymentStatus: "unpaid",
    createdAt: new Date(),
  };

  const result = await database.collection("bookings").insertOne(booking);
  return {
    booking: {
      ...booking,
      _id: result.insertedId,
    },
  };
};

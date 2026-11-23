import { ObjectId } from "mongodb";
import {
  confirmStripeCheckout,
  createBookingCheckoutSession,
  getAdminPaymentTransactions,
  getCustomerPaymentHistory,
} from "../services/payment.service.js";

const checkoutErrors = {
  "booking-not-found": [404, "Booking not found"],
  "booking-not-completed": [409, "Only completed bookings can be paid"],
  "already-paid": [409, "This booking has already been paid"],
  "payment-not-requested": [
    409,
    "The technician has not requested payment for this booking",
  ],
  "service-not-found": [404, "The booked service could not be found"],
  "invalid-payment-amount": [409, "The booking has an invalid payment amount"],
  "checkout-in-progress": [
    409,
    "Payment is already being prepared. Please try again.",
  ],
  "checkout-lock-lost": [409, "Could not prepare this payment"],
  "payment-processing": [
    409,
    "This payment is still processing. Please try again.",
  ],
  "session-cannot-be-reused": [
    409,
    "The existing payment session could not be reused",
  ],
  "missing-checkout-url": [502, "Stripe did not return a checkout URL"],
};

export const createBookingCheckoutSessionController = async (req, res) => {
  const { bookingId } = req.body || {};
  if (
    typeof bookingId !== "string" ||
    !/^[a-f\d]{24}$/i.test(bookingId) ||
    !ObjectId.isValid(bookingId)
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid booking is required",
    });
  }

  try {
    const result = await createBookingCheckoutSession(bookingId, req.user);
    if (result.error) {
      const [status, message] = checkoutErrors[result.error];
      return res.status(status).json({ success: false, message });
    }
    return res.json({ success: true, data: { url: result.url } });
  } catch (error) {
    console.error("Failed to create Stripe checkout session:", error);
    if (error?.code === "amount_too_small") {
      return res.status(409).json({
        success: false,
        message:
          "This booking amount is below the minimum card payment amount. Please pay the technician directly or contact support.",
      });
    }
    if (
      error?.type === "StripeAuthenticationError" ||
      error?.type === "StripePermissionError"
    ) {
      return res.status(503).json({
        success: false,
        message:
          "Online payment is temporarily unavailable. Please try again later.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Unable to start payment. Please try again.",
    });
  }
};

export const confirmStripeCheckoutController = async (req, res) => {
  const { sessionId } = req.body || {};
  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return res.status(400).json({
      success: false,
      message: "A valid checkout session is required",
    });
  }

  try {
    const data = await confirmStripeCheckout(sessionId, req.user.id);
    return res.json({
      success: true,
      message: "Payment confirmed successfully",
      data,
    });
  } catch (error) {
    console.error("Failed to confirm Stripe checkout:", error);
    return res.status(409).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Stripe could not verify this completed payment",
    });
  }
};

export const getCustomerPaymentHistoryController = async (req, res) => {
  try {
    const data = await getCustomerPaymentHistory(req.user.id);
    return res.json({
      success: true,
      message: "Payment history fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Failed to fetch customer payment history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
    });
  }
};

export const getAdminPaymentTransactionsController = async (_req, res) => {
  try {
    const data = await getAdminPaymentTransactions();
    return res.json({
      success: true,
      message: "Payment transactions fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Failed to fetch admin payment transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment transactions",
    });
  }
};

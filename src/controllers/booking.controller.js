import { ObjectId } from "mongodb";
import {
  addBooking,
  cancelBookingById,
  collectBookingPaymentByTechnician,
  findActiveBooking,
  getBookingsByCustomerId,
  getBookingsByTechnicianId,
  updateBookingStatusByTechnician,
} from "../services/booking.service.js";

// Booking Create
export const createBooking = async (req, res) => {
  try {
    const { serviceId, preferredDate, phone, address, problemDescription } =
      req.body || {};
    const bookingDate = new Date(`${preferredDate}T00:00:00.000Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (
      typeof serviceId !== "string" ||
      !/^[a-f\d]{24}$/i.test(serviceId) ||
      typeof preferredDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) ||
      Number.isNaN(bookingDate.getTime()) ||
      bookingDate.toISOString().slice(0, 10) !== preferredDate ||
      bookingDate < today ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof address !== "string" ||
      !address.trim() ||
      typeof problemDescription !== "string" ||
      problemDescription.trim().length < 20 ||
      problemDescription.trim().length > 400
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid booking details",
      });
    }

    const result = await addBooking({
      serviceId,
      customerId: req.user.id,
      customerName: req.user.name,
      customerEmail: req.user.email,
      bookingDate,
      phone: phone.trim(),
      address: address.trim(),
      problemDescription: problemDescription.trim(),
    });

    if (result.error === "service-not-found") {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    if (result.error === "service-unavailable") {
      return res.status(409).json({
        success: false,
        message: "This service is currently unavailable",
      });
    }

    if (result.error === "active-booking") {
      return res.status(409).json({
        success: false,
        message: "You already have an active request for this service",
      });
    }

    res.status(201).json({
      success: true,
      message: "Repair request submitted successfully",
      data: result.booking,
    });
  } catch (error) {
    console.error("Create Booking Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit repair request",
    });
  }
};

// Booking Status
export const getBookingStatus = async (req, res) => {
  try {
    const { serviceId } = req.query;

    if (
      typeof serviceId !== "string" ||
      !/^[a-f\d]{24}$/i.test(serviceId) ||
      !ObjectId.isValid(serviceId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid service ID is required",
      });
    }

    const booking = await findActiveBooking(req.user.id, serviceId);

    return res.json({
      success: true,
      hasActiveBooking: Boolean(booking),
    });
  } catch (error) {
    console.error("Check Booking Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check booking status",
    });
  }
};

// Customer Bookings
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await getBookingsByCustomerId(req.user.id);

    return res.json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    console.error("Get Customer Bookings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
};

// Technician Requests
export const getTechnicianRequests = async (req, res) => {
  try {
    const bookings = await getBookingsByTechnicianId(req.user.id);

    return res.json({
      success: true,
      message: "Technician requests fetched successfully",
      data: bookings,
    });
  } catch (error) {
    console.error("Get Technician Requests Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch technician requests",
    });
  }
};

// Technician Booking Status
export const updateTechnicianBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const validStatuses = ["accepted", "rejected", "in-progress", "completed"];

    if (!/^[a-f\d]{24}$/i.test(id) || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "A valid booking ID and status are required",
      });
    }

    const result = await updateBookingStatusByTechnician(
      id,
      req.user.id,
      status,
    );

    if (result.error === "booking-not-found") {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (result.error === "invalid-transition") {
      return res.status(409).json({
        success: false,
        message: "This booking can no longer be moved to that status",
      });
    }

    return res.json({
      success: true,
      message: "Booking status updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Update Technician Booking Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update booking status",
    });
  }
};

// Technician Payment Collection
export const collectTechnicianBookingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalAmount } = req.body || {};

    if (
      !/^[a-f\d]{24}$/i.test(id) ||
      typeof finalAmount !== "number" ||
      !Number.isFinite(finalAmount) ||
      finalAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid booking ID and final amount are required",
      });
    }

    const result = await collectBookingPaymentByTechnician(
      id,
      req.user.id,
      finalAmount,
    );

    if (result.error === "booking-not-found") {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (result.error === "booking-not-completed") {
      return res.status(409).json({
        success: false,
        message: "Payment can only be collected for completed bookings",
      });
    }

    if (result.error === "already-paid") {
      return res.status(409).json({
        success: false,
        message: "Payment has already been recorded",
      });
    }

    return res.json({
      success: true,
      message: "Payment recorded successfully",
      data: result,
    });
  } catch (error) {
    console.error("Collect Technician Booking Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record payment",
    });
  }
};

// Cancel Customer Booking
export const cancelMyBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-f\d]{24}$/i.test(id) || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid booking ID is required",
      });
    }

    const result = await cancelBookingById(id, req.user.id);

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or can no longer be cancelled",
      });
    }

    return res.json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Delete Booking Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete booking",
    });
  }
};

import { ObjectId } from "mongodb";
import {
  addBooking,
  deleteBookingById,
  findActiveBooking,
  getBookingsByCustomerId,
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

// Delete Customer Booking
export const deleteMyBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-f\d]{24}$/i.test(id) || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid booking ID is required",
      });
    }

    const result = await deleteBookingById(id, req.user.id);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Delete Booking Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete booking",
    });
  }
};

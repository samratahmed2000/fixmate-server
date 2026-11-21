import { ObjectId } from "mongodb";
import {
  addBooking,
  findActiveBooking,
} from "../services/booking.service.js";

export const createBooking = async (req, res) => {
  try {
    const {
      serviceId,
      preferredDate,
      phone,
      address,
      problemDescription,
    } = req.body || {};
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
import express from "express";
import {
  createBooking,
  cancelMyBooking,
  collectTechnicianBookingPayment,
  getTechnicianRequests,
  getMyBookings,
  getBookingStatus,
  updateTechnicianBookingStatus,
} from "../controllers/booking.controller.js";
import { requireCustomer } from "../middleware/requireCustomer.js";
import { requireTechnician } from "../middleware/requireTechnician.js";

const router = express.Router();

router.get("/technician", requireTechnician, getTechnicianRequests);
router.patch(
  "/:id/status",
  requireTechnician,
  updateTechnicianBookingStatus,
);
router.patch(
  "/:id/payment",
  requireTechnician,
  collectTechnicianBookingPayment,
);
router.get("/my", requireCustomer, getMyBookings);
router.get("/", requireCustomer, getBookingStatus);
router.post("/", requireCustomer, createBooking);
router.delete("/:id", requireCustomer, cancelMyBooking);

export default router;
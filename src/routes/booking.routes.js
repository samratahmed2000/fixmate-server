import express from "express";
import {
  createBooking,
  getAllBookingsForAdminController,
  cancelMyBooking,
  collectTechnicianBookingPayment,
  getTechnicianRequests,
  getMyBookings,
  getBookingStatus,
  updateTechnicianBookingStatus,
} from "../controllers/booking.controller.js";
import { requireCustomer } from "../middleware/requireCustomer.js";
import { requireTechnician } from "../middleware/requireTechnician.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

router.get("/admin", requireAdmin, getAllBookingsForAdminController);
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
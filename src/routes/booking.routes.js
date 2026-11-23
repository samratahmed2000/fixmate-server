import express from "express";
import {
  createBooking,
  getAllBookingsForAdminController,
  cancelMyBooking,
  requestTechnicianBookingPayment,
  getTechnicianRequests,
  getMyBookings,
  getBookingStatus,
  updateTechnicianBookingStatus,
} from "../controllers/booking.controller.js";
import {
  verifyAdmin,
  verifyCustomer,
  verifyTechnician,
} from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/admin", verifyAdmin, getAllBookingsForAdminController);
router.get("/technician", verifyTechnician, getTechnicianRequests);
router.patch(
  "/:id/status",
  verifyTechnician,
  updateTechnicianBookingStatus,
);
router.patch(
  "/:id/payment",
  verifyTechnician,
  requestTechnicianBookingPayment,
);
router.get("/my", verifyCustomer, getMyBookings);
router.get("/", verifyCustomer, getBookingStatus);
router.post("/", verifyCustomer, createBooking);
router.delete("/:id", verifyCustomer, cancelMyBooking);

export default router;
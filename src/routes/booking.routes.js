import express from "express";
import {
  createBooking,
  deleteMyBooking,
  getMyBookings,
  getBookingStatus,
} from "../controllers/booking.controller.js";
import { requireCustomer } from "../middleware/requireCustomer.js";

const router = express.Router();

router.get("/my", requireCustomer, getMyBookings);
router.get("/", requireCustomer, getBookingStatus);
router.post("/", requireCustomer, createBooking);
router.delete("/:id", requireCustomer, deleteMyBooking);

export default router;
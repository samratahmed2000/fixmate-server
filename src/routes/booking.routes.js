import express from "express";
import {
  createBooking,
  getBookingStatus,
} from "../controllers/booking.controller.js";
import { requireCustomer } from "../middleware/requireCustomer.js";

const router = express.Router();

router.get("/", requireCustomer, getBookingStatus);
router.post("/", requireCustomer, createBooking);

export default router;
import express from "express";
import {
  confirmStripeCheckoutController,
  createBookingCheckoutSessionController,
  getAdminPaymentTransactionsController,
  getCustomerPaymentHistoryController,
} from "../controllers/payment.controller.js";
import {
  verifyAdmin,
  verifyCustomer,
} from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyCustomer, getCustomerPaymentHistoryController);
router.get("/admin", verifyAdmin, getAdminPaymentTransactionsController);
router.post(
  "/checkout-session",
  verifyCustomer,
  createBookingCheckoutSessionController,
);
router.post("/confirm", verifyCustomer, confirmStripeCheckoutController);

export default router;

import express from "express";
import {
  getTechnicianApplicationController,
  submitTechnicianApplicationController,
} from "../controllers/technician-application.controller.js";
import { verifyCustomer } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyCustomer, getTechnicianApplicationController);
router.post("/", verifyCustomer, submitTechnicianApplicationController);

export default router;

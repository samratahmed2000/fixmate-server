import express from "express";
import {
  getDashboardHistoryController,
  getDashboardOverviewController,
} from "../controllers/dashboard.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/overview", verifyToken, getDashboardOverviewController);
router.get("/history", verifyToken, getDashboardHistoryController);

export default router;

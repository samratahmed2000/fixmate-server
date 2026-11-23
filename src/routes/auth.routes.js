import express from "express";
import {
  clearAuthTokenController,
  completeAuthController,
  createAuthTokenController,
  getAuthSessionController,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/session", getAuthSessionController);
router.get("/complete", completeAuthController);
router.post("/token", createAuthTokenController);
router.delete("/token", clearAuthTokenController);

export default router;

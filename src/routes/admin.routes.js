import express from "express";
import {
  approveTechnicianApplicationController,
  getAdminServicesController,
  getAdminUsersController,
  updateAdminServiceController,
} from "../controllers/admin.controller.js";
import { verifyAdmin } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/services", verifyAdmin, getAdminServicesController);
router.patch("/services", verifyAdmin, updateAdminServiceController);
router.get("/users", verifyAdmin, getAdminUsersController);
router.patch("/users", verifyAdmin, approveTechnicianApplicationController);

export default router;

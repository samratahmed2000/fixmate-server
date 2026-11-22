import express from "express";
import {
  createService,
  getServices,
  getServiceDetail,
  getFeaturedServices,
  updateService,
  deleteService,
  toggleServiceStatus,
  updateServiceApproval,
} from "../controllers/service.controller.js";
import { requireTechnician } from "../middleware/requireTechnician.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

router.post("/", requireTechnician, createService);
router.get("/", getServices);
router.get("/featured", getFeaturedServices);
router.get("/:id", getServiceDetail);
router.put("/:id", requireTechnician, updateService);
router.patch("/:id/toggle", requireTechnician, toggleServiceStatus);
router.patch("/:id/approval", requireAdmin, updateServiceApproval);
router.patch("/:id", requireTechnician, updateService);
router.delete("/:id", requireTechnician, deleteService);

export default router;

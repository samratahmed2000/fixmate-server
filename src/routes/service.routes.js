import express from "express";
import {
  createService,
  getServices,
  getServiceDetail,
  getFeaturedServices,
  updateService,
  deleteService,
  toggleServiceStatus,
} from "../controllers/service.controller.js";
import { requireTechnician } from "../middleware/requireTechnician.js";

const router = express.Router();

router.post("/", requireTechnician, createService);
router.get("/", getServices);
router.get("/featured", getFeaturedServices);
router.get("/:id", getServiceDetail);
router.put("/:id", requireTechnician, updateService);
router.patch("/:id/toggle", requireTechnician, toggleServiceStatus);
router.patch("/:id", requireTechnician, updateService);
router.delete("/:id", requireTechnician, deleteService);

export default router;

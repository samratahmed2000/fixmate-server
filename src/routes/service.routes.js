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
import {
  verifyAdmin,
  verifyTechnician,
} from "../middleware/verifyToken.js";

const router = express.Router();

const verifyTechnicianForPendingServices = (req, res, next) =>
  req.query.includePending === "true"
    ? verifyTechnician(req, res, next)
    : next();

router.post("/", verifyTechnician, createService);
router.get("/", verifyTechnicianForPendingServices, getServices);
router.get("/featured", getFeaturedServices);
router.get("/:id", getServiceDetail);
router.put("/:id", verifyTechnician, updateService);
router.patch("/:id/toggle", verifyTechnician, toggleServiceStatus);
router.patch("/:id/approval", verifyAdmin, updateServiceApproval);
router.patch("/:id", verifyTechnician, updateService);
router.delete("/:id", verifyTechnician, deleteService);

export default router;

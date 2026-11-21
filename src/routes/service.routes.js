import express from "express";
import {
  createService,
  getServices,
  getServiceDetail,
  updateService,
  deleteService,
} from "../controllers/service.controller.js";

const router = express.Router();

router.post("/", createService);
router.get("/", getServices);
router.get("/:id", getServiceDetail);
router.put("/:id", updateService);
router.patch("/:id", updateService);
router.delete("/:id", deleteService);

export default router;

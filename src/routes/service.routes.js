import express from "express";
import {
  createService,
  getServices,
  getServiceDetail,
} from "../controllers/service.controller.js";

const router = express.Router();

router.post("/", createService);
router.get("/", getServices);
router.get("/:id", getServiceDetail);

export default router;

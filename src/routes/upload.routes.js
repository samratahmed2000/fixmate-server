import express from "express";
import { upload } from "../middleware/upload.js";
import { uploadSingleImage } from "../controllers/upload.controller.js";

const router = express.Router();

router.post("/", upload.single("image"), uploadSingleImage);

export default router;

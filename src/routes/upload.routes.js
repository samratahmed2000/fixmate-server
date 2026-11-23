import express from "express";
import { MAX_IMAGE_BYTES, upload } from "../middleware/upload.js";
import { uploadSingleImage } from "../controllers/upload.controller.js";
import { verifyTechnician } from "../middleware/verifyToken.js";

const router = express.Router();

const handleImageUpload = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? `Image must be ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB or smaller`
        : error.message || "Invalid image upload";

    res.status(400).json({ success: false, message });
  });
};

router.post("/", verifyTechnician, handleImageUpload, uploadSingleImage);

export default router;

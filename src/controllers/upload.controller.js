import { uploadImageToImgBB } from "../services/upload.service.js";

export const uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No Image Found!",
      });
    }

    const imageUrl = await uploadImageToImgBB(req.file.buffer);

    res.status(200).json({
      success: true,
      message: "Successfully Image Uploaded!",
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error("Upload Controller Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to Upload Image on Server!",
    });
  }
};

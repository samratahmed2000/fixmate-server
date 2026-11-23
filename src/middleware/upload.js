import multer from "multer";

const storage = multer.memoryStorage();

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("Use a PNG, JPG or WebP image"));
  },
});

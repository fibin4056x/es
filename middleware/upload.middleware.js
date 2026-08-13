import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const allowedMimes = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === "application/pdf";
    const sanitizedOriginalName = file.originalname.replace(/\.[^/.]+$/, "");
    
    return {
      folder: "slms-documents",
      resource_type: isPdf ? "raw" : "image",
      public_id: `${Date.now()}-${sanitizedOriginalName}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(
      new Error("Only PDF, JPG, JPEG, and PNG files are allowed."),
      false
    );
  }

  cb(null, true);
};

export default multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
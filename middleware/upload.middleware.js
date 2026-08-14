import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const allowedMimes = [
  "application/pdf",
  "application/x-pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/x-pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");
    const sanitizedOriginalName = file.originalname
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    
    const extension = isPdf ? ".pdf" : "";
    return {
      folder: "slms-documents",
      resource_type: isPdf ? "raw" : "image",
      public_id: `${Date.now()}-${sanitizedOriginalName}${extension}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const isPdfByExtension = file.originalname && file.originalname.toLowerCase().endsWith(".pdf");
  if (!allowedMimes.includes(file.mimetype) && !isPdfByExtension) {
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
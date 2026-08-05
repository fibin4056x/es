import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "attendance-pdfs",
    resource_type: "image",
    format: "pdf",
    public_id: `${Date.now()}-${file.originalname.replace(".pdf", "")}`,
  }),
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF files are allowed."), false);
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
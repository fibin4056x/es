import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

/* =========================================
   CLOUDINARY STORAGE
========================================= */

const storage = new CloudinaryStorage({
  cloudinary,

  params: (req, file) => {
    const fileName = file.originalname
      .split(".")[0]
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "");

    return {
      folder: "attendance-pdfs",

      resource_type: "raw",

      format: "pdf",

      public_id: `${Date.now()}-${fileName}`,
    };
  },
});

/* =========================================
   FILE FILTER
========================================= */

const fileFilter = (req, file, cb) => {
  const isPdf =
    file.mimetype === "application/pdf" &&
    file.originalname
      .toLowerCase()
      .endsWith(".pdf");

  if (!isPdf) {
    return cb(
      new Error(
        "Only PDF files are allowed."
      ),
      false
    );
  }

  cb(null, true);
};

/* =========================================
   MULTER CONFIGURATION
========================================= */

const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 10,
  },
});

export default upload;
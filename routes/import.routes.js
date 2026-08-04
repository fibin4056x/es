import express from "express";
import multer from "multer";
import {
  importStudentsController,
  downloadImportTemplateController,
} from "../controllers/import.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

/* =========================================
   MULTER IN-MEMORY FILE UPLOAD CONFIG
========================================= */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const isAllowedExt = file.originalname.match(/\.(csv|xlsx|xls)$/i);
    if (isAllowedExt) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel (.xlsx, .xls) files are allowed"), false);
    }
  },
});

/* =========================================
   1. DOWNLOAD IMPORT TEMPLATE
   GET /api/import/students/template
========================================= */
router.get(
  "/students/template",
  authenticate,
  authorize("principal", "teacher"),
  downloadImportTemplateController
);

/* =========================================
   2. IMPORT STUDENTS (FILE UPLOAD)
   POST /api/import/students
========================================= */
router.post(
  "/students",
  authenticate,
  authorize("principal"),
  upload.single("file"),
  importStudentsController
);

export default router;

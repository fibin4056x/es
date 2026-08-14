import express from "express";
import upload from "../middleware/upload.middleware.js";

import {
  markAttendanceController,
  getAttendanceByDateController,
  getDivisionAttendanceController,
  getAttendanceCalendarController,
  uploadAttendanceFileController,
  updateAttendanceController,
  replaceAttendanceDocumentController,
  deleteAttendanceDocumentController,
  deleteAttendanceController,
} from "../controllers/attendance.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  authorize,
} from "../middleware/role.middleware.js";

import {
  validateAttendance,
} from "../middleware/validateAttendance.middleware.js";

const router = express.Router();

/* =========================================
   MARK ATTENDANCE
========================================= */

router.post(
  "/",
  authenticate,
  authorize(
    "principal",
    "teacher"
  ),
  validateAttendance,
  markAttendanceController
);

/* =========================================
   GET ATTENDANCE CALENDAR
========================================= */

router.get(
  "/calendar/:divisionId",
  authenticate,
  authorize(
    "principal",
    "teacher"
  ),
  getAttendanceCalendarController
);

/* =========================================
   GET ATTENDANCE BY DATE
========================================= */

router.get(
  "/division/:divisionId",
  authenticate,
  authorize(
    "principal",
    "teacher"
  ),
  getAttendanceByDateController
);

/* =========================================
   GET DIVISION ATTENDANCE HISTORY
========================================= */

router.get(
  "/history/:divisionId",
  authenticate,
  authorize(
    "principal",
    "teacher"
  ),
  getDivisionAttendanceController
);

/* =========================================
   UPDATE ATTENDANCE
========================================= */

router.patch(
  "/:id",
  authenticate,
  authorize(
    "principal",
    "teacher"
  ),
  upload.any(),
  updateAttendanceController
);

/* =========================================
   UPLOAD ATTENDANCE DOCUMENTS
========================================= */

router.patch(
  "/:id/document",
  authenticate,
  authorize(
    "principal",
    "teacher"
  ),
  upload.any(),
  uploadAttendanceFileController
);

/* =========================================
   REPLACE ATTENDANCE DOCUMENT
========================================= */

router.patch(
  "/:attendanceId/document/:documentId",
  authenticate,
  authorize(
    "principal",
    "teacher"
  ),
  upload.any(),
  replaceAttendanceDocumentController
);

/* =========================================
   DELETE ATTENDANCE DOCUMENT
========================================= */

router.delete(
  "/:attendanceId/document/:documentId",
  authenticate,
  authorize(
    "principal",
    "teacher"
  ),
  deleteAttendanceDocumentController
);

/* =========================================
   DELETE ATTENDANCE
========================================= */

router.delete(
  "/:id",
  authenticate,
  authorize(
    "principal",
    "teacher"
  ),
  deleteAttendanceController
);

export default router;
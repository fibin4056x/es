import express from "express";
import upload from "../middleware/upload.middleware.js";
import {
  getDailyAttendanceReportController,
  getMonthlyAttendanceReportController,
  getDivisionAttendanceReportController,
  getClassAttendanceReportController,
  getSchoolAttendanceReportController,
  getStudentAttendanceHistoryController,
  createReportController,
  getInboxReportsController,
  getSentReportsController,
  getReportByIdController,
  markReportReadController,
  deleteReportController,
} from "../controllers/reports.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authenticate);

/* =========================================
   EXISTING ATTENDANCE REPORTS
========================================= */

router.get(
  "/attendance/daily",
  authorize("principal", "teacher"),
  getDailyAttendanceReportController
);

router.get(
  "/attendance/monthly",
  authorize("principal", "teacher"),
  getMonthlyAttendanceReportController
);

router.get(
  "/attendance/school",
  authorize("principal"),
  getSchoolAttendanceReportController
);

router.get(
  "/attendance/class/:classId",
  authorize("principal", "teacher"),
  getClassAttendanceReportController
);

router.get(
  "/attendance/division/:divisionId",
  authorize("principal", "teacher"),
  getDivisionAttendanceReportController
);

router.get(
  "/attendance/student/:studentId",
  authorize("principal", "teacher"),
  getStudentAttendanceHistoryController
);

/* =========================================
   INDIVIDUAL COMMUNICATION REPORTS
========================================= */

// Fixed paths first
router.get(
  "/inbox",
  authorize("principal", "teacher"),
  getInboxReportsController
);

router.get(
  "/sent",
  authorize("principal", "teacher"),
  getSentReportsController
);

router.post(
  "/",
  authorize("principal", "teacher"),
  upload.array("attachments", 10),
  createReportController
);

// Member paths after
router.get(
  "/:id",
  authorize("principal", "teacher"),
  getReportByIdController
);

router.patch(
  "/:id/read",
  authorize("principal", "teacher"),
  markReportReadController
);

router.delete(
  "/:id",
  authorize("principal", "teacher"),
  deleteReportController
);

export default router;

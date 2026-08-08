import express from "express";
import {
  getDailyAttendanceReportController,
  getMonthlyAttendanceReportController,
  getDivisionAttendanceReportController,
  getClassAttendanceReportController,
  getSchoolAttendanceReportController,
  getStudentAttendanceHistoryController,
} from "../controllers/reports.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

/* =========================================
   1. DAILY ATTENDANCE REPORT (PRINCIPAL ONLY)
   GET /api/reports/attendance/daily
========================================= */
router.get(
  "/attendance/daily",
  authenticate,
  authorize("principal"),
  getDailyAttendanceReportController
);

/* =========================================
   2. MONTHLY ATTENDANCE REPORT (PRINCIPAL ONLY)
   GET /api/reports/attendance/monthly
========================================= */
router.get(
  "/attendance/monthly",
  authenticate,
  authorize("principal"),
  getMonthlyAttendanceReportController
);

/* =========================================
   3. SCHOOL ATTENDANCE REPORT (PRINCIPAL ONLY)
   GET /api/reports/attendance/school
========================================= */
router.get(
  "/attendance/school",
  authenticate,
  authorize("principal"),
  getSchoolAttendanceReportController
);

/* =========================================
   4. CLASS ATTENDANCE REPORT (PRINCIPAL ONLY)
   GET /api/reports/attendance/class/:classId
========================================= */
router.get(
  "/attendance/class/:classId",
  authenticate,
  authorize("principal"),
  getClassAttendanceReportController
);

/* =========================================
   5. DIVISION ATTENDANCE REPORT (PRINCIPAL & TEACHER)
   GET /api/reports/attendance/division/:divisionId
========================================= */
router.get(
  "/attendance/division/:divisionId",
  authenticate,
  authorize("principal", "teacher"),
  getDivisionAttendanceReportController
);

/* =========================================
   6. STUDENT ATTENDANCE HISTORY REPORT (PRINCIPAL & TEACHER)
   GET /api/reports/attendance/student/:studentId
========================================= */
router.get(
  "/attendance/student/:studentId",
  authenticate,
  authorize("principal", "teacher"),
  getStudentAttendanceHistoryController
);

export default router;

import express from "express";

import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import teacherRoutes from "./teacher.routes.js";
import classRoutes from "./class.routes.js";
import studentRoutes from "./student.routes.js";
import divisionRoutes from "./division.routes.js";
import attendanceRoutes from "./attendance.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import exportRoutes from "./export.routes.js";
import importRoutes from "./import.routes.js";
import reportsRoutes from "./reports.routes.js";
import academicCalendarRoutes from "./academicCalendar.routes.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/
router.use("/auth", authRoutes);

/*
|--------------------------------------------------------------------------
| USER MANAGEMENT
|--------------------------------------------------------------------------
*/
router.use("/users", userRoutes);

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/
router.use("/dashboard", dashboardRoutes);

/*
|--------------------------------------------------------------------------
| TEACHERS
|--------------------------------------------------------------------------
*/
router.use("/teachers", teacherRoutes);

/*
|--------------------------------------------------------------------------
| STUDENTS
|--------------------------------------------------------------------------
*/
router.use("/students", studentRoutes);

/*
|--------------------------------------------------------------------------
| CLASSES
|--------------------------------------------------------------------------
*/
router.use("/classes", classRoutes);

/*
|--------------------------------------------------------------------------
| DIVISIONS
|--------------------------------------------------------------------------
*/
router.use("/divisions", divisionRoutes);

/*
|--------------------------------------------------------------------------
| ATTENDANCE
|--------------------------------------------------------------------------
*/
router.use("/attendance", attendanceRoutes);

/*
|--------------------------------------------------------------------------
| REPORTS
|--------------------------------------------------------------------------
*/
router.use("/reports", reportsRoutes);

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/
router.use("/export", exportRoutes);

/*
|--------------------------------------------------------------------------
| IMPORT
|--------------------------------------------------------------------------
*/
router.use("/import", importRoutes);

/*
|--------------------------------------------------------------------------
| ACADEMIC CALENDAR
|--------------------------------------------------------------------------
*/
router.use(
  "/academic-calendar",
  academicCalendarRoutes
);

export default router;
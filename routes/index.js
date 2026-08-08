import express from "express";
import authRoutes from "./auth.routes.js";
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

router.use("/auth", authRoutes);
router.use("/teachers", teacherRoutes);
router.use("/classes", classRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/students", studentRoutes);
router.use("/divisions", divisionRoutes);
router.use("/export", exportRoutes);
router.use("/import", importRoutes);
router.use("/reports", reportsRoutes);
router.use("/academic-calendar", academicCalendarRoutes);

export default router;



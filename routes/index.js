import express from "express";
import authRoutes from "./auth.routes.js";
import teacherRoutes from "./teacher.routes.js";
import classRoutes from "./class.routes.js";
import studentRoutes from "./student.routes.js";
import divisionRoutes from "./division.routes.js";
import attendanceRoutes from "./attendance.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/teachers", teacherRoutes);
router.use("/classes", classRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/students", studentRoutes);
router.use("/divisions", divisionRoutes);

export default router;

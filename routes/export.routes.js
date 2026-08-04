import express from "express";
import {
  exportAllStudentsController,
  exportStudentsByClassController,
  exportStudentsByDivisionController,
  exportStudentsByTeacherController,
} from "../controllers/export.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

/* =========================================
   1. EXPORT ALL STUDENTS
   GET /api/export/students
========================================= */
router.get(
  "/students",
  authenticate,
  authorize("principal", "teacher"),
  exportAllStudentsController
);

/* =========================================
   2. EXPORT STUDENTS BY CLASS
   GET /api/export/students/class/:classId
========================================= */
router.get(
  "/students/class/:classId",
  authenticate,
  authorize("principal", "teacher"),
  exportStudentsByClassController
);

/* =========================================
   3. EXPORT STUDENTS BY DIVISION
   GET /api/export/students/division/:divisionId
========================================= */
router.get(
  "/students/division/:divisionId",
  authenticate,
  authorize("principal", "teacher"),
  exportStudentsByDivisionController
);

/* =========================================
   4. EXPORT STUDENTS BY TEACHER
   GET /api/export/students/teacher/:teacherId
========================================= */
router.get(
  "/students/teacher/:teacherId",
  authenticate,
  authorize("principal", "teacher"),
  exportStudentsByTeacherController
);

export default router;

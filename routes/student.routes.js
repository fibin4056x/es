import express from "express";

import {
  createStudentController,
  getAllStudentsController,
  getStudentByIdController,
  updateStudentController,
  deleteStudentController,
  getStudentsByDivisionController,
  getStudentsByTeacherController,
} from "../controllers/student.controller.js";
import {
  validateCreateStudent,
} from "../middleware/validateStudent.middleware.js";
import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  authorize,
} from "../middleware/role.middleware.js";

const router = express.Router();

/* =========================================
   CREATE STUDENT
========================================= */

router.post(
  "/",
  authenticate,
  authorize("principal"),
  validateCreateStudent,
  createStudentController
);
/* =========================================
   GET ALL STUDENTS
========================================= */

router.get(
  "/",

  authenticate,

  authorize("principal"),

  getAllStudentsController
);

/* =========================================
   GET STUDENTS BY DIVISION
========================================= */

router.get(
  "/division/:divisionId",

  authenticate,

  authorize("teacher", "principal"),

  getStudentsByDivisionController
);

/* =========================================
   GET STUDENT BY ID
========================================= */

router.get(
  "/:id",

  authenticate,

  authorize("principal", "teacher"),

  getStudentByIdController
);

/* =========================================
   UPDATE STUDENT
========================================= */

router.patch(
  "/:id",

  authenticate,

  authorize("principal", "teacher"),

  updateStudentController
);


router.get(
  "/teacher/students",
  authenticate,
  authorize("teacher"),
  getStudentsByTeacherController
);
/* =========================================
   DELETE STUDENT
========================================= */

router.delete(
  "/:id",

  authenticate,

  authorize("principal"),

  deleteStudentController
);

export default router;
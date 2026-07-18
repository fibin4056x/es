import express from "express";

import {
  markAttendanceController,
  getAttendanceByDateController,
  getDivisionAttendanceController,
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

const router =
  express.Router();

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
   GET DIVISION HISTORY
========================================= */

router.get(
  "/history/:divisionId",

  authenticate,

  authorize(

    "teacher"
  ),

  getDivisionAttendanceController
);

export default router;
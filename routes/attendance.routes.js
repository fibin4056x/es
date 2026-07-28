import express from "express";
import upload from "../middleware/upload.middleware.js";

import {
  markAttendanceController,
  getAttendanceByDateController,
  getDivisionAttendanceController,
  uploadAttendanceFileController
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
  upload.any(),
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


// file upload route
router.patch(
  "/:id/document",
  authenticate,
  authorize(
    "principal",
    "teacher" 
  ),
  upload.array("document", 10),
  uploadAttendanceFileController
)

export default router;

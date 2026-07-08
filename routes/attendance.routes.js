import express from "express";

import {
  markAttendance,
  getDivisionAttendance,
} from "../controllers/attendance.controller.js";

const router = express.Router();

router.post(
  "/mark",
  markAttendance
);

router.get(
  "/division/:divisionId",
  getDivisionAttendance
);

export default router;
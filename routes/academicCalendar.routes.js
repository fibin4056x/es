import express from "express";
import { authenticate } from "../middleware/auth.js"; // adjust path to your auth middleware
// import { authorize } from "../middleware/roleCheck.js"; // uncomment if you want to restrict writes to certain roles

import {
  createAcademicCalendarController,
  getAcademicCalendarController,
  getAcademicCalendarByIdController,
  updateAcademicCalendarController,
  deleteAcademicCalendarController,
  getCalendarMonthController,
  getWorkingDaysController,
  getUpcomingEventsController,
} from "../controllers/academicCalendar.controller.js"; // adjust path to wherever the controller file lives

const router = express.Router();

router.use(authenticate);

/* =========================================
   IMPORTANT: fixed-path routes (/month, /working-days, /upcoming)
   must be declared before the "/:id" route below, otherwise Express
   will try to match them as an :id param and 400/404 on invalid ObjectId.
========================================= */

router.get("/month", getCalendarMonthController);
router.get("/working-days", getWorkingDaysController);
router.get("/upcoming", getUpcomingEventsController);

router.post("/", /* authorize("PRINCIPAL", "ADMIN"), */ createAcademicCalendarController);
router.get("/", getAcademicCalendarController);

router.get("/:id", getAcademicCalendarByIdController);
router.patch("/:id", /* authorize("PRINCIPAL", "ADMIN"), */ updateAcademicCalendarController);
router.delete("/:id", /* authorize("PRINCIPAL", "ADMIN"), */ deleteAcademicCalendarController);

export default router;
import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

import {
  createAcademicCalendarController,
  getAcademicCalendarController,
  getAcademicCalendarByIdController,
  updateAcademicCalendarController,
  deleteAcademicCalendarController,
  restoreAcademicCalendarController,
  getAcademicReportsController,
  getCalendarMonthController,
  getWorkingDaysController,
  getUpcomingEventsController,
} from "../controllers/academicCalendar.controller.js";

const router = express.Router();

router.use(authenticate);

/* =========================================
   FIXED-PATH ROUTES (must precede /:id)
========================================= */

router.get("/reports", authorize("principal", "teacher"), getAcademicReportsController);
router.get("/month", getCalendarMonthController);
router.get("/working-days", getWorkingDaysController);
router.get("/upcoming", getUpcomingEventsController);

/* =========================================
   COLLECTION ROUTES
========================================= */

router.post("/", authorize("principal"), createAcademicCalendarController);
router.get("/", getAcademicCalendarController);

/* =========================================
   MEMBER ROUTES
========================================= */

router.get("/:id", getAcademicCalendarByIdController);
router.patch("/:id/restore", authorize("principal"), restoreAcademicCalendarController);
router.patch("/:id", authorize("principal"), updateAcademicCalendarController);
router.delete("/:id", authorize("principal"), deleteAcademicCalendarController);

export default router;
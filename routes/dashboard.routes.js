import express from "express";

import {
  getDashboardStats,
  getDashboardReports,
  getDashboardPreviewStats,
} from "../controllers/dashboard.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/

// Main dashboard
router.get(
  "/stats",
  authenticate,
  authorize("principal", "teacher"),
  getDashboardStats
);

// Dashboard reports
router.get(
  "/reports",
  authenticate,
  authorize("principal", "teacher"),
  getDashboardReports
);

// Public dashboard preview used by login/landing UI
router.get(
  "/preview",
  getDashboardPreviewStats
);

export default router;
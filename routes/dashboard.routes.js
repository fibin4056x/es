import express from "express";
import {
  getDashboardStats,
  getDashboardReports,
  getDashboardPreviewStats,
} from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/stats", authenticate, getDashboardStats);
router.get("/reports", authenticate, getDashboardReports);
router.get("/preview", getDashboardPreviewStats);

export default router;

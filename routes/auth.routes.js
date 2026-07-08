import express from "express";

import {
  login,
  logout,
  getMe,
} from "../controllers/auth.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/* ================= AUTH ================= */
router.post("/login", login);
router.post("/logout", logout);

/* ================= CURRENT USER ================= */
router.get("/me", authenticate, getMe);

export default router;
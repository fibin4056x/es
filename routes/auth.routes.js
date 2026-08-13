import express from "express";

import {
  login,
  logout,
  getMe,
  updateProfile,
  requestVerificationOtp,
  verifyTeacherOtp,
  completeFirstLogin,
  changePassword,
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import {
  authRateLimiter,
  otpRateLimiter,
} from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

// ============================================================
// AUTHENTICATION
// ============================================================

router.post(
  "/login",
  authRateLimiter,
  login
);

router.post(
  "/logout",
  logout
);

// ============================================================
// CURRENT USER
// ============================================================

router.get(
  "/me",
  authenticate,
  getMe
);

router.patch(
  "/profile",
  authenticate,
  updateProfile
);

// ============================================================
// TEACHER FIRST LOGIN
// ============================================================

router.post(
  "/teacher/request-verification-otp",
  otpRateLimiter,
  requestVerificationOtp
);

router.post(
  "/teacher/verify-otp",
  otpRateLimiter,
  verifyTeacherOtp
);

router.post(
  "/teacher/complete-first-login",
  authRateLimiter,
  completeFirstLogin
);

// ============================================================
// PASSWORD
// ============================================================

router.patch(
  "/change-password",
  authenticate,
  authRateLimiter,
  changePassword
);

// ============================================================
// FORGOT PASSWORD
// ============================================================

router.post(
  "/forgot-password/request-otp",
  otpRateLimiter,
  requestForgotPasswordOtp
);

router.post(
  "/forgot-password/verify-otp",
  otpRateLimiter,
  verifyForgotPasswordOtp
);

router.post(
  "/forgot-password/reset",
  authRateLimiter,
  resetPassword
);

export default router;
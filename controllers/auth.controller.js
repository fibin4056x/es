import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/ApiError.js";
import { ENV } from "../config/env.js";

import {
  loginService,
  verifyLoginOtpService,
  resendLoginOtpService,
  refreshAccessTokenService,
  logoutService,
  getMeService,
  updateProfileService,
  requestVerificationOtpService,
  verifyTeacherOtpService,
  completeFirstLoginService,
  changePasswordService,
  requestForgotPasswordOtpService,
  verifyForgotPasswordOtpService,
  resetPasswordService,
} from "../services/auth.service.js";

/* ============================================================
   COOKIE CONFIGURATION
============================================================ */

/*
 * Access token
 *
 * Short-lived authentication token.
 * Never accessible through JavaScript.
 */
const getAccessTokenCookieOptions = () => ({
  httpOnly: true,
  secure: ENV.COOKIE_SECURE,
  sameSite: ENV.COOKIE_SAME_SITE,
  domain: ENV.COOKIE_DOMAIN || undefined,
  maxAge:
    ENV.ACCESS_COOKIE_MAX_AGE ??
    15 * 60 * 1000,
  path: "/",
});

/*
 * Refresh token
 *
 * Long-lived authentication token.
 *
 * Restricting the path to /api/auth means the browser
 * does not send the refresh token to normal application
 * endpoints.
 */
const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: ENV.COOKIE_SECURE,
  sameSite: ENV.COOKIE_SAME_SITE,
  domain: ENV.COOKIE_DOMAIN || undefined,
  maxAge:
    ENV.REFRESH_COOKIE_MAX_AGE ??
    7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
});

/*
 * Teacher first-login setup token.
 */
const getSetupTokenCookieOptions = () => ({
  httpOnly: true,
  secure: ENV.COOKIE_SECURE,
  sameSite: ENV.COOKIE_SAME_SITE,
  domain: ENV.COOKIE_DOMAIN || undefined,
  maxAge:
    ENV.SETUP_COOKIE_MAX_AGE ??
    10 * 60 * 1000,
  path: "/api/auth/teacher",
});

/*
 * Password reset authorization token.
 *
 * This is intentionally separate from the normal
 * access/refresh authentication cookies.
 */
const getResetTokenCookieOptions = () => ({
  httpOnly: true,
  secure: ENV.COOKIE_SECURE,
  sameSite: ENV.COOKIE_SAME_SITE,
  domain: ENV.COOKIE_DOMAIN || undefined,
  maxAge:
    ENV.RESET_COOKIE_MAX_AGE ??
    10 * 60 * 1000,
  path: "/api/auth/forgot-password",
});

/* ============================================================
   RESPONSE SANITIZATION
============================================================ */

/*
 * JWTs must never be returned in JSON.
 *
 * They remain inside HttpOnly cookies.
 */
const sanitizeAuthResponse = (data = {}) => {
  if (!data || typeof data !== "object") {
    return data;
  }

  const sanitized = { ...data };

  delete sanitized.accessToken;
  delete sanitized.refreshToken;

  delete sanitized.token;

  delete sanitized.setupToken;
  delete sanitized.resetToken;

  return sanitized;
};

/* ============================================================
   CLIENT CONTEXT
============================================================ */

const getClientContext = (req) => ({
  ipAddress: req.ip || "",
  userAgent:
    req.get("user-agent") || "",
});

/* ============================================================
   COOKIE HELPERS
============================================================ */

const clearAuthCookies = (res) => {
  res.clearCookie(
    "accessToken",
    getAccessTokenCookieOptions()
  );

  res.clearCookie(
    "refreshToken",
    getRefreshTokenCookieOptions()
  );

  res.clearCookie(
    "setupToken",
    getSetupTokenCookieOptions()
  );

  res.clearCookie(
    "resetToken",
    getResetTokenCookieOptions()
  );
};

const clearSetupCookie = (res) => {
  res.clearCookie(
    "setupToken",
    getSetupTokenCookieOptions()
  );
};

const clearResetCookie = (res) => {
  res.clearCookie(
    "resetToken",
    getResetTokenCookieOptions()
  );
};

/* ============================================================
   LOGIN
   STEP 1
============================================================ */

/**
 * POST /api/auth/login
 *
 * Email + password
 *        ↓
 * OTP generation
 */
export const login = asyncHandler(
  async (req, res) => {
    const {
      email,
      password,
    } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      throw new ApiError(
        400,
        "Email and password are required."
      );
    }

    const data =
      await loginService({
        email,
        password,
        ...getClientContext(req),
      });

    return res.status(200).json(
      new ApiResponse(
        200,
        sanitizeAuthResponse(data),
        data?.message ||
          "Verification code sent to your registered email."
      )
    );
  }
);

/* ============================================================
   VERIFY LOGIN OTP
   STEP 2
============================================================ */

/**
 * POST /api/auth/verify-otp
 *
 * OTP
 * ↓
 * access token cookie
 * refresh token cookie
 */
export const verifyLoginOtp =
  asyncHandler(
    async (req, res) => {
      const {
        email,
        otp,
      } = req.body || {};

      if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof otp !== "string" ||
        !otp.trim()
      ) {
        throw new ApiError(
          400,
          "Email and verification code are required."
        );
      }

      const data =
        await verifyLoginOtpService({
          email,
          otp,
          ...getClientContext(req),
        });

      const accessToken =
        data?.accessToken ||
        data?.token;

      const refreshToken =
        data?.refreshToken;

      if (!accessToken) {
        throw new ApiError(
          500,
          "Authentication failed."
        );
      }

      if (!refreshToken) {
        throw new ApiError(
          500,
          "Authentication session could not be created."
        );
      }

      res.cookie(
        "accessToken",
        accessToken,
        getAccessTokenCookieOptions()
      );

      res.cookie(
        "refreshToken",
        refreshToken,
        getRefreshTokenCookieOptions()
      );

      return res.status(200).json(
        new ApiResponse(
          200,
          sanitizeAuthResponse(data),
          data?.message ||
            "Login successful."
        )
      );
    }
  );

/* ============================================================
   RESEND LOGIN OTP
============================================================ */

/**
 * POST /api/auth/resend-otp
 */
export const resendLoginOtp =
  asyncHandler(
    async (req, res) => {
      const { email } =
        req.body || {};

      if (
        typeof email !== "string" ||
        !email.trim()
      ) {
        throw new ApiError(
          400,
          "Email is required."
        );
      }

      const data =
        await resendLoginOtpService({
          email,
        });

      return res.status(200).json(
        new ApiResponse(
          200,
          sanitizeAuthResponse(data),
          data?.message ||
            "New verification code sent."
        )
      );
    }
  );

/* ============================================================
   REFRESH ACCESS TOKEN
============================================================ */

/**
 * POST /api/auth/refresh
 *
 * IMPORTANT:
 *
 * Refresh token is accepted ONLY from the HttpOnly cookie.
 *
 * Never accept it from:
 * - request body
 * - Authorization header
 * - custom headers
 */
export const refreshAccessToken =
  asyncHandler(
    async (req, res) => {
      const refreshToken =
        req.cookies?.refreshToken;

      if (
        typeof refreshToken !== "string" ||
        !refreshToken
      ) {
        clearAuthCookies(res);

        throw new ApiError(
          401,
          "Refresh session expired. Please login again."
        );
      }

      const data =
        await refreshAccessTokenService({
          refreshToken,
          ...getClientContext(req),
        });

      const accessToken =
        data?.accessToken ||
        data?.token;

      const newRefreshToken =
        data?.refreshToken;

      if (!accessToken) {
        clearAuthCookies(res);

        throw new ApiError(
          401,
          "Unable to refresh authentication session."
        );
      }

      /*
       * Always replace access token.
       */
      res.cookie(
        "accessToken",
        accessToken,
        getAccessTokenCookieOptions()
      );

      /*
       * Refresh-token rotation.
       */
      if (newRefreshToken) {
        res.cookie(
          "refreshToken",
          newRefreshToken,
          getRefreshTokenCookieOptions()
        );
      }

      return res.status(200).json(
        new ApiResponse(
          200,
          sanitizeAuthResponse(data),
          "Access token refreshed successfully."
        )
      );
    }
  );

/* ============================================================
   LOGOUT
============================================================ */

/**
 * POST /api/auth/logout
 *
 * No authentication middleware required.
 *
 * The access token may already be expired.
 */
export const logout =
  asyncHandler(
    async (req, res) => {
      const refreshToken =
        req.cookies?.refreshToken;

      if (refreshToken) {
        /*
         * If the refresh session is already invalid,
         * logout should still clear browser cookies.
         */
        try {
          await logoutService({
            refreshToken,
            ...getClientContext(req),
          });
        } catch {
          // Intentionally ignored.
          // Logout must remain successful locally.
        }
      }

      clearAuthCookies(res);

      return res.status(200).json(
        new ApiResponse(
          200,
          null,
          "Logged out successfully."
        )
      );
    }
  );

/* ============================================================
   GET CURRENT USER
============================================================ */

/**
 * GET /api/auth/me
 *
 * Requires authenticate middleware.
 */
export const getMe =
  asyncHandler(
    async (req, res) => {
      const userId =
        req.user?.id ||
        req.user?._id;

      if (!userId) {
        throw new ApiError(
          401,
          "Authenticated user not found."
        );
      }

      const data =
        await getMeService(userId);

      return res.status(200).json(
        new ApiResponse(
          200,
          data,
          "User profile fetched successfully."
        )
      );
    }
  );

/* ============================================================
   UPDATE PROFILE
============================================================ */

/**
 * PATCH /api/auth/profile
 */
export const updateProfile =
  asyncHandler(
    async (req, res) => {
      const userId =
        req.user?.id ||
        req.user?._id;

      if (!userId) {
        throw new ApiError(
          401,
          "Authenticated user not found."
        );
      }

      const data =
        await updateProfileService(
          userId,
          req.body || {}
        );

      return res.status(200).json(
        new ApiResponse(
          200,
          data,
          "Profile updated successfully."
        )
      );
    }
  );

/* ============================================================
   TEACHER FIRST LOGIN
   REQUEST VERIFICATION OTP
============================================================ */

/**
 * POST /api/auth/teacher/request-verification-otp
 */
export const requestVerificationOtp =
  asyncHandler(
    async (req, res) => {
      const { email } =
        req.body || {};

      if (
        typeof email !== "string" ||
        !email.trim()
      ) {
        throw new ApiError(
          400,
          "Email is required."
        );
      }

      const data =
        await requestVerificationOtpService(
          email
        );

      return res.status(200).json(
        new ApiResponse(
          200,
          sanitizeAuthResponse(data),
          data?.message ||
            "Verification code sent."
        )
      );
    }
  );

/* ============================================================
   TEACHER FIRST LOGIN
   VERIFY OTP
============================================================ */

/**
 * POST /api/auth/teacher/verify-otp
 */
export const verifyTeacherOtp =
  asyncHandler(
    async (req, res) => {
      const {
        email,
        otp,
      } = req.body || {};

      if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof otp !== "string" ||
        !otp.trim()
      ) {
        throw new ApiError(
          400,
          "Email and verification code are required."
        );
      }

      const data =
        await verifyTeacherOtpService(
          email,
          otp
        );

      /*
       * Setup token goes ONLY into HttpOnly cookie.
       */
      if (data?.setupToken) {
        res.cookie(
          "setupToken",
          data.setupToken,
          getSetupTokenCookieOptions()
        );
      }

      return res.status(200).json(
        new ApiResponse(
          200,
          sanitizeAuthResponse(data),
          data?.message ||
            "Email verified successfully."
        )
      );
    }
  );

/* ============================================================
   TEACHER FIRST LOGIN
   COMPLETE SETUP
============================================================ */

/**
 * POST /api/auth/teacher/complete-first-login
 *
 * Setup token is read ONLY from HttpOnly cookie.
 */
export const completeFirstLogin =
  asyncHandler(
    async (req, res) => {
      const setupToken =
        req.cookies?.setupToken;

      if (
        typeof setupToken !== "string" ||
        !setupToken
      ) {
        throw new ApiError(
          401,
          "Setup session expired. Please verify your email again."
        );
      }

      const {
        newPassword,
        confirmPassword,
      } = req.body || {};

      if (
        typeof newPassword !== "string" ||
        typeof confirmPassword !== "string"
      ) {
        throw new ApiError(
          400,
          "New password and confirmation are required."
        );
      }

      const data =
        await completeFirstLoginService(
          setupToken,
          newPassword,
          confirmPassword
        );

      clearSetupCookie(res);

      /*
       * Current service may return only an access token.
       *
       * Once we update the service, it will return both
       * accessToken and refreshToken.
       */
      const accessToken =
        data?.accessToken ||
        data?.token;

      const refreshToken =
        data?.refreshToken;

      if (accessToken) {
        res.cookie(
          "accessToken",
          accessToken,
          getAccessTokenCookieOptions()
        );
      }

      if (refreshToken) {
        res.cookie(
          "refreshToken",
          refreshToken,
          getRefreshTokenCookieOptions()
        );
      }

      return res.status(200).json(
        new ApiResponse(
          200,
          sanitizeAuthResponse(data),
          data?.message ||
            "Account setup completed successfully."
        )
      );
    }
  );

/* ============================================================
   CHANGE PASSWORD
============================================================ */

/**
 * PATCH /api/auth/change-password
 */
export const changePassword =
  asyncHandler(
    async (req, res) => {
      const userId =
        req.user?.id ||
        req.user?._id;

      if (!userId) {
        throw new ApiError(
          401,
          "Authenticated user not found."
        );
      }

      const {
        currentPassword,
        newPassword,
        confirmPassword,
      } = req.body || {};

      if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string" ||
        typeof confirmPassword !== "string"
      ) {
        throw new ApiError(
          400,
          "Current password, new password and confirmation are required."
        );
      }

      const data =
        await changePasswordService(
          userId,
          currentPassword,
          newPassword,
          confirmPassword
        );

      /*
       * Service revokes all refresh sessions.
       *
       * Therefore the browser must also lose its
       * authentication cookies.
       */
      clearAuthCookies(res);

      return res.status(200).json(
        new ApiResponse(
          200,
          sanitizeAuthResponse(data),
          data?.message ||
            "Password changed successfully. Please login again."
        )
      );
    }
  );

/* ============================================================
   FORGOT PASSWORD
   REQUEST OTP
============================================================ */

/**
 * POST /api/auth/forgot-password/request-otp
 */
export const requestForgotPasswordOtp =
  asyncHandler(
    async (req, res) => {
      const { email } =
        req.body || {};

      if (
        typeof email !== "string" ||
        !email.trim()
      ) {
        throw new ApiError(
          400,
          "Email is required."
        );
      }

      const data =
        await requestForgotPasswordOtpService(
          email
        );

      return res.status(200).json(
        new ApiResponse(
          200,
          sanitizeAuthResponse(data),
          data?.message ||
            "If an account exists for this email, a verification code has been sent."
        )
      );
    }
  );

/* ============================================================
   FORGOT PASSWORD
   VERIFY OTP
============================================================ */

/**
 * POST /api/auth/forgot-password/verify-otp
 */
export const verifyForgotPasswordOtp =
  asyncHandler(
    async (req, res) => {
      const {
        email,
        otp,
      } = req.body || {};

      if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof otp !== "string" ||
        !otp.trim()
      ) {
        throw new ApiError(
          400,
          "Email and verification code are required."
        );
      }

      const data =
        await verifyForgotPasswordOtpService(
          email,
          otp
        );

      /*
       * Reset token goes ONLY into HttpOnly cookie.
       */
      if (data?.resetToken) {
        res.cookie(
          "resetToken",
          data.resetToken,
          getResetTokenCookieOptions()
        );
      }

      return res.status(200).json(
        new ApiResponse(
          200,
          sanitizeAuthResponse(data),
          data?.message ||
            "OTP verified successfully."
        )
      );
    }
  );

/* ============================================================
   FORGOT PASSWORD
   RESET PASSWORD
============================================================ */

/**
 * POST /api/auth/forgot-password/reset
 *
 * Reset token is read ONLY from HttpOnly cookie.
 */
export const resetPassword =
  asyncHandler(
    async (req, res) => {
      const resetToken =
        req.cookies?.resetToken;

      if (
        typeof resetToken !== "string" ||
        !resetToken
      ) {
        throw new ApiError(
          401,
          "Password reset session expired. Please request a new code."
        );
      }

      const {
        newPassword,
        confirmPassword,
      } = req.body || {};

      if (
        typeof newPassword !== "string" ||
        typeof confirmPassword !== "string"
      ) {
        throw new ApiError(
          400,
          "New password and confirmation are required."
        );
      }

      const data =
        await resetPasswordService(
          resetToken,
          newPassword,
          confirmPassword
        );

      /*
       * Reset session is finished.
       */
      clearResetCookie(res);

      /*
       * Password reset invalidates existing
       * authentication sessions.
       */
      clearAuthCookies(res);

      return res.status(200).json(
        new ApiResponse(
          200,
          sanitizeAuthResponse(data),
          data?.message ||
            "Password reset successfully. Please login again."
        )
      );
    }
  );
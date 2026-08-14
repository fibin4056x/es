import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/ApiError.js";
import { ENV } from "../config/env.js";

import {
  loginService,
  logoutService,
  refreshAccessTokenService,
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

const getAccessTokenCookieOptions = () => ({
  httpOnly: ENV.COOKIE_HTTP_ONLY,
  secure: ENV.COOKIE_SECURE,
  sameSite: ENV.COOKIE_SAME_SITE,
  domain: ENV.COOKIE_DOMAIN || undefined,
  maxAge: ENV.ACCESS_COOKIE_MAX_AGE || 15 * 60 * 1000,
  path: "/",
});

const getRefreshTokenCookieOptions = () => ({
  httpOnly: ENV.COOKIE_HTTP_ONLY,
  secure: ENV.COOKIE_SECURE,
  sameSite: ENV.COOKIE_SAME_SITE,
  domain: ENV.COOKIE_DOMAIN || undefined,
  maxAge: ENV.REFRESH_COOKIE_MAX_AGE,
  path: "/api/auth",
});

// Backward compatible alias
const getCookieOptions = getRefreshTokenCookieOptions;

// ============================================================
// LOGIN
// POST /api/auth/login
// ============================================================

export const login = asyncHandler(async (req, res) => {
  const data = await loginService({
    ...req.body,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || "",
  });

  const accessToken = data.accessToken || data.token;
  if (accessToken) {
    res.cookie("accessToken", accessToken, getAccessTokenCookieOptions());
  }

  if (data.refreshToken) {
    res.cookie("refreshToken", data.refreshToken, getRefreshTokenCookieOptions());
    delete data.refreshToken;
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      data,
      data.message || "Login successful"
    )
  );
});

// ============================================================
// REFRESH ACCESS TOKEN
// POST /api/auth/refresh
// ============================================================

export const refreshAccessToken = asyncHandler(
  async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new ApiError(
        401,
        "Refresh token is missing."
      );
    }

    const data = await refreshAccessTokenService({
      refreshToken,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    const accessToken = data.accessToken || data.token;
    if (accessToken) {
      res.cookie("accessToken", accessToken, getAccessTokenCookieOptions());
    }

    if (data.refreshToken) {
      res.cookie("refreshToken", data.refreshToken, getRefreshTokenCookieOptions());
      delete data.refreshToken;
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "Access token refreshed successfully"
      )
    );
  }
);

// ============================================================
// LOGOUT
// POST /api/auth/logout
// ============================================================

export const logout = asyncHandler(
  async (req, res) => {
    const refreshToken =
      req.cookies?.refreshToken;

    if (refreshToken) {
      await logoutService({
        refreshToken,
        ipAddress: req.ip,
      });
    }

    res.clearCookie("accessToken", {
      ...getAccessTokenCookieOptions(),
      maxAge: 0,
    });

    res.clearCookie("refreshToken", {
      ...getRefreshTokenCookieOptions(),
      maxAge: 0,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "Logged out successfully"
      )
    );
  }
);

// ============================================================
// GET CURRENT USER
// GET /api/auth/me
// ============================================================

export const getMe = asyncHandler(
  async (req, res) => {
    const userId = req.user?.id;

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
        "User profile fetched successfully"
      )
    );
  }
);

// ============================================================
// UPDATE PROFILE
// PATCH /api/auth/profile
// ============================================================

export const updateProfile = asyncHandler(
  async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(
        401,
        "Authenticated user not found."
      );
    }

    const data =
      await updateProfileService(
        userId,
        req.body
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "Profile updated successfully"
      )
    );
  }
);

// ============================================================
// TEACHER FIRST LOGIN
// REQUEST OTP
// POST /api/auth/teacher/request-otp
// ============================================================

export const requestVerificationOtp =
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const data =
      await requestVerificationOtpService(
        email
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        data.message ||
          "Verification OTP sent"
      )
    );
  });

// ============================================================
// TEACHER FIRST LOGIN
// VERIFY OTP
// POST /api/auth/teacher/verify-otp
// ============================================================

export const verifyTeacherOtp =
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const data =
      await verifyTeacherOtpService(
        email,
        otp
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        data.message ||
          "Email verified successfully"
      )
    );
  });

// ============================================================
// TEACHER FIRST LOGIN
// COMPLETE SETUP
// POST /api/auth/teacher/complete-setup
// ============================================================

export const completeFirstLogin =
  asyncHandler(async (req, res) => {
    let setupToken = req.body?.setupToken || req.cookies?.setupToken;
    const authHeader = req.headers.authorization;

    if (!setupToken && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      setupToken = authHeader.slice(7).trim();
    }

    if (!setupToken) {
      throw new ApiError(
        401,
        "Setup authorization token is required."
      );
    }

    const {
      newPassword,
      confirmPassword,
    } = req.body;

    const data =
      await completeFirstLoginService(
        setupToken,
        newPassword,
        confirmPassword
      );

    if (data.accessToken) {
      res.cookie("accessToken", data.accessToken, getAccessTokenCookieOptions());
    }

    if (data.refreshToken) {
      res.cookie("refreshToken", data.refreshToken, getRefreshTokenCookieOptions());
      delete data.refreshToken;
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        data.message ||
          "Account setup completed successfully"
      )
    );
  });

// ============================================================
// CHANGE PASSWORD
// PATCH /api/auth/change-password
// ============================================================

export const changePassword =
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;

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
    } = req.body;

    const data =
      await changePasswordService(
        userId,
        currentPassword,
        newPassword,
        confirmPassword
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        data.message ||
          "Password changed successfully"
      )
    );
  });

// ============================================================
// FORGOT PASSWORD
// REQUEST OTP
// POST /api/auth/forgot-password/request-otp
// ============================================================

export const requestForgotPasswordOtp =
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const data =
      await requestForgotPasswordOtpService(
        email
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        data.message ||
          "Password reset OTP sent"
      )
    );
  });

// ============================================================
// FORGOT PASSWORD
// VERIFY OTP
// POST /api/auth/forgot-password/verify-otp
// ============================================================

export const verifyForgotPasswordOtp =
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const data =
      await verifyForgotPasswordOtpService(
        email,
        otp
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        data.message ||
          "OTP verified successfully"
      )
    );
  });

// ============================================================
// FORGOT PASSWORD
// RESET PASSWORD
// POST /api/auth/forgot-password/reset
// ============================================================

export const resetPassword =
  asyncHandler(async (req, res) => {
    const authHeader =
      req.headers.authorization;

    if (
      typeof authHeader !== "string" ||
      !authHeader.startsWith("Bearer ")
    ) {
      throw new ApiError(
        401,
        "Password reset authorization token is required."
      );
    }

    const resetToken =
      authHeader.slice(7).trim();

    if (!resetToken) {
      throw new ApiError(
        401,
        "Invalid password reset authorization token."
      );
    }

    const {
      newPassword,
      confirmPassword,
    } = req.body;

    const data =
      await resetPasswordService(
        resetToken,
        newPassword,
        confirmPassword
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        data.message ||
          "Password reset successfully"
      )
    );
  });
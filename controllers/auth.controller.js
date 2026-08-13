import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/ApiError.js";

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

  // Refresh token is intentionally NOT returned in JSON.
  // It should be stored in a secure HttpOnly cookie by the service.
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

    // Always clear the cookie.
    // Logout should remain successful even if the
    // refresh token is already expired/revoked.
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      path: "/api/auth",
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
    const authHeader =
      req.headers.authorization;

    if (
      typeof authHeader !== "string" ||
      !authHeader.startsWith("Bearer ")
    ) {
      throw new ApiError(
        401,
        "Setup authorization token is required."
      );
    }

    const setupToken =
      authHeader.slice(7).trim();

    if (!setupToken) {
      throw new ApiError(
        401,
        "Invalid setup authorization token."
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
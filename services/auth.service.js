import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";

import User from "../models/user.model.js";
import RefreshSession from "../models/refreshSession.model.js";
import ApiError from "../utils/ApiError.js";
import { ENV } from "../config/env.js";

import { ROLES } from "../models/constants/role.js";

import {
  generateAccessToken,
  generateRefreshToken,
  generateSetupToken,
  generateResetToken,
  verifyRefreshToken,
  verifySetupToken,
  verifyResetToken,
} from "../validations/auth.tokens.js";

import {
  generateAndSendOtp,
  verifyOtp,
} from "./otp.service.js";

import {
  sendPasswordChangedNotificationEmail,
} from "./email.service.js";

// ============================================================
// CONFIGURATION
// ============================================================

const MIN_PASSWORD_LENGTH = 8;

const OTP_PURPOSES = Object.freeze({
  FIRST_LOGIN: "FIRST_LOGIN",
  PASSWORD_RESET: "PASSWORD_RESET",
});

// ============================================================
// HELPERS
// ============================================================

const normalizeEmail = (email) => {
  if (typeof email !== "string") {
    throw new ApiError(400, "Valid email is required.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ApiError(400, "Invalid email address.");
  }

  return normalizedEmail;
};

const validateUserId = (userId) => {
  if (!userId) {
    throw new ApiError(401, "Authentication required.");
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(401, "Invalid authentication.");
  }

  return userId;
};

const validatePassword = (password) => {
  if (typeof password !== "string") {
    throw new ApiError(400, "Password is required.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
    );
  }

  if (password.length > 128) {
    throw new ApiError(
      400,
      "Password cannot exceed 128 characters."
    );
  }

  return password;
};

const validatePasswordPair = (
  newPassword,
  confirmPassword
) => {
  if (
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    throw new ApiError(
      400,
      "New password and confirmation password are required."
    );
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(
      400,
      "Passwords do not match."
    );
  }

  validatePassword(newPassword);
};

const buildUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  isActive: user.isActive,
  emailVerified: user.emailVerified,
  firstLoginCompleted: user.firstLoginCompleted,
  avatar: user.avatar,
  profile: user.profile,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const ensureActiveUser = (user) => {
  if (!user) {
    throw new ApiError(
      404,
      "User account not found."
    );
  }

  if (user.isDeleted) {
    throw new ApiError(
      403,
      "User account is no longer available."
    );
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      "Your account is inactive."
    );
  }

  if (user.status !== "active") {
    throw new ApiError(
      403,
      "Your account is not active."
    );
  }
};

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const revokeAllUserRefreshSessions = async (userId) => {
  await RefreshSession.updateMany(
    {
      userId,
      isRevoked: false,
    },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    }
  );
};

// ============================================================
// LOGIN
// ============================================================

export const loginService = async ({
  email,
  password,
  ipAddress = "",
  userAgent = "",
}) => {
  const normalizedEmail = normalizeEmail(email);

  if (
    typeof password !== "string" ||
    !password
  ) {
    throw new ApiError(
      400,
      "Email and password are required."
    );
  }

  const user = await User.findOne({
    email: normalizedEmail,
    isDeleted: false,
  }).select("+password");

  if (!user || !user.password) {
    throw new ApiError(
      401,
      "Invalid email or password."
    );
  }

  const passwordMatch = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatch) {
    throw new ApiError(
      401,
      "Invalid email or password."
    );
  }

  // ----------------------------------------------------------
  // TEACHER FIRST LOGIN
  // ----------------------------------------------------------

  const requiresFirstLogin =
    user.role === ROLES.TEACHER &&
    (
      !user.emailVerified ||
      !user.firstLoginCompleted ||
      user.status === "pending_verification"
    );

  if (requiresFirstLogin) {
    // Do not allow disabled/suspended teachers
    // to use the first-login flow.
    if (user.isDeleted) {
      throw new ApiError(
        403,
        "Your account is no longer available."
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        403,
        "Your account is inactive."
      );
    }

    if (
      user.status !== "pending_verification" &&
      user.status !== "active"
    ) {
      throw new ApiError(
        403,
        "Your account is not eligible for first-login verification."
      );
    }

    try {
      await generateAndSendOtp(
        user,
        OTP_PURPOSES.FIRST_LOGIN
      );
    } catch (otpErr) {
      throw new ApiError(
        otpErr.statusCode || 500,
        otpErr.message || "Failed to send verification email. Please try again or contact administrator."
      );
    }

    return {
      requiresVerification: true,
      email: user.email,
      message:
        "Verification required. A verification code has been sent to your email.",
    };
  }

  // ----------------------------------------------------------
  // ACCOUNT STATE
  // ----------------------------------------------------------

  ensureActiveUser(user);

  // ----------------------------------------------------------
  // UPDATE LOGIN
  // ----------------------------------------------------------

  user.lastLogin = new Date();

  await user.save();

  // ----------------------------------------------------------
  // TOKEN GENERATION
  // ----------------------------------------------------------

  const accessToken =
    generateAccessToken(user);

  const refreshToken =
    generateRefreshToken(user);

  const tokenHash =
    hashToken(refreshToken);

  // ----------------------------------------------------------
  // REFRESH SESSION
  // ----------------------------------------------------------

  await RefreshSession.create({
    userId: user._id,
    tokenHash,
    ipAddress,
    userAgent,
    expiresAt: new Date(
      Date.now() +
      ENV.REFRESH_COOKIE_MAX_AGE
    ),
  });

  return {
    message: "Login successful.",
    token: accessToken,
    refreshToken,
    user: buildUser(user),
  };
};

// ============================================================
// REFRESH ACCESS TOKEN
// ============================================================

export const refreshAccessTokenService = async ({
  refreshToken,
  ipAddress = "",
  userAgent = "",
}) => {
  if (
    !refreshToken ||
    typeof refreshToken !== "string"
  ) {
    throw new ApiError(
      401,
      "Refresh token is missing or invalid."
    );
  }

  let decoded;

  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(
      401,
      "Invalid or expired refresh token."
    );
  }

  const tokenHash =
    hashToken(refreshToken);

  const session =
    await RefreshSession.findOne({
      tokenHash,
    });

  if (!session) {
    throw new ApiError(
      401,
      "Refresh session not found."
    );
  }

  // ----------------------------------------------------------
  // REUSE DETECTION
  // ----------------------------------------------------------

  if (session.isRevoked) {
    await revokeAllUserRefreshSessions(
      session.userId
    );

    throw new ApiError(
      401,
      "Refresh token has been revoked due to security policy."
    );
  }

  // ----------------------------------------------------------
  // EXPIRATION
  // ----------------------------------------------------------

  if (
    session.expiresAt <= new Date()
  ) {
    await RefreshSession.updateOne(
      {
        _id: session._id,
        isRevoked: false,
      },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      }
    );

    throw new ApiError(
      401,
      "Refresh session has expired."
    );
  }

  // ----------------------------------------------------------
  // TOKEN/SSESSION USER CONSISTENCY
  // ----------------------------------------------------------

  if (
    decoded.sub !==
    session.userId.toString()
  ) {
    await revokeAllUserRefreshSessions(
      session.userId
    );

    throw new ApiError(
      401,
      "Invalid refresh session."
    );
  }

  // ----------------------------------------------------------
  // USER
  // ----------------------------------------------------------

  const user = await User.findOne({
    _id: session.userId,
    isDeleted: false,
  });

  ensureActiveUser(user);

  // ----------------------------------------------------------
  // ATOMIC ROTATION
  // ----------------------------------------------------------
  //
  // Only one concurrent request can successfully
  // rotate the same refresh session.
  //

  const revokedSession =
    await RefreshSession.findOneAndUpdate(
      {
        _id: session._id,
        isRevoked: false,
      },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

  if (!revokedSession) {
    await revokeAllUserRefreshSessions(
      session.userId
    );

    throw new ApiError(
      401,
      "Refresh token reuse detected."
    );
  }

  // ----------------------------------------------------------
  // NEW TOKEN PAIR
  // ----------------------------------------------------------

  const newAccessToken =
    generateAccessToken(user);

  const newRefreshToken =
    generateRefreshToken(user);

  const newTokenHash =
    hashToken(newRefreshToken);

  revokedSession.replacedByTokenHash =
    newTokenHash;

  await revokedSession.save();

  await RefreshSession.create({
    userId: user._id,
    tokenHash: newTokenHash,
    ipAddress,
    userAgent,
    expiresAt: new Date(
      Date.now() +
      ENV.REFRESH_COOKIE_MAX_AGE
    ),
  });

  return {
    token: newAccessToken,
    refreshToken: newRefreshToken,
    user: buildUser(user),
  };
};

// ============================================================
// LOGOUT
// ============================================================

export const logoutService = async ({
  refreshToken,
  userId,
}) => {
  if (refreshToken) {
    const tokenHash =
      hashToken(refreshToken);

    await RefreshSession.updateOne(
      {
        tokenHash,
        isRevoked: false,
      },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      }
    );
  } else if (userId) {
    const validUserId =
      validateUserId(userId);

    await revokeAllUserRefreshSessions(
      validUserId
    );
  }

  return {
    success: true,
  };
};

// ============================================================
// TEACHER - REQUEST VERIFICATION OTP
// ============================================================

export const requestVerificationOtpService =
  async (email) => {
    const normalizedEmail =
      normalizeEmail(email);

    const user = await User.findOne({
      email: normalizedEmail,
      isDeleted: false,
    });

    if (!user) {
      throw new ApiError(
        404,
        "Teacher account not found."
      );
    }

    if (
      user.role !== ROLES.TEACHER
    ) {
      throw new ApiError(
        400,
        "First-login verification is only available for teacher accounts."
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        403,
        "Your account is inactive."
      );
    }

    if (
      user.status === "suspended" ||
      user.status === "leave"
    ) {
      throw new ApiError(
        403,
        "Your account is not eligible for verification."
      );
    }

    if (
      user.emailVerified &&
      user.firstLoginCompleted &&
      user.status === "active"
    ) {
      throw new ApiError(
        400,
        "Account is already verified. Please log in normally."
      );
    }

    return generateAndSendOtp(
      user,
      OTP_PURPOSES.FIRST_LOGIN
    );
  };

// ============================================================
// TEACHER - VERIFY OTP
// ============================================================

export const verifyTeacherOtpService =
  async (email, otp) => {
    const result =
      await verifyOtp(
        email,
        otp,
        OTP_PURPOSES.FIRST_LOGIN
      );

    const user =
      await User.findOne({
        _id: result.userId,
        isDeleted: false,
      });

    if (!user) {
      throw new ApiError(
        404,
        "User account not found."
      );
    }

    if (
      user.role !== ROLES.TEACHER
    ) {
      throw new ApiError(
        403,
        "Invalid account type."
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        403,
        "Your account is inactive."
      );
    }

    if (
      user.status === "suspended" ||
      user.status === "leave"
    ) {
      throw new ApiError(
        403,
        "Your account is not eligible for verification."
      );
    }

    user.emailVerified = true;

    if (!user.firstLoginCompleted) {
      user.status =
        "pending_verification";
    }

    await user.save();

    const setupToken =
      generateSetupToken(user);

    return {
      message:
        "Email verified successfully. Please create your permanent password.",
      requiresPasswordSetup: true,
      setupToken,
    };
  };

// ============================================================
// TEACHER - COMPLETE FIRST LOGIN
// ============================================================

export const completeFirstLoginService =
  async (
    setupToken,
    newPassword,
    confirmPassword
  ) => {
    if (
      typeof setupToken !== "string" ||
      !setupToken.trim()
    ) {
      throw new ApiError(
        400,
        "Setup token is required."
      );
    }

    validatePasswordPair(
      newPassword,
      confirmPassword
    );

    let decoded;

    try {
      decoded =
        verifySetupToken(
          setupToken.trim()
        );
    } catch {
      throw new ApiError(
        401,
        "Invalid or expired setup token."
      );
    }

    const user =
      await User.findOne({
        _id: decoded.sub,
        isDeleted: false,
      }).select("+password");

    if (!user) {
      throw new ApiError(
        404,
        "User account not found."
      );
    }

    if (
      user.role !== ROLES.TEACHER
    ) {
      throw new ApiError(
        403,
        "Invalid account type."
      );
    }

    if (user.firstLoginCompleted) {
      throw new ApiError(
        409,
        "First-login setup has already been completed."
      );
    }

    if (!user.emailVerified) {
      throw new ApiError(
        403,
        "Email verification is required."
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        403,
        "Your account is inactive."
      );
    }

    // ----------------------------------------------------------
    // PASSWORD
    // ----------------------------------------------------------

    if (user.password) {
      const samePassword =
        await bcrypt.compare(
          newPassword,
          user.password
        );

      if (samePassword) {
        throw new ApiError(
          400,
          "New password must be different from the existing password."
        );
      }
    }

    user.password =
      newPassword;

    user.emailVerified =
      true;

    user.firstLoginCompleted =
      true;

    user.status =
      "active";

    user.isActive =
      true;

    user.lastLogin =
      new Date();

    await user.save();

    // ----------------------------------------------------------
    // INVALIDATE ANY OLD SESSIONS
    // ----------------------------------------------------------

    await revokeAllUserRefreshSessions(
      user._id
    );

    // ----------------------------------------------------------
    // EMAIL
    // ----------------------------------------------------------

    try {
      await sendPasswordChangedNotificationEmail({
        to: user.email,
        name: user.name,
      });
    } catch {
      // Notification failure must not
      // undo successful account setup.
    }

    // ----------------------------------------------------------
    // LOGIN
    // ----------------------------------------------------------

    const accessToken =
      generateAccessToken(user);

    return {
      message:
        "Account setup completed successfully.",
      token: accessToken,
      user: buildUser(user),
    };
  };

// ============================================================
// CHANGE PASSWORD
// ============================================================

export const changePasswordService =
  async (
    userId,
    currentPassword,
    newPassword,
    confirmPassword
  ) => {
    const validUserId =
      validateUserId(userId);

    if (
      typeof currentPassword !== "string"
    ) {
      throw new ApiError(
        400,
        "Current password is required."
      );
    }

    validatePasswordPair(
      newPassword,
      confirmPassword
    );

    if (
      currentPassword ===
      newPassword
    ) {
      throw new ApiError(
        400,
        "New password must be different from your current password."
      );
    }

    const user =
      await User.findOne({
        _id: validUserId,
        isDeleted: false,
      }).select("+password");

    ensureActiveUser(user);

    if (!user.password) {
      throw new ApiError(
        400,
        "Current password is not available."
      );
    }

    const passwordMatch =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!passwordMatch) {
      throw new ApiError(
        401,
        "Current password is incorrect."
      );
    }

    user.password =
      newPassword;

    await user.save();

    // Revoke every refresh session.
    await revokeAllUserRefreshSessions(
      user._id
    );

    try {
      await sendPasswordChangedNotificationEmail({
        to: user.email,
        name: user.name,
      });
    } catch {
      // Notification failure must not
      // fail password change.
    }

    return {
      message:
        "Password changed successfully. Please log in again.",
    };
  };

// ============================================================
// FORGOT PASSWORD - REQUEST OTP
// ============================================================

export const requestForgotPasswordOtpService =
  async (email) => {
    const genericResponse = {
      message:
        "If an account exists for this email, a verification code has been sent.",
    };

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return genericResponse;
    }

    const normalizedEmail =
      normalizeEmail(email);

    const user =
      await User.findOne({
        email: normalizedEmail,
        isDeleted: false,
      });

    if (
      !user ||
      !user.isActive ||
      user.status !== "active"
    ) {
      return genericResponse;
    }

    await generateAndSendOtp(
      user,
      OTP_PURPOSES.PASSWORD_RESET
    );

    return genericResponse;
  };

// ============================================================
// FORGOT PASSWORD - VERIFY OTP
// ============================================================

export const verifyForgotPasswordOtpService =
  async (email, otp) => {
    const result =
      await verifyOtp(
        email,
        otp,
        OTP_PURPOSES.PASSWORD_RESET
      );

    const user =
      await User.findOne({
        _id: result.userId,
        isDeleted: false,
      });

    ensureActiveUser(user);

    const resetToken =
      generateResetToken(user);

    return {
      message:
        "OTP verified successfully. You may now reset your password.",
      resetToken,
    };
  };

// ============================================================
// FORGOT PASSWORD - RESET
// ============================================================

export const resetPasswordService =
  async (
    resetToken,
    newPassword,
    confirmPassword
  ) => {
    if (
      typeof resetToken !== "string" ||
      !resetToken.trim()
    ) {
      throw new ApiError(
        400,
        "Reset token is required."
      );
    }

    validatePasswordPair(
      newPassword,
      confirmPassword
    );

    let decoded;

    try {
      decoded =
        verifyResetToken(
          resetToken.trim()
        );
    } catch {
      throw new ApiError(
        401,
        "Invalid or expired reset token."
      );
    }

    const user =
      await User.findOne({
        _id: decoded.sub,
        isDeleted: false,
      }).select("+password");

    ensureActiveUser(user);

    // ----------------------------------------------------------
    // PREVENT RESET TOKEN REUSE
    // ----------------------------------------------------------
    //
    // Once the password has changed, passwordChangedAt becomes
    // newer than the reset token's issued time.
    //

    if (
      user.passwordChangedAt &&
      decoded.iat &&
      user.passwordChangedAt.getTime() >=
        decoded.iat * 1000
    ) {
      throw new ApiError(
        401,
        "Password reset token has already been used."
      );
    }

    // ----------------------------------------------------------
    // PREVENT PASSWORD REUSE
    // ----------------------------------------------------------

    if (user.password) {
      const samePassword =
        await bcrypt.compare(
          newPassword,
          user.password
        );

      if (samePassword) {
        throw new ApiError(
          400,
          "New password must be different from your current password."
        );
      }
    }

    user.password =
      newPassword;

    await user.save();

    // ----------------------------------------------------------
    // REVOKE ALL REFRESH SESSIONS
    // ----------------------------------------------------------

    await revokeAllUserRefreshSessions(
      user._id
    );

    // ----------------------------------------------------------
    // NOTIFICATION
    // ----------------------------------------------------------

    try {
      await sendPasswordChangedNotificationEmail({
        to: user.email,
        name: user.name,
      });
    } catch {
      // Password reset must not fail because
      // notification email failed.
    }

    return {
      message:
        "Password reset successfully. Please log in with your new password.",
    };
  };

// ============================================================
// GET CURRENT USER
// ============================================================

export const getMeService =
  async (userId) => {
    const validUserId =
      validateUserId(userId);

    const user =
      await User.findOne({
        _id: validUserId,
        isDeleted: false,
      });

    ensureActiveUser(user);

    return buildUser(user);
  };

// ============================================================
// VALIDATE USER FROM ACCESS TOKEN
// ============================================================

export const validateUserFromToken =
  async (userId) => {
    const validUserId =
      validateUserId(userId);

    const user =
      await User.findOne({
        _id: validUserId,
        isDeleted: false,
      });

    if (!user) {
      throw new ApiError(
        401,
        "User account not found."
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        403,
        "Account is inactive."
      );
    }

    if (user.status !== "active") {
      throw new ApiError(
        403,
        "Account is not active."
      );
    }

    return buildUser(user);
  };

// ============================================================
// UPDATE PROFILE
// ============================================================

export const updateProfileService =
  async (
    userId,
    data = {}
  ) => {
    const validUserId =
      validateUserId(userId);

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      throw new ApiError(
        400,
        "Invalid profile data."
      );
    }

    const user =
      await User.findOne({
        _id: validUserId,
        isDeleted: false,
      });

    ensureActiveUser(user);

    // ----------------------------------------------------------
    // NAME
    // ----------------------------------------------------------

    if (
      data.name !== undefined
    ) {
      if (
        typeof data.name !== "string"
      ) {
        throw new ApiError(
          400,
          "Name must be a string."
        );
      }

      const name =
        data.name.trim();

      if (name.length < 2) {
        throw new ApiError(
          400,
          "Name must contain at least 2 characters."
        );
      }

      if (name.length > 80) {
        throw new ApiError(
          400,
          "Name cannot exceed 80 characters."
        );
      }

      user.name = name;
    }

    // ----------------------------------------------------------
    // AVATAR
    // ----------------------------------------------------------

    if (
      data.avatar !== undefined
    ) {
      if (
        data.avatar !== null &&
        typeof data.avatar !== "string"
      ) {
        throw new ApiError(
          400,
          "Avatar must be a valid URL or null."
        );
      }

      user.avatar =
        typeof data.avatar === "string" &&
        data.avatar.trim()
          ? data.avatar.trim()
          : null;
    }

    // ----------------------------------------------------------
    // PROFILE
    // ----------------------------------------------------------

    if (
      data.profile !== undefined
    ) {
      if (
        !data.profile ||
        typeof data.profile !== "object" ||
        Array.isArray(data.profile)
      ) {
        throw new ApiError(
          400,
          "Invalid profile data."
        );
      }

      if (
        data.profile.gender !== undefined
      ) {
        const allowedGenders = [
          "male",
          "female",
          "other",
        ];

        if (
          data.profile.gender !== null &&
          !allowedGenders.includes(
            data.profile.gender
          )
        ) {
          throw new ApiError(
            400,
            "Invalid gender value."
          );
        }

        user.profile.gender =
          data.profile.gender;
      }

      if (
        data.profile.dob !== undefined
      ) {
        if (
          data.profile.dob === null
        ) {
          user.profile.dob = null;
        } else {
          const dob =
            new Date(
              data.profile.dob
            );

          if (
            Number.isNaN(
              dob.getTime()
            )
          ) {
            throw new ApiError(
              400,
              "Invalid date of birth."
            );
          }

          if (
            dob > new Date()
          ) {
            throw new ApiError(
              400,
              "Date of birth cannot be in the future."
            );
          }

          user.profile.dob =
            dob;
        }
      }
    }

    // ----------------------------------------------------------
    // EMAIL
    // ----------------------------------------------------------

    if (
      data.email !== undefined
    ) {
      const newEmail =
        normalizeEmail(
          data.email
        );

      if (
        newEmail !== user.email
      ) {
        throw new ApiError(
          400,
          "Email changes require a separate email verification flow."
        );
      }
    }

    await user.save();

    return buildUser(user);
  };
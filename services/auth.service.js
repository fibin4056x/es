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

/* ============================================================
   CONSTANTS
============================================================ */

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const OTP_PURPOSES = Object.freeze({
  LOGIN: "LOGIN",
  FIRST_LOGIN: "FIRST_LOGIN",
  PASSWORD_RESET: "PASSWORD_RESET",
});

const USER_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  LEAVE: "leave",
  PENDING_VERIFICATION: "pending_verification",
});

/* ============================================================
   VALIDATION HELPERS
============================================================ */

const normalizeEmail = (email) => {
  if (typeof email !== "string") {
    throw new ApiError(400, "Valid email is required.");
  }

  const normalized = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ApiError(400, "Invalid email address.");
  }

  return normalized;
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

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ApiError(
      400,
      `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`
    );
  }

  return password;
};

const validatePasswordPair = (
  newPassword,
  confirmPassword
) => {
  validatePassword(newPassword);

  if (typeof confirmPassword !== "string") {
    throw new ApiError(
      400,
      "Password confirmation is required."
    );
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(
      400,
      "Passwords do not match."
    );
  }
};

/* ============================================================
   USER HELPERS
============================================================ */

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
      "Your account is no longer available."
    );
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      "Your account is inactive."
    );
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(
      403,
      "Your account is not active."
    );
  }
};

const ensureTeacherEligible = (user) => {
  if (!user) {
    throw new ApiError(
      404,
      "Teacher account not found."
    );
  }

  if (user.role !== ROLES.TEACHER) {
    throw new ApiError(
      403,
      "Invalid account type."
    );
  }

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
    user.status === USER_STATUS.SUSPENDED ||
    user.status === USER_STATUS.LEAVE
  ) {
    throw new ApiError(
      403,
      "Your account is not eligible for verification."
    );
  }
};

const requiresFirstLogin = (user) =>
  user.role === ROLES.TEACHER &&
  (
    !user.emailVerified ||
    !user.firstLoginCompleted ||
    user.status === USER_STATUS.PENDING_VERIFICATION
  );

const getLoginOtpPurpose = (user) =>
  requiresFirstLogin(user)
    ? OTP_PURPOSES.FIRST_LOGIN
    : OTP_PURPOSES.LOGIN;

/* ============================================================
   REFRESH TOKEN HELPERS
============================================================ */

const hashToken = (token) =>
  crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

const getRefreshExpiration = () =>
  new Date(
    Date.now() + ENV.REFRESH_COOKIE_MAX_AGE
  );

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

/* ============================================================
   LOGIN
============================================================ */

export const loginService = async ({
  email,
  password,
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

  /*
   * Password is select:false in the schema,
   * so explicitly request it only for login.
   */
  const user = await User.findOne({
    email: normalizedEmail,
    isDeleted: false,
  })
    .select("+password")
    .exec();

  /*
   * Do not reveal whether the email exists.
   */
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

  /*
   * Account must be checked only after
   * credentials are validated.
   */
  if (!user.isActive) {
    throw new ApiError(
      403,
      "Your account is inactive."
    );
  }

  if (
    user.status === USER_STATUS.SUSPENDED
  ) {
    throw new ApiError(
      403,
      "Your account is suspended."
    );
  }

  if (
    user.status === USER_STATUS.LEAVE
  ) {
    throw new ApiError(
      403,
      "Your account is currently on leave."
    );
  }

  /*
   * A pending teacher can continue through
   * first-login verification.
   */
  if (
    user.status !== USER_STATUS.ACTIVE &&
    !requiresFirstLogin(user)
  ) {
    throw new ApiError(
      403,
      "Your account is not active."
    );
  }

  const otpPurpose =
    getLoginOtpPurpose(user);

  try {
    await generateAndSendOtp(
      user,
      otpPurpose
    );
  } catch (error) {
    /*
     * Do not expose internal SMTP/provider
     * information to the client.
     */
    throw new ApiError(
      error?.statusCode || 503,
      "Unable to send the verification code. Please try again later."
    );
  }

  return {
    success: true,
    requiresOtp: true,
    requiresVerification: true,
    otpRequired: true,
    email: user.email,
    message:
      "Verification code sent to your registered email.",
  };
};

/* ============================================================
   VERIFY LOGIN OTP
============================================================ */

export const verifyLoginOtpService = async ({
  email,
  otp,
  ipAddress = "",
  userAgent = "",
}) => {
  const normalizedEmail =
    normalizeEmail(email);

  let otpResult;

  /*
   * Try normal login OTP first.
   *
   * If this account is in first-login mode,
   * accept FIRST_LOGIN OTP.
   */
  try {
    otpResult = await verifyOtp(
      normalizedEmail,
      otp,
      OTP_PURPOSES.LOGIN
    );
  } catch (loginOtpError) {
    try {
      otpResult = await verifyOtp(
        normalizedEmail,
        otp,
        OTP_PURPOSES.FIRST_LOGIN
      );
    } catch {
      throw loginOtpError;
    }
  }

  const user = await User.findOne({
    _id: otpResult.userId,
    isDeleted: false,
  }).exec();

  ensureActiveUser(
    user.status === USER_STATUS.PENDING_VERIFICATION
      ? null
      : user
  );

  /*
   * For a teacher first login, OTP verification
   * should normally go through the dedicated
   * setup flow. Do not silently bypass password setup.
   */
  if (
    user.role === ROLES.TEACHER &&
    !user.firstLoginCompleted
  ) {
    throw new ApiError(
      409,
      "First-login account setup is required."
    );
  }

  user.emailVerified = true;
  user.lastLogin = new Date();

  await user.save();

  const accessToken =
    generateAccessToken(user);

  const refreshToken =
    generateRefreshToken(user);

  const tokenHash =
    hashToken(refreshToken);

  await RefreshSession.create({
    userId: user._id,
    tokenHash,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    expiresAt: getRefreshExpiration(),
  });

  return {
    message: "Login successful.",
    token: accessToken,
    refreshToken,
    user: buildUser(user),
  };
};

/* ============================================================
   RESEND LOGIN OTP
============================================================ */

export const resendLoginOtpService = async ({
  email,
}) => {
  const normalizedEmail =
    normalizeEmail(email);

  const user = await User.findOne({
    email: normalizedEmail,
    isDeleted: false,
  }).exec();

  ensureActiveUser(
    user?.status === USER_STATUS.PENDING_VERIFICATION
      ? null
      : user
  );

  const otpPurpose =
    getLoginOtpPurpose(user);

  try {
    await generateAndSendOtp(
      user,
      otpPurpose
    );
  } catch {
    throw new ApiError(
      503,
      "Unable to send the verification code. Please try again later."
    );
  }

  return {
    success: true,
    message:
      "New verification code sent to your registered email.",
  };
};

/* ============================================================
   REFRESH ACCESS TOKEN
============================================================ */

export const refreshAccessTokenService = async ({
  refreshToken,
  ipAddress = "",
  userAgent = "",
}) => {
  if (
    typeof refreshToken !== "string" ||
    !refreshToken.trim()
  ) {
    throw new ApiError(
      401,
      "Refresh token is missing or invalid."
    );
  }

  let decoded;

  try {
    decoded =
      verifyRefreshToken(
        refreshToken
      );
  } catch {
    throw new ApiError(
      401,
      "Invalid or expired refresh token."
    );
  }

  const tokenHash =
    hashToken(refreshToken);

  /*
   * tokenHash has a unique index, so this is
   * an efficient O(1)-style indexed lookup.
   */
  const session =
    await RefreshSession.findOne({
      tokenHash,
    }).exec();

  if (!session) {
    throw new ApiError(
      401,
      "Refresh session not found."
    );
  }

  /*
   * Reuse detection.
   *
   * A revoked refresh token being presented again
   * indicates possible token theft.
   */
  if (session.isRevoked) {
    await revokeAllUserRefreshSessions(
      session.userId
    );

    throw new ApiError(
      401,
      "Refresh session is no longer valid."
    );
  }

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
    ).exec();

    throw new ApiError(
      401,
      "Refresh session has expired."
    );
  }

  /*
   * Ensure the JWT and database session
   * belong to the same user.
   */
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

  const user =
    await User.findOne({
      _id: session.userId,
      isDeleted: false,
    }).exec();

  ensureActiveUser(user);

  /*
   * Atomic rotation.
   *
   * Two simultaneous requests using the same
   * refresh token cannot both rotate it.
   */
  const rotatedSession =
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
    ).exec();

  if (!rotatedSession) {
    await revokeAllUserRefreshSessions(
      session.userId
    );

    throw new ApiError(
      401,
      "Refresh token reuse detected."
    );
  }

  const newAccessToken =
    generateAccessToken(user);

  const newRefreshToken =
    generateRefreshToken(user);

  const newTokenHash =
    hashToken(newRefreshToken);

  rotatedSession.replacedByTokenHash =
    newTokenHash;

  await rotatedSession.save();

  await RefreshSession.create({
    userId: user._id,
    tokenHash: newTokenHash,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    expiresAt: getRefreshExpiration(),
  });

  return {
    token: newAccessToken,
    refreshToken: newRefreshToken,
    user: buildUser(user),
  };
};

/* ============================================================
   LOGOUT
============================================================ */

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
    ).exec();

    return {
      success: true,
    };
  }

  if (userId) {
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

/* ============================================================
   TEACHER - REQUEST VERIFICATION OTP
============================================================ */

export const requestVerificationOtpService =
  async (email) => {
    const normalizedEmail =
      normalizeEmail(email);

    const user =
      await User.findOne({
        email: normalizedEmail,
        isDeleted: false,
      }).exec();

    /*
     * This endpoint is specifically for teachers,
     * so the error can be explicit here.
     */
    if (!user) {
      throw new ApiError(
        404,
        "Teacher account not found."
      );
    }

    ensureTeacherEligible(user);

    if (
      user.emailVerified &&
      user.firstLoginCompleted &&
      user.status === USER_STATUS.ACTIVE
    ) {
      throw new ApiError(
        400,
        "Account is already verified. Please log in normally."
      );
    }

    try {
      await generateAndSendOtp(
        user,
        OTP_PURPOSES.FIRST_LOGIN
      );
    } catch {
      throw new ApiError(
        503,
        "Unable to send the verification code. Please try again later."
      );
    }

    return {
      success: true,
      message:
        "Verification code sent to your registered email.",
    };
  };

/* ============================================================
   TEACHER - VERIFY OTP
============================================================ */

export const verifyTeacherOtpService =
  async (email, otp) => {
    const normalizedEmail =
      normalizeEmail(email);

    const result =
      await verifyOtp(
        normalizedEmail,
        otp,
        OTP_PURPOSES.FIRST_LOGIN
      );

    const user =
      await User.findOne({
        _id: result.userId,
        isDeleted: false,
      }).exec();

    ensureTeacherEligible(user);

    if (user.firstLoginCompleted) {
      throw new ApiError(
        409,
        "First-login setup has already been completed."
      );
    }

    user.emailVerified = true;
    user.status =
      USER_STATUS.PENDING_VERIFICATION;

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

/* ============================================================
   TEACHER - COMPLETE FIRST LOGIN
============================================================ */

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
      })
        .select("+password")
        .exec();

    if (!user) {
      throw new ApiError(
        404,
        "User account not found."
      );
    }

    if (user.role !== ROLES.TEACHER) {
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

    /*
     * User model pre-save hook hashes this password.
     */
    user.password = newPassword;
    user.emailVerified = true;
    user.firstLoginCompleted = true;
    user.status = USER_STATUS.ACTIVE;
    user.isActive = true;
    user.lastLogin = new Date();

    await user.save();

    /*
     * A setup flow must invalidate all previously
     * issued refresh sessions.
     */
    await revokeAllUserRefreshSessions(
      user._id
    );

    /*
     * Email notification is best-effort.
     * Account setup should not fail because SMTP is down.
     */
    try {
      await sendPasswordChangedNotificationEmail({
        to: user.email,
        name: user.name,
      });
    } catch {
      // Intentionally ignored.
    }

    /*
     * IMPORTANT:
     * Return both access and refresh tokens if the
     * controller expects automatic login after setup.
     */
    const accessToken =
      generateAccessToken(user);

    const refreshToken =
      generateRefreshToken(user);

    const tokenHash =
      hashToken(refreshToken);

    await RefreshSession.create({
      userId: user._id,
      tokenHash,
      expiresAt: getRefreshExpiration(),
    });

    return {
      message:
        "Account setup completed successfully.",
      token: accessToken,
      refreshToken,
      user: buildUser(user),
    };
  };

/* ============================================================
   CHANGE PASSWORD
============================================================ */

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
      typeof currentPassword !== "string" ||
      !currentPassword
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
      currentPassword === newPassword
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
      })
        .select("+password")
        .exec();

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

    /*
     * Password change invalidates every refresh session.
     */
    await revokeAllUserRefreshSessions(
      user._id
    );

    try {
      await sendPasswordChangedNotificationEmail({
        to: user.email,
        name: user.name,
      });
    } catch {
      // Notification failure must not fail password change.
    }

    return {
      message:
        "Password changed successfully. Please log in again.",
    };
  };

/* ============================================================
   FORGOT PASSWORD - REQUEST OTP
============================================================ */

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
      }).exec();

    /*
     * Never reveal whether an account exists.
     */
    if (
      !user ||
      !user.isActive ||
      user.status !== USER_STATUS.ACTIVE
    ) {
      return genericResponse;
    }

    try {
      await generateAndSendOtp(
        user,
        OTP_PURPOSES.PASSWORD_RESET
      );
    } catch {
      /*
       * Still return the generic response.
       */
    }

    return genericResponse;
  };

/* ============================================================
   FORGOT PASSWORD - VERIFY OTP
============================================================ */

export const verifyForgotPasswordOtpService =
  async (email, otp) => {
    const normalizedEmail =
      normalizeEmail(email);

    const result =
      await verifyOtp(
        normalizedEmail,
        otp,
        OTP_PURPOSES.PASSWORD_RESET
      );

    const user =
      await User.findOne({
        _id: result.userId,
        isDeleted: false,
      }).exec();

    ensureActiveUser(user);

    const resetToken =
      generateResetToken(user);

    return {
      message:
        "OTP verified successfully. You may now reset your password.",
      resetToken,
    };
  };

/* ============================================================
   FORGOT PASSWORD - RESET
============================================================ */

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
      })
        .select("+password")
        .exec();

    ensureActiveUser(user);

    /*
     * Reset token becomes invalid after passwordChangedAt
     * moves past the token's issued-at time.
     */
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

    /*
     * Kill every existing authenticated session.
     */
    await revokeAllUserRefreshSessions(
      user._id
    );

    try {
      await sendPasswordChangedNotificationEmail({
        to: user.email,
        name: user.name,
      });
    } catch {
      // Notification failure must not fail password reset.
    }

    return {
      message:
        "Password reset successfully. Please log in with your new password.",
    };
  };

/* ============================================================
   GET CURRENT USER
============================================================ */

export const getMeService =
  async (userId) => {
    const validUserId =
      validateUserId(userId);

    const user =
      await User.findOne({
        _id: validUserId,
        isDeleted: false,
      })
        .select(
          "name email role status isActive emailVerified firstLoginCompleted avatar profile lastLogin createdAt updatedAt"
        )
        .lean()
        .exec();

    ensureActiveUser(user);

    return buildUser(user);
  };

/* ============================================================
   VALIDATE USER FROM ACCESS TOKEN
============================================================ */

export const validateUserFromToken =
  async (userId) => {
    const validUserId =
      validateUserId(userId);

    /*
     * Authentication middleware only needs a small
     * projection, not the complete User document.
     *
     * This reduces MongoDB payload and object creation
     * on every protected request.
     */
    const user =
      await User.findOne({
        _id: validUserId,
        isDeleted: false,
      })
        .select(
          "name email role status isActive emailVerified firstLoginCompleted avatar profile lastLogin createdAt updatedAt"
        )
        .lean()
        .exec();

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

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ApiError(
        403,
        "Account is not active."
      );
    }

    return buildUser(user);
  };

/* ============================================================
   UPDATE PROFILE
============================================================ */

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
      }).exec();

    ensureActiveUser(user);

    /* --------------------------------------------------------
       NAME
    -------------------------------------------------------- */

    if (data.name !== undefined) {
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

    /* --------------------------------------------------------
       AVATAR
    -------------------------------------------------------- */

    if (data.avatar !== undefined) {
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

    /* --------------------------------------------------------
       PROFILE
    -------------------------------------------------------- */

    if (data.profile !== undefined) {
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

    /* --------------------------------------------------------
       EMAIL
    -------------------------------------------------------- */

    if (data.email !== undefined) {
      const newEmail =
        normalizeEmail(data.email);

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
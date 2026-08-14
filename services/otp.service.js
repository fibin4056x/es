import crypto from "crypto";
import bcrypt from "bcryptjs";

import OtpModel from "../models/otp.model.js";
import User from "../models/user.model.js";

import ApiError from "../utils/ApiError.js";

import {
  sendTeacherVerificationOtpEmail,
  sendForgotPasswordOtpEmail,
} from "./email.service.js";

// ============================================================
// CONFIGURATION
// ============================================================

const OTP_LENGTH = 6;
const OTP_EXPIRATION_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

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

  const normalized = email.trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new ApiError(400, "Invalid email address.");
  }

  return normalized;
};

const validateOtp = (otp) => {
  if (typeof otp !== "string") {
    throw new ApiError(400, "OTP is required.");
  }

  const cleanOtp = otp.trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    throw new ApiError(
      400,
      "OTP must be exactly 6 digits."
    );
  }

  return cleanOtp;
};

const validatePurpose = (purpose) => {
  if (!Object.values(OTP_PURPOSES).includes(purpose)) {
    throw new ApiError(400, "Invalid OTP purpose.");
  }
};

const generateOtp = () => {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
};

// ============================================================
// GENERATE AND SEND OTP
// ============================================================

export const generateAndSendOtp = async (
  user,
  purpose
) => {
  if (!user?._id || !user?.email) {
    throw new ApiError(
      400,
      "Valid user is required."
    );
  }

  validatePurpose(purpose);

  const email = normalizeEmail(user.email);

  const now = new Date();

  // ----------------------------------------------------------
  // RESEND COOLDOWN
  // ----------------------------------------------------------

  const latestOtp = await OtpModel.findOne({
    userId: user._id,
    purpose,
    isConsumed: false,
    expiresAt: {
      $gt: now,
    },
  })
    .sort({ createdAt: -1 })
    .select("lastSentAt");

  if (latestOtp?.lastSentAt) {
    const elapsed =
      Date.now() -
      latestOtp.lastSentAt.getTime();

    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - elapsed) /
          1000
      );

      throw new ApiError(
        429,
        `Please wait ${remainingSeconds} seconds before requesting another OTP.`
      );
    }
  }

  // ----------------------------------------------------------
  // INVALIDATE PREVIOUS OTPs
  // ----------------------------------------------------------

  await OtpModel.updateMany(
    {
      userId: user._id,
      purpose,
      isConsumed: false,
    },
    {
      $set: {
        isConsumed: true,
        consumedAt: now,
      },
    }
  );

  // ----------------------------------------------------------
  // GENERATE OTP
  // ----------------------------------------------------------

  const rawOtp = generateOtp();

  const otpHash = await bcrypt.hash(
    rawOtp,
    BCRYPT_ROUNDS
  );

  const expiresAt = new Date(
    Date.now() + OTP_EXPIRATION_MS
  );

  // ----------------------------------------------------------
  // CREATE OTP RECORD
  // ----------------------------------------------------------

  const otpRecord = await OtpModel.create({
    userId: user._id,
    email,
    purpose,
    otpHash,
    expiresAt,
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    lastSentAt: now,
    isConsumed: false,
  });

  // ----------------------------------------------------------
  // SEND EMAIL
  // ----------------------------------------------------------

  try {
    if (purpose === OTP_PURPOSES.FIRST_LOGIN) {
      await sendTeacherVerificationOtpEmail({
        to: email,
        name: user.name,
        otp: rawOtp,
      });
    } else if (
      purpose === OTP_PURPOSES.PASSWORD_RESET
    ) {
      await sendForgotPasswordOtpEmail({
        to: email,
        name: user.name,
        otp: rawOtp,
      });
    }
  } catch (error) {
    // Invalidate only the OTP created by this request.
    await OtpModel.updateOne(
      {
        _id: otpRecord._id,
        isConsumed: false,
      },
      {
        $set: {
          isConsumed: true,
          consumedAt: new Date(),
        },
      }
    );

    throw new ApiError(
      500,
      "Unable to send verification email. Please try again."
    );
  }

  return {
    success: true,
    message:
      "Verification code sent to your registered email.",
  };
};

// ============================================================
// VERIFY OTP
// ============================================================

export const verifyOtp = async (
  email,
  otp,
  purpose
) => {
  const cleanEmail = normalizeEmail(email);
  const cleanOtp = validateOtp(otp);

  validatePurpose(purpose);

  const now = new Date();

  // ----------------------------------------------------------
  // ATOMIC ATTEMPT INCREMENT
  // ----------------------------------------------------------
  //
  // The query itself guarantees that attempts cannot exceed
  // the configured maximum even under concurrent requests.
  //

  const otpRecord =
    await OtpModel.findOneAndUpdate(
      {
        email: cleanEmail,
        purpose,
        isConsumed: false,
        expiresAt: {
          $gt: now,
        },
        $expr: {
          $lt: ["$attempts", "$maxAttempts"],
        },
      },
      {
        $inc: {
          attempts: 1,
        },
      },
      {
        new: true,
      }
    ).select("+otpHash");

  if (!otpRecord) {
    // Determine whether an OTP exists but has exceeded attempts.
    const exhaustedOtp =
      await OtpModel.findOne({
        email: cleanEmail,
        purpose,
        isConsumed: false,
        expiresAt: {
          $gt: new Date(),
        },
        $expr: {
          $gte: ["$attempts", "$maxAttempts"],
        },
      }).select("_id");

    if (exhaustedOtp) {
      await OtpModel.updateOne(
        {
          _id: exhaustedOtp._id,
          isConsumed: false,
        },
        {
          $set: {
            isConsumed: true,
            consumedAt: new Date(),
          },
        }
      );

      throw new ApiError(
        429,
        "Maximum verification attempts exceeded. Please request a new OTP."
      );
    }

    throw new ApiError(
      400,
      "Invalid or expired verification code."
    );
  }

  // ----------------------------------------------------------
  // COMPARE OTP
  // ----------------------------------------------------------

  if (!otpRecord.otpHash) {
    throw new ApiError(
      400,
      "Invalid verification code."
    );
  }

  const isValid = await bcrypt.compare(
    cleanOtp,
    otpRecord.otpHash
  );

  if (!isValid) {
    throw new ApiError(
      400,
      "Invalid verification code."
    );
  }

  // ----------------------------------------------------------
  // ATOMIC OTP CONSUMPTION
  // ----------------------------------------------------------
  //
  // Prevents two concurrent requests from successfully using
  // the same OTP.
  //

  const consumed =
    await OtpModel.findOneAndUpdate(
      {
        _id: otpRecord._id,
        isConsumed: false,
      },
      {
        $set: {
          isConsumed: true,
          consumedAt: new Date(),
        },
      },
      {
        new: true,
      }
    ).select("userId");

  if (!consumed) {
    throw new ApiError(
      400,
      "Verification code has already been used."
    );
  }

  return {
    success: true,
    userId: consumed.userId,
  };
};

// ============================================================
// INVALIDATE USER OTPs
// ============================================================

export const invalidateUserOtps = async (
  userId,
  purpose = null
) => {
  if (!userId) {
    throw new ApiError(
      400,
      "User ID is required."
    );
  }

  const query = {
    userId,
    isConsumed: false,
  };

  if (purpose) {
    validatePurpose(purpose);
    query.purpose = purpose;
  }

  await OtpModel.updateMany(
    query,
    {
      $set: {
        isConsumed: true,
        consumedAt: new Date(),
      },
    }
  );
};

// ============================================================
// FIND USER FOR OTP FLOW
// ============================================================

export const findUserByEmailForOtp = async (
  email
) => {
  const cleanEmail = normalizeEmail(email);

  return User.findOne({
    email: cleanEmail,
    isDeleted: false,
  });
};
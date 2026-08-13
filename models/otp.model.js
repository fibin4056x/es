import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      immutable: true,
      index: true,
    },

    purpose: {
      type: String,
      enum: ["FIRST_LOGIN", "PASSWORD_RESET"],
      required: true,
      immutable: true,
      index: true,
    },

    // Never store the plaintext OTP.
    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    maxAttempts: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
      immutable: true,
    },

    lastSentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    isConsumed: {
      type: Boolean,
      default: false,
      index: true,
    },

    consumedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  }
);

// OTP automatically disappears after expiration.
otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Main verification lookup.
otpSchema.index({
  email: 1,
  purpose: 1,
  isConsumed: 1,
  expiresAt: 1,
});

// User + purpose lookup for invalidating old OTPs.
otpSchema.index({
  userId: 1,
  purpose: 1,
  isConsumed: 1,
});

const OtpModel = mongoose.model("Otp", otpSchema);

export default OtpModel;
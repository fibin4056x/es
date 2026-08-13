import mongoose from "mongoose";

/* ============================================================
   REFRESH SESSION SCHEMA
   ============================================================ */

const refreshSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    // Hashed refresh token to prevent database leak compromise
    tokenHash: {
      type: String,
      required: [true, "Token hash is required"],
      unique: true,
      index: true,
    },

    ipAddress: {
      type: String,
      default: null,
      trim: true,
    },

    userAgent: {
      type: String,
      default: null,
      trim: true,
    },

    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
      index: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    replacedByTokenHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ============================================================
   INDEXES & TTL
   ============================================================ */

// Automatic cleanup of expired sessions by MongoDB
refreshSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Fast session lookup for active user sessions
refreshSessionSchema.index({
  userId: 1,
  isRevoked: 1,
});

/* ============================================================
   METHODS & STATICS
   ============================================================ */

refreshSessionSchema.methods.isSessionValid = function () {
  return !this.isRevoked && this.expiresAt > new Date();
};

const RefreshSession = mongoose.model(
  "RefreshSession",
  refreshSessionSchema
);

export default RefreshSession;
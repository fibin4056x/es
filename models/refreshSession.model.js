import mongoose from "mongoose";

const refreshSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // SHA-256 hash.
    // Raw refresh tokens are NEVER stored.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      select: false,
    },

    ipAddress: {
      type: String,
      trim: true,
      maxlength: 64,
      default: null,
    },

    userAgent: {
      type: String,
      trim: true,
      maxlength: 1024,
      default: null,
    },

    isRevoked: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    replacedByTokenHash: {
      type: String,
      default: null,
      trim: true,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ============================================================
// INDEXES
// ============================================================

// MongoDB automatically removes expired sessions.
refreshSessionSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
  }
);

// Used by:
// logout
// refresh rotation
// session management
refreshSessionSchema.index({
  userId: 1,
  isRevoked: 1,
});

// ============================================================
// METHODS
// ============================================================

refreshSessionSchema.methods.isSessionValid = function () {
  return (
    this.isRevoked === false &&
    this.expiresAt.getTime() > Date.now()
  );
};

// ============================================================
// MODEL
// ============================================================

const RefreshSession = mongoose.model(
  "RefreshSession",
  refreshSessionSchema
);

export default RefreshSession;
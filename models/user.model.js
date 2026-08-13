import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "./constants/role.js";

// ============================================================
// CONSTANTS
// ============================================================

const PASSWORD_SALT_ROUNDS = 12;

const USER_STATUSES = Object.freeze([
  "active",
  "inactive",
  "suspended",
  "leave",
  "pending_verification",
]);

// ============================================================
// USER SCHEMA
// ============================================================

const userSchema = new mongoose.Schema(
  {
    // ==========================================================
    // BASIC INFORMATION
    // ==========================================================

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      match: [
        /^\S+@\S+\.\S+$/,
        "Invalid email format",
      ],
    },

    avatar: {
      type: String,
      default: null,
      trim: true,
      maxlength: [2048, "Avatar URL is too long"],
    },

    // ==========================================================
    // AUTHENTICATION
    // ==========================================================

    password: {
      type: String,
      select: false,
      default: null,
    },

    // ==========================================================
    // ACCOUNT STATE
    // ==========================================================

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: USER_STATUSES,
        message: "Invalid user status",
      },
      default: "active",
      lowercase: true,
      trim: true,
      index: true,
    },

    // ==========================================================
    // EMAIL / FIRST LOGIN
    // ==========================================================

    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    firstLoginCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ==========================================================
    // ACCESS CONTROL
    // ==========================================================

    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: "Invalid user role",
      },
      required: [true, "User role is required"],
      index: true,
    },

    // ==========================================================
    // PROFILE
    // ==========================================================

    profile: {
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        default: null,
      },

      dob: {
        type: Date,
        default: null,
      },
    },

    // ==========================================================
    // ACTIVITY
    // ==========================================================

    lastLogin: {
      type: Date,
      default: null,
    },

    // ==========================================================
    // SECURITY
    // ==========================================================

    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

// Email:
//
// `unique: true` on the email field already creates
// the required unique index.
//
// Do NOT create another email index.

// ------------------------------------------------------------
// ROLE + STATUS
// ------------------------------------------------------------

userSchema.index({
  role: 1,
  status: 1,
});

// ------------------------------------------------------------
// ACTIVE / NON-DELETED USERS
// ------------------------------------------------------------

userSchema.index({
  isDeleted: 1,
  isActive: 1,
});

// ------------------------------------------------------------
// USER LISTING
// ------------------------------------------------------------

userSchema.index({
  createdAt: -1,
});

// ============================================================
// PASSWORD HASHING
// ============================================================
//
// Passwords are hashed automatically whenever the password
// field is created or modified.
//
// Important:
// password is already select:false, so normal queries do not
// return the hash.
//
// ============================================================

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  try {
    this.password = await bcrypt.hash(
      this.password,
      PASSWORD_SALT_ROUNDS
    );

    this.passwordChangedAt = new Date();

    return next();
  } catch (error) {
    return next(error);
  }
});

// ============================================================
// SAFE JSON SERIALIZATION
// ============================================================

userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  // Never expose password hashes.
  delete obj.password;

  // Defensive removal.
  delete obj.__v;

  return obj;
};

// ============================================================
// PASSWORD COMPARISON
// ============================================================

userSchema.methods.comparePassword = async function (
  candidatePassword
) {
  if (
    typeof candidatePassword !== "string" ||
    !candidatePassword ||
    !this.password
  ) {
    return false;
  }

  return bcrypt.compare(
    candidatePassword,
    this.password
  );
};

// ============================================================
// ACCOUNT STATE
// ============================================================

userSchema.methods.isAccountUsable = function () {
  return (
    this.isDeleted === false &&
    this.isActive === true &&
    this.status === "active"
  );
};

// ============================================================
// FIRST LOGIN CHECK
// ============================================================

userSchema.methods.isFirstLoginRequired = function () {
  return (
    this.role === ROLES.TEACHER &&
    (
      this.emailVerified === false ||
      this.firstLoginCompleted === false ||
      this.status === "pending_verification"
    )
  );
};

// ============================================================
// MODEL
// ============================================================

const User = mongoose.model("User", userSchema);

export default User;
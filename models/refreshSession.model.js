import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "./constants/role.js";

const userSchema = new mongoose.Schema(
  {
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
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    avatar: {
      type: String,
      default: null,
      trim: true,
    },

    password: {
      type: String,
      select: false,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "suspended",
        "leave",
        "pending_verification",
      ],
      default: "active",
      lowercase: true,
      trim: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    firstLoginCompleted: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: "Invalid user role",
      },
      required: [true, "User role is required"],
    },

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

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
  }
);

// Authentication lookup
userSchema.index({ email: 1 }, { unique: true });

// User management
userSchema.index({ role: 1, status: 1 });

// Soft-delete filtering
userSchema.index({ isDeleted: 1, isActive: 1 });

// Password hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison
userSchema.methods.comparePassword = function (candidatePassword) {
  if (!this.password || !candidatePassword) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

// Account usability
userSchema.methods.isAccountUsable = function () {
  return (
    !this.isDeleted &&
    this.isActive &&
    this.status === "active"
  );
};

// Teacher first-login check
userSchema.methods.isFirstLoginRequired = function () {
  return (
    this.role === ROLES.TEACHER &&
    (!this.emailVerified || !this.firstLoginCompleted)
  );
};

// Never expose sensitive fields
userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  delete obj.password;
  delete obj.__v;

  return obj;
};

const User = mongoose.model("User", userSchema);

export default User;
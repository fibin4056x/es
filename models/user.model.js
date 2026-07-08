import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "./constants/role.js";

const userSchema = new mongoose.Schema(
  {
    // ================= BASIC =================
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      index: true,
    },

    avatar: {
      type: String,
      default: null,
    },

    // ================= AUTH =================
    password: {
      type: String,
      select: false,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    setupToken: {
      type: String,
      select: false,
    },

    setupTokenExpire: {
      type: Date,
      select: false,
    },

    // ================= ACCESS =================
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },

    // ================= PROFILE =================
    profile: {
      gender: {
        type: String,
        enum: ["male", "female", "other"],
      },
      dob: {
        type: Date,
      },
    },

    // ================= ACTIVITY =================
    lastLogin: {
      type: Date,
      default: null,
    },

    // ================= SOFT DELETE =================
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ================= INDEXES =================
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ setupToken: 1 });

// ================= PASSWORD HASH =================
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

// ================= SAFE RESPONSE =================
userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  delete obj.password;
  delete obj.setupToken;
  delete obj.setupTokenExpire;
  delete obj.__v;

  return obj;
};

export default mongoose.model("User", userSchema);
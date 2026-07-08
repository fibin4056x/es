import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import { generateToken } from "../validations/auth.tokens.js";

/* ==================================================
   HELPERS (unchanged)
================================================== */
const buildUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
});

/* ==================================================
   LOGIN (same logic, cleaned)
================================================== */
export const loginService = async ({ email, password }) => {
  email = email?.trim().toLowerCase();
  password = password?.trim();

  if (!email || !password) {
    throw new ApiError(400, "Email and password required");
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || user.isDeleted) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account not activated");
  }

  if (user.status !== "active") {
    throw new ApiError(403, "Account is not active");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user);

  return {
    message: "Login successful",
    token,
    user: buildUser(user),
  };
};

/* ==================================================
   GET ME
================================================== */
export const getMeService = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return buildUser(user);
};

/* ==================================================
   validate
================================================== */
export const validateUserFromToken = async (userId) => {
  const user = await User.findById(userId);

  if (!user || user.isDeleted) {
    throw new ApiError(401, "User not found");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account not activated");
  }

  if (user.status !== "active") {
    throw new ApiError(403, "Account is not active");
  }

  return buildUser(user);
};


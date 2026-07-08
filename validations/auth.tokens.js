import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ENV.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("TOKEN_EXPIRED");
    }

    if (error.name === "JsonWebTokenError") {
      throw new Error("INVALID_TOKEN");
    }

    throw error;
  }
};
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    ENV.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};
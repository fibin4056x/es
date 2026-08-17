import jwt from "jsonwebtoken";
import crypto from "crypto";

import { ENV } from "../config/env.js";

// ============================================================
// TOKEN TYPES
// ============================================================

export const TOKEN_TYPES = Object.freeze({
  ACCESS: "access",
  REFRESH: "refresh",
  SETUP: "setup",
  RESET: "reset",
});

// ============================================================
// CONFIGURATION
// ============================================================

const TOKEN_CONFIG = Object.freeze({
  [TOKEN_TYPES.ACCESS]: {
    secret: ENV.JWT_ACCESS_SECRET,
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN,
  },

  [TOKEN_TYPES.REFRESH]: {
    secret: ENV.JWT_REFRESH_SECRET,
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
  },

  [TOKEN_TYPES.SETUP]: {
    secret: ENV.JWT_SETUP_SECRET,
    expiresIn: ENV.JWT_SETUP_EXPIRES_IN,
  },

  [TOKEN_TYPES.RESET]: {
    secret: ENV.JWT_RESET_SECRET,
    expiresIn: ENV.JWT_RESET_EXPIRES_IN,
  },
});

const JWT_ISSUER = ENV.JWT_ISSUER;
const JWT_AUDIENCE = ENV.JWT_AUDIENCE;

// ============================================================
// VALIDATION
// ============================================================

const validateSecret = (secret, name) => {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error(`${name} must be at least 32 characters long.`);
  }
};

const validateGlobalConfig = () => {
  if (!JWT_ISSUER) {
    throw new Error("JWT issuer is not configured.");
  }

  if (!JWT_AUDIENCE) {
    throw new Error("JWT audience is not configured.");
  }
};

const getTokenConfig = (type) => {
  const config = TOKEN_CONFIG[type];

  if (!config) {
    throw new Error("Invalid token type.");
  }

  validateSecret(
    config.secret,
    `${type.toUpperCase()} JWT secret`
  );

  if (!config.expiresIn) {
    throw new Error(
      `${type.toUpperCase()} token expiration is not configured.`
    );
  }

  return config;
};

const validateUser = (user) => {
  if (!user?._id) {
    throw new Error("User ID is required.");
  }

  if (
    typeof user.role !== "string" ||
    !user.role.trim()
  ) {
    throw new Error("User role is required.");
  }
};

// ============================================================
// SIGN TOKEN
// ============================================================

const signToken = ({ user, type }) => {
  validateUser(user);
  validateGlobalConfig();

  const { secret, expiresIn } = getTokenConfig(type);

  const userId = user._id.toString();

  return jwt.sign(
    {
      sub: userId,
      role: user.role,
      type,
    },
    secret,
    {
      expiresIn,
      jwtid: crypto.randomUUID(),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithm: "HS256",
    }
  );
};

// ============================================================
// GENERATORS
// ============================================================

export const generateAccessToken = (user) =>
  signToken({
    user,
    type: TOKEN_TYPES.ACCESS,
  });

export const generateRefreshToken = (user) =>
  signToken({
    user,
    type: TOKEN_TYPES.REFRESH,
  });

export const generateSetupToken = (user) =>
  signToken({
    user,
    type: TOKEN_TYPES.SETUP,
  });

export const generateResetToken = (user) =>
  signToken({
    user,
    type: TOKEN_TYPES.RESET,
  });

// ============================================================
// VERIFY TOKEN
// ============================================================

const verifyToken = (token, expectedType) => {
  if (
    typeof token !== "string" ||
    !token.trim()
  ) {
    throw new Error("TOKEN_MISSING");
  }

  validateGlobalConfig();

  const { secret } = getTokenConfig(expectedType);

  let decoded;

  try {
    decoded = jwt.verify(
      token.trim(),
      secret,
      {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        algorithms: ["HS256"],
      }
    );
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      throw new Error("TOKEN_EXPIRED");
    }

    if (
      error?.name === "JsonWebTokenError" ||
      error?.name === "NotBeforeError"
    ) {
      throw new Error("INVALID_TOKEN");
    }

    throw new Error("TOKEN_VERIFICATION_FAILED");
  }

  if (
    !decoded ||
    typeof decoded !== "object"
  ) {
    throw new Error("INVALID_TOKEN_PAYLOAD");
  }

  if (
    typeof decoded.sub !== "string" ||
    typeof decoded.role !== "string" ||
    typeof decoded.type !== "string" ||
    typeof decoded.jti !== "string"
  ) {
    throw new Error("INVALID_TOKEN_PAYLOAD");
  }

  if (decoded.type !== expectedType) {
    throw new Error("INVALID_TOKEN_TYPE");
  }

  return decoded;
};

// ============================================================
// PUBLIC VERIFIERS
// ============================================================

export const verifyAccessToken = (token) =>
  verifyToken(
    token,
    TOKEN_TYPES.ACCESS
  );

export const verifyRefreshToken = (token) =>
  verifyToken(
    token,
    TOKEN_TYPES.REFRESH
  );

export const verifySetupToken = (token) =>
  verifyToken(
    token,
    TOKEN_TYPES.SETUP
  );

export const verifyResetToken = (token) =>
  verifyToken(
    token,
    TOKEN_TYPES.RESET
  );
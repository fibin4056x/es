import jwt from "jsonwebtoken";
import crypto from "crypto";

import { ENV } from "../config/env.js";

export const TOKEN_TYPES = Object.freeze({
  ACCESS: "access",
  SETUP: "setup",
  RESET: "reset",
});

const TOKEN_EXPIRATION = Object.freeze({
  ACCESS: ENV.JWT_ACCESS_EXPIRES_IN,
  SETUP: ENV.JWT_SETUP_EXPIRES_IN,
  RESET: ENV.JWT_RESET_EXPIRES_IN,
});

const TOKEN_SECRETS = Object.freeze({
  ACCESS: ENV.JWT_ACCESS_SECRET,
  SETUP: ENV.JWT_SETUP_SECRET,
  RESET: ENV.JWT_RESET_SECRET,
});

const JWT_ISSUER = ENV.JWT_ISSUER;
const JWT_AUDIENCE = ENV.JWT_AUDIENCE;

const validateSecret = (secret, name) => {
  if (
    typeof secret !== "string" ||
    secret.length < 32
  ) {
    throw new Error(
      `${name} must be at least 32 characters long.`
    );
  }
};

const validateUser = (user) => {
  if (!user?._id) {
    throw new Error("User ID is required.");
  }

  if (
    typeof user.role !== "string" ||
    !user.role
  ) {
    throw new Error("User role is required.");
  }
};

const signToken = ({
  user,
  type,
  expiresIn,
  secret,
}) => {
  validateUser(user);

  if (!type) {
    throw new Error("Token type is required.");
  }

  if (!expiresIn) {
    throw new Error(
      "Token expiration is not configured."
    );
  }

  validateSecret(secret, "JWT secret");

  if (!JWT_ISSUER) {
    throw new Error(
      "JWT issuer is not configured."
    );
  }

  if (!JWT_AUDIENCE) {
    throw new Error(
      "JWT audience is not configured."
    );
  }

  const userId = user._id.toString();

  return jwt.sign(
    {
      sub: userId,
      id: userId,
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
// ACCESS TOKEN
// ============================================================

export const generateAccessToken = (user) => {
  return signToken({
    user,
    type: TOKEN_TYPES.ACCESS,
    expiresIn: TOKEN_EXPIRATION.ACCESS,
    secret: TOKEN_SECRETS.ACCESS,
  });
};

// ============================================================
// TEACHER SETUP TOKEN
// ============================================================

export const generateSetupToken = (user) => {
  return signToken({
    user,
    type: TOKEN_TYPES.SETUP,
    expiresIn: TOKEN_EXPIRATION.SETUP,
    secret: TOKEN_SECRETS.SETUP,
  });
};

// ============================================================
// PASSWORD RESET TOKEN
// ============================================================

export const generateResetToken = (user) => {
  return signToken({
    user,
    type: TOKEN_TYPES.RESET,
    expiresIn: TOKEN_EXPIRATION.RESET,
    secret: TOKEN_SECRETS.RESET,
  });
};

// ============================================================
// VERIFY TOKEN
// ============================================================

const verifyToken = (
  token,
  expectedType,
  secret
) => {
  if (
    typeof token !== "string" ||
    !token.trim()
  ) {
    throw new Error("TOKEN_MISSING");
  }

  validateSecret(secret, "JWT secret");

  if (!JWT_ISSUER || !JWT_AUDIENCE) {
    throw new Error(
      "JWT issuer and audience must be configured."
    );
  }

  let decoded;

  try {
    decoded = jwt.verify(
      token,
      secret,
      {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        algorithms: ["HS256"],
      }
    );
  } catch (error) {
    if (
      error?.name === "TokenExpiredError"
    ) {
      throw new Error("TOKEN_EXPIRED");
    }

    if (
      error?.name === "JsonWebTokenError" ||
      error?.name === "NotBeforeError"
    ) {
      throw new Error("INVALID_TOKEN");
    }

    throw error;
  }

  if (
    !decoded ||
    typeof decoded !== "object"
  ) {
    throw new Error(
      "INVALID_TOKEN_PAYLOAD"
    );
  }

  if (
    typeof decoded.sub !== "string" ||
    typeof decoded.id !== "string" ||
    typeof decoded.role !== "string" ||
    typeof decoded.type !== "string" ||
    typeof decoded.jti !== "string"
  ) {
    throw new Error(
      "INVALID_TOKEN_PAYLOAD"
    );
  }

  if (decoded.sub !== decoded.id) {
    throw new Error(
      "INVALID_TOKEN_PAYLOAD"
    );
  }

  if (decoded.type !== expectedType) {
    throw new Error(
      "INVALID_TOKEN_TYPE"
    );
  }

  return decoded;
};

// ============================================================
// VERIFY ACCESS TOKEN
// ============================================================

export const verifyAccessToken = (token) => {
  return verifyToken(
    token,
    TOKEN_TYPES.ACCESS,
    TOKEN_SECRETS.ACCESS
  );
};

// ============================================================
// VERIFY SETUP TOKEN
// ============================================================

export const verifySetupToken = (token) => {
  return verifyToken(
    token,
    TOKEN_TYPES.SETUP,
    TOKEN_SECRETS.SETUP
  );
};

// ============================================================
// VERIFY RESET TOKEN
// ============================================================

export const verifyResetToken = (token) => {
  return verifyToken(
    token,
    TOKEN_TYPES.RESET,
    TOKEN_SECRETS.RESET
  );
};
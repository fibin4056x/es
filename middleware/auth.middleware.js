import ApiError from "../utils/ApiError.js";
import {
  verifyAccessToken,
} from "../validations/auth.tokens.js";

import {
  validateUserFromToken,
} from "../services/auth.service.js";

// ============================================================
// GET ACCESS TOKEN
// ============================================================

const getAccessToken = (req) => {
  const authorization = req.headers.authorization;

  // Authorization header
  if (
    typeof authorization === "string" &&
    authorization.startsWith("Bearer ")
  ) {
    const token = authorization
      .slice(7)
      .trim();

    if (token) {
      return token;
    }
  }

  // HttpOnly cookie
  const cookieToken =
    req.cookies?.accessToken;

  if (
    typeof cookieToken === "string" &&
    cookieToken.trim()
  ) {
    return cookieToken.trim();
  }

  return null;
};

// ============================================================
// AUTHENTICATE
// ============================================================

export const authenticate = async (
  req,
  res,
  next
) => {
  try {
    const token = getAccessToken(req);

    if (!token) {
      throw new ApiError(
        401,
        "Authentication required."
      );
    }

    let decoded;

    try {
      decoded =
        verifyAccessToken(token);
    } catch (error) {
      switch (error?.message) {
        case "TOKEN_EXPIRED":
          throw new ApiError(
            401,
            "Access token expired."
          );

        case "TOKEN_MISSING":
        case "INVALID_TOKEN":
        case "INVALID_TOKEN_PAYLOAD":
        case "INVALID_TOKEN_TYPE":
          throw new ApiError(
            401,
            "Invalid authentication token."
          );

        default:
          throw new ApiError(
            401,
            "Authentication failed."
          );
      }
    }

    if (!decoded?.sub) {
      throw new ApiError(
        401,
        "Invalid authentication token."
      );
    }

    /*
     * Validate that the account still exists
     * and is active.
     */
    const user =
      await validateUserFromToken(
        decoded.sub
      );

    req.user = user;

    return next();
  } catch (error) {
    return next(error);
  }
};
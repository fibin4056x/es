import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../validations/auth.tokens.js";
import { validateUserFromToken } from "../services/auth.service.js";

const getBearerToken = (req) => {
  // 1. Check Authorization: Bearer header (Primary for SPA / cross-domain)
  const authorization = req.headers.authorization;
  if (
    typeof authorization === "string" &&
    authorization.startsWith("Bearer ")
  ) {
    const token = authorization.slice(7).trim();
    if (token) return token;
  }

  // 2. Check HttpOnly cookie accessToken
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  // 3. Check HttpOnly cookie token
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
};

export const authenticate = async (
  req,
  res,
  next
) => {
  try {
    const token =
      getBearerToken(req);

    if (!token) {
      throw new ApiError(
        401,
        "Authentication required."
      );
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.message === "TOKEN_EXPIRED" || err.name === "TokenExpiredError") {
        throw new ApiError(401, "Access token expired.");
      }
      throw new ApiError(401, err.message || "Invalid authentication token.");
    }

    if (!decoded?.sub) {
      throw new ApiError(
        401,
        "Invalid authentication token."
      );
    }

    const user =
      await validateUserFromToken(
        decoded.sub
      );

    if (!user) {
      throw new ApiError(
        401,
        "Authentication required."
      );
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
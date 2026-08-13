import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../validations/auth.tokens.js";
import { validateUserFromToken } from "../services/auth.service.js";

const getBearerToken = (req) => {
  const authorization = req.headers.authorization;

  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ")
  ) {
    return null;
  }

  const token = authorization.slice(7).trim();

  return token || null;
};

export const authenticate = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw new ApiError(401, "Authentication required.");
    }

    const decoded = verifyAccessToken(token);

    const user = await validateUserFromToken(decoded.sub);

    if (!user) {
      throw new ApiError(401, "Authentication required.");
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
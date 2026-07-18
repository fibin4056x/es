import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../validations/auth.tokens.js";
import { validateUserFromToken } from "../services/auth.service.js";

/* ==================================================
   EXTRACT BEARER TOKEN
================================================== */
const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;

  if (
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    return authHeader.slice(7).trim();
  }

  return null;
};

/* ==================================================
   AUTHENTICATE USER
================================================== */
export const authenticate = async (
  req,
  res,
  next
) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw new ApiError(
        401,
        "Access token missing"
      );
    }

    const decoded = verifyAccessToken(token);

    const user = await validateUserFromToken(
      decoded.id
    );

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
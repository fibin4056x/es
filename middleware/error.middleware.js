import ApiError from "../utils/ApiError.js";

/**
 * Global error handler.
 *
 * Important:
 * - Never expose stack traces in API responses.
 * - Keep production errors generic.
 * - Preserve intentional ApiError messages.
 * - Handle common Mongoose errors consistently.
 */
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Mongoose validation error
  if (err?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      ...(process.env.NODE_ENV !== "production" && {
        details: err.message,
      }),
    });
  }

  // Invalid MongoDB ObjectId
  if (err?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID.",
    });
  }

  // Duplicate MongoDB key
  if (err?.code === 11000) {
    const duplicateFields = err.keyValue
      ? Object.keys(err.keyValue)
      : [];

    const field = duplicateFields[0];

    return res.status(409).json({
      success: false,
      message: field
        ? `${field.charAt(0).toUpperCase()}${field.slice(1)} already exists.`
        : "A record with the provided value already exists.",
    });
  }

  // Mongoose document validation / required field errors
  if (err?.name === "DocumentValidationError") {
    return res.status(400).json({
      success: false,
      message: "Invalid document data.",
    });
  }

  // Payload too large
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large.",
    });
  }

  // CORS error
  if (err?.message === "CORS blocked") {
    return res.status(403).json({
      success: false,
      message: "Origin is not allowed.",
    });
  }

  // Application/API error
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Unexpected error
  console.error("Unhandled server error:", err);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error.",
  });
};
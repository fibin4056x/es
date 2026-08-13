import ApiError from "../utils/ApiError.js";

/**
 * Global Error Handler
 *
 * Responsibilities:
 * - Handle application/API errors
 * - Handle common Mongoose errors
 * - Handle request/body errors
 * - Handle CORS errors
 * - Log unexpected errors
 * - Never expose stack traces in production
 */
export const errorHandler = (err, req, res, next) => {
  // If response headers have already been sent,
  // let Express handle the error.
  if (res.headersSent) {
    return next(err);
  }

  /* ============================================================
     REQUEST INFORMATION
  ============================================================ */

  const method = req.method;
  const url = req.originalUrl;

  /* ============================================================
     DEBUG LOGGING
  ============================================================ */

  // Always log unexpected errors.
  // This is especially useful while developing/debugging.
  if (
    !(err instanceof ApiError) &&
    process.env.NODE_ENV !== "production"
  ) {
    console.error("\n========================================");
    console.error("UNHANDLED SERVER ERROR");
    console.error("========================================");
    console.error("Method:", method);
    console.error("URL:", url);
    console.error("Name:", err?.name);
    console.error("Message:", err?.message);
    console.error("Stack:");
    console.error(err?.stack);
    console.error("========================================\n");
  }

  /* ============================================================
     MONGOOSE VALIDATION ERROR
  ============================================================ */

  if (err?.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map(
      (validationError) => ({
        field: validationError.path,
        message: validationError.message,
      })
    );

    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      ...(process.env.NODE_ENV !== "production" && {
        details,
      }),
    });
  }

  /* ============================================================
     MONGOOSE CAST ERROR
  ============================================================ */

  if (err?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID.",
      ...(process.env.NODE_ENV !== "production" && {
        details: {
          field: err.path,
          value: err.value,
        },
      }),
    });
  }

  /* ============================================================
     DUPLICATE KEY ERROR
  ============================================================ */

  if (err?.code === 11000) {
    const duplicateFields = err.keyValue
      ? Object.keys(err.keyValue)
      : [];

    const field = duplicateFields[0];

    const formattedField = field
      ? field
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (char) => char.toUpperCase())
      : null;

    return res.status(409).json({
      success: false,
      message: formattedField
        ? `${formattedField} already exists.`
        : "A record with the provided value already exists.",
    });
  }

  /* ============================================================
     MONGOOSE DOCUMENT VALIDATION ERROR
  ============================================================ */

  if (err?.name === "DocumentValidationError") {
    return res.status(400).json({
      success: false,
      message: "Invalid document data.",
    });
  }

  /* ============================================================
     INVALID JSON
  ============================================================ */

  if (
    err?.type === "entity.parse.failed" ||
    err instanceof SyntaxError
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body.",
    });
  }

  /* ============================================================
     REQUEST PAYLOAD TOO LARGE
  ============================================================ */

  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large.",
    });
  }

  /* ============================================================
     MULTER ERRORS
  ============================================================ */

  if (err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "Uploaded file is too large.",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed.",
    });
  }

  /* ============================================================
     CORS ERROR
  ============================================================ */

  if (err?.message === "CORS blocked") {
    return res.status(403).json({
      success: false,
      message: "Origin is not allowed.",
    });
  }

  /* ============================================================
     API ERROR
  ============================================================ */

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  /* ============================================================
     UNKNOWN / UNEXPECTED ERROR
  ============================================================ */

  // Always log unexpected errors.
  console.error("\n========================================");
  console.error("UNEXPECTED SERVER ERROR");
  console.error("========================================");
  console.error("Method:", method);
  console.error("URL:", url);
  console.error("Name:", err?.name);
  console.error("Message:", err?.message);
  console.error("Stack:", err?.stack);
  console.error("========================================\n");

  /* ============================================================
     PRODUCTION RESPONSE
  ============================================================ */

  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }

  /* ============================================================
     DEVELOPMENT RESPONSE
  ============================================================ */

  return res.status(500).json({
    success: false,
    message: err?.message || "Internal Server Error.",
    error: {
      name: err?.name || "Error",
      stack: err?.stack,
    },
  });
};
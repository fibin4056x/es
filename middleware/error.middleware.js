import ApiError from "../utils/ApiError.js";

/* ==================================================
   GLOBAL ERROR HANDLER
================================================== */
export const errorHandler = (
  err,
  req,
  res,
  next
) => {
  if (res.headersSent) {
    return next(err);
  }

  /* =========================================
     MONGOOSE VALIDATION ERROR
  ========================================= */
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  /* =========================================
     INVALID OBJECT ID
  ========================================= */
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID.",
    });
  }

  /* =========================================
     DUPLICATE KEY ERROR
  ========================================= */
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];

    return res.status(409).json({
      success: false,
      message: `${
        field.charAt(0).toUpperCase() + field.slice(1)
      } already exists.`,
    });
  }

  /* =========================================
     CUSTOM API ERROR
  ========================================= */
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  /* =========================================
     UNKNOWN SERVER ERROR
  ========================================= */
  console.error(err);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};
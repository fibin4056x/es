import ApiError from "../utils/ApiError.js";

export const authorize = (...roles) => {
  const normalizedRoles =
    roles
      .filter(Boolean)
      .map((role) =>
        String(role).toLowerCase()
      );

  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ApiError(
          401,
          "Unauthorized."
        )
      );
    }

    if (!req.user.role) {
      return next(
        new ApiError(
          403,
          "Role not found."
        )
      );
    }

    const userRole =
      String(req.user.role)
        .toLowerCase();

    if (
      !normalizedRoles.includes(
        userRole
      )
    ) {
      return next(
        new ApiError(
          403,
          "Access forbidden."
        )
      );
    }

    next();
  };
};
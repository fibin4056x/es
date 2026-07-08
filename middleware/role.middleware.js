import ApiError from "../utils/ApiError.js";



export const authorize = (...roles) => {
  const normalizedRoles = roles.map((role) =>
    role.toLowerCase()
  );

  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ApiError(401, "Unauthorized")
      );
    }

    if (!req.user.role) {
      return next(
        new ApiError(403, "Role not found")
      );
    }

    const userRole =
      req.user.role.toLowerCase();

    if (
      !normalizedRoles.includes(userRole)
    ) {
      return next(
        new ApiError(
          403,
          "Access forbidden"
        )
      );
    }

    next();
  };
};
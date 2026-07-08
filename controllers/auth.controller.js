import asyncHandler from "../utils/asyncHandler.js";
import { loginService, getMeService } from "../services/auth.service.js";
import ApiResponse from "../utils/apiResponse.js";

/* ==================================================
   LOGIN
================================================== */
export const login = asyncHandler(async (req, res) => {
  const data = await loginService(req.body);

  res.status(200).json(
    new ApiResponse(200, data, data.message)
  );
});

/* ==================================================
   LOGOUT
================================================== */
export const logout = asyncHandler(async (req, res) => {
  res.json({
    message: "Logged out successfully",
  });
});

/* ==================================================
   GET ME
================================================== */
export const getMe = asyncHandler(async (req, res) => {
  const data = await getMeService(req.user.id);

  res.status(200).json(
    new ApiResponse(200, data)
  );
});
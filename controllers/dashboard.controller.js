import asyncHandler from "../utils/asyncHandler.js";
import { dashboardStatsService } from "../services/dashboard.service.js";
import ApiResponse from "../utils/apiResponse.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const data = await dashboardStatsService();

  res.status(200).json(
    new ApiResponse(200, data)
  );
});
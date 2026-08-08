import asyncHandler from "../utils/asyncHandler.js";
import { dashboardStatsService, dashboardPreviewStatsService } from "../services/dashboard.service.js";
import ApiResponse from "../utils/apiResponse.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const data = await dashboardStatsService();

  res.status(200).json(
    new ApiResponse(200, data, "Dashboard stats fetched successfully")
  );
});

export const getDashboardReports = asyncHandler(async (req, res) => {
  const data = await dashboardStatsService();

  res.status(200).json(
    new ApiResponse(200, data, "Dashboard reports fetched successfully")
  );
});

export const getDashboardPreviewStats = asyncHandler(async (req, res) => {
  const data = await dashboardPreviewStatsService();

  res.status(200).json(
    new ApiResponse(200, data)
  );
});
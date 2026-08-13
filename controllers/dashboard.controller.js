import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";

import {
  dashboardStatsService,
  dashboardReportsService,
  dashboardPreviewStatsService,
} from "../services/dashboard.service.js";

/*
|--------------------------------------------------------------------------
| DASHBOARD STATS
|--------------------------------------------------------------------------
*/

export const getDashboardStats = asyncHandler(
  async (req, res) => {
    const data = await dashboardStatsService();

    res.status(200).json(
      new ApiResponse(
        200,
        data,
        "Dashboard stats fetched successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| DASHBOARD REPORTS
|--------------------------------------------------------------------------
*/

export const getDashboardReports = asyncHandler(
  async (req, res) => {
    const data = await dashboardReportsService();

    res.status(200).json(
      new ApiResponse(
        200,
        data,
        "Dashboard reports fetched successfully"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| PUBLIC DASHBOARD PREVIEW
|--------------------------------------------------------------------------
*/

export const getDashboardPreviewStats = asyncHandler(
  async (req, res) => {
    const data =
      await dashboardPreviewStatsService();

    res.status(200).json(
      new ApiResponse(
        200,
        data,
        "Dashboard preview fetched successfully"
      )
    );
  }
);
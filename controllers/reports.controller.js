import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import {
  getDailyAttendanceReportService,
  getMonthlyAttendanceReportService,
  getDivisionAttendanceReportService,
  getClassAttendanceReportService,
  getSchoolAttendanceReportService,
  getStudentAttendanceHistoryService,
} from "../services/reports.service.js";

/* =========================================
   1. DAILY ATTENDANCE REPORT CONTROLLER
========================================= */

export const getDailyAttendanceReportController = asyncHandler(
  async (req, res) => {
    const { date, classId, divisionId } = req.query;
    const report = await getDailyAttendanceReportService({
      date,
      classId,
      divisionId,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, report, "Daily attendance report fetched successfully")
      );
  }
);

/* =========================================
   2. MONTHLY ATTENDANCE REPORT CONTROLLER
========================================= */

export const getMonthlyAttendanceReportController = asyncHandler(
  async (req, res) => {
    const { month, year, classId, divisionId } = req.query;
    const report = await getMonthlyAttendanceReportService({
      month,
      year,
      classId,
      divisionId,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, report, "Monthly attendance report fetched successfully")
      );
  }
);

/* =========================================
   3. DIVISION ATTENDANCE REPORT CONTROLLER
========================================= */

export const getDivisionAttendanceReportController = asyncHandler(
  async (req, res) => {
    const { divisionId } = req.params;
    const { startDate, endDate } = req.query;

    const report = await getDivisionAttendanceReportService(divisionId, {
      startDate,
      endDate,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          report,
          "Division attendance report fetched successfully"
        )
      );
  }
);

/* =========================================
   4. CLASS ATTENDANCE REPORT CONTROLLER
========================================= */

export const getClassAttendanceReportController = asyncHandler(
  async (req, res) => {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    const report = await getClassAttendanceReportService(classId, {
      startDate,
      endDate,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          report,
          "Class attendance report fetched successfully"
        )
      );
  }
);

/* =========================================
   5. SCHOOL ATTENDANCE REPORT CONTROLLER
========================================= */

export const getSchoolAttendanceReportController = asyncHandler(
  async (req, res) => {
    const { startDate, endDate } = req.query;

    const report = await getSchoolAttendanceReportService({
      startDate,
      endDate,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          report,
          "School attendance report fetched successfully"
        )
      );
  }
);

/* =========================================
   6. STUDENT ATTENDANCE HISTORY REPORT CONTROLLER
========================================= */

export const getStudentAttendanceHistoryController = asyncHandler(
  async (req, res) => {
    const { studentId } = req.params;
    const { startDate, endDate, page, limit } = req.query;

    const report = await getStudentAttendanceHistoryService(studentId, {
      startDate,
      endDate,
      page,
      limit,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          report,
          "Student attendance history fetched successfully"
        )
      );
  }
);

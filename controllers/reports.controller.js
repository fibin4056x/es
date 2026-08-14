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

import {
  createReportService,
  getInboxReportsService,
  getSentReportsService,
  getReportByIdService,
  markReportReadService,
  deleteReportService,
} from "../services/reports.communication.service.js";

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

/* =========================================
   7. COMPOSE / CREATE INDIVIDUAL REPORT
   POST /api/reports
========================================= */

export const createReportController = asyncHandler(async (req, res) => {
  const files = req.files || (req.file ? [req.file] : []);
  const report = await createReportService(req.body, req.user, files);

  return res
    .status(201)
    .json(new ApiResponse(201, report, "Report sent successfully."));
});

/* =========================================
   8. GET REPORT INBOX
   GET /api/reports/inbox
========================================= */

export const getInboxReportsController = asyncHandler(async (req, res) => {
  const result = await getInboxReportsService(req.user.id, req.query);

  return res.status(200).json({
    success: true,
    message: "Inbox reports fetched successfully.",
    items: result.items,
    data: result.items,
    pagination: result.pagination,
  });
});

/* =========================================
   9. GET REPORT SENT
   GET /api/reports/sent
========================================= */

export const getSentReportsController = asyncHandler(async (req, res) => {
  const result = await getSentReportsService(req.user.id, req.query);

  return res.status(200).json({
    success: true,
    message: "Sent reports fetched successfully.",
    items: result.items,
    data: result.items,
    pagination: result.pagination,
  });
});

/* =========================================
   10. GET INDIVIDUAL REPORT BY ID
   GET /api/reports/:id
========================================= */

export const getReportByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = await getReportByIdService(id, req.user.id, req.user.role);

  return res
    .status(200)
    .json(new ApiResponse(200, report, "Report fetched successfully."));
});

/* =========================================
   11. MARK REPORT AS READ
   PATCH /api/reports/:id/read
========================================= */

export const markReportReadController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isRead = req.body.isRead !== undefined ? req.body.isRead : true;

  const report = await markReportReadService(id, req.user.id, isRead, req.user.role);

  return res
    .status(200)
    .json(new ApiResponse(200, report, "Report read status updated successfully."));
});

/* =========================================
   12. DELETE REPORT
   DELETE /api/reports/:id
========================================= */

export const deleteReportController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await deleteReportService(id, req.user.id, req.user.role);

  return res
    .status(200)
    .json(new ApiResponse(200, response, response.message));
});

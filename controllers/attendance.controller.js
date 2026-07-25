import {
  markAttendanceService,
  getAttendanceByDateService,
  getDivisionAttendanceService,
} from "../services/attendence.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";

/* =========================================
   MARK ATTENDANCE
========================================= */

export const markAttendanceController = asyncHandler(
  async (req, res) => {
    const attendance = await markAttendanceService(
      req.body,
      req.user.id
    );

    return res.status(201).json(
      new ApiResponse(
        201,
        attendance,
        "Attendance marked successfully"
      )
    );
  }
);

/* =========================================
   GET ATTENDANCE BY DATE
========================================= */

export const getAttendanceByDateController =
  asyncHandler(async (req, res) => {
    const { divisionId } = req.params;
    const { date } = req.query;

    const attendance =
      await getAttendanceByDateService(
        divisionId,
        date
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        attendance,
        "Attendance fetched successfully"
      )
    );
  });

/* =========================================
   GET DIVISION ATTENDANCE
========================================= */

export const getDivisionAttendanceController =
  asyncHandler(async (req, res) => {
    const { divisionId } = req.params;

    const attendance =
      await getDivisionAttendanceService(
        divisionId
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        attendance,
        "Division attendance fetched successfully"
      )
    );
  });
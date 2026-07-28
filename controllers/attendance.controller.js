import {
  markAttendanceService,
  getAttendanceByDateService,
  getDivisionAttendanceService,
  uploadAttendanceFileService
} from "../services/attendence.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/ApiError.js";

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

  /* =========================================
   UPLOAD ATTENDANCE FILE
========================================= */

export const uploadAttendanceFileController =
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.files || req.files.length === 0) {
      throw new ApiError(
        400,
        "Please upload at least one PDF."
      );
    }

    const attendance =
      await uploadAttendanceFileService(
        id,
        req.files,
        req.user.id
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        attendance,
        "Documents uploaded successfully."
      )
    );
  });
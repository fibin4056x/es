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

export const markAttendanceController =
  asyncHandler (async (req, res) => {
      const attendance =
        await markAttendanceService(
          req.body,
          req.user.id
        );

      res.status(201).json(
       new ApiResponse(
        201,
        attendance,
        "Attendance marked successfully"
       ))

    });

/* =========================================
   GET ATTENDANCE BY DATE
========================================= */

export const getAttendanceByDateController =
  asyncHandler(async (req, res) => {

      const attendance =
        await getAttendanceByDateService(
          req.params.divisionId,
          req.query.date
        );

      res.status(200).json(
        new ApiResponse(
          200,
          attendance,
          "attendance fetched successfully"
        ))
      

    });

/* =========================================
   GET DIVISION ATTENDANCE
========================================= */

export const getDivisionAttendanceController =
  asyncHandler(async (req, res) => {


      const attendance =
        await getDivisionAttendanceService(
          req.params.divisionId
        );

      res.status(200).json(
        new ApiResponse(
          200,
          attendance,
          "Division attendance fetched successfully"
        )
      );
    });


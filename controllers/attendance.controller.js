import {
  markAttendanceService,
  getAttendanceByDateService,
  getDivisionAttendanceService,
  uploadAttendanceFileService,
  replaceAttendanceDocumentService,
  deleteAttendanceDocumentService,
  updateAttendanceService,
  deleteAttendanceService,
} from "../services/attendence.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/ApiError.js";

/* =========================================
   MARK ATTENDANCE
========================================= */

export const markAttendanceController = asyncHandler(
  async (req, res) => {
    if (!req.body || !req.body.students?.length) {
      throw new ApiError(
        400,
        "Attendance data is required."
      );
    }

    const attendance =
      await markAttendanceService(
        req.body,
        req.user.id
      );

    return res.status(201).json(
      new ApiResponse(
        201,
        attendance,
        "Attendance marked successfully."
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

    /* =========================================
       VALIDATE REQUEST
    ========================================= */

    if (!divisionId) {
      throw new ApiError(
        400,
        "Division ID is required."
      );
    }

    if (!date) {
      throw new ApiError(
        400,
        "Attendance date is required."
      );
    }

    const attendance =
      await getAttendanceByDateService(
        divisionId,
        date
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        attendance,
        "Attendance fetched successfully."
      )
    );
  });


/* =========================================
   GET DIVISION ATTENDANCE
========================================= */

export const getDivisionAttendanceController =
  asyncHandler(async (req, res) => {
    const { divisionId } = req.params;

    let {
      page = 1,
      limit = 20,
    } = req.query;

    /* =========================================
       VALIDATE REQUEST
    ========================================= */

    if (!divisionId) {
      throw new ApiError(
        400,
        "Division ID is required."
      );
    }

    page = Math.max(1, Number(page) || 1);
    limit = Math.max(1, Number(limit) || 20);

    const attendance =
      await getDivisionAttendanceService(
        divisionId,
        page,
        limit
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        attendance,
        "Division attendance fetched successfully."
      )
    );
  });
 /* =========================================
   UPLOAD ATTENDANCE DOCUMENTS
========================================= */

export const uploadAttendanceFileController =
  asyncHandler(async (req, res) => {
     console.log(req.files);

    const { id } = req.params;

    /* =========================================
       VALIDATE REQUEST
    ========================================= */

    if (!id) {
      throw new ApiError(
        400,
        "Attendance ID is required."
      );
    }

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

/* =========================================
   UPDATE ATTENDANCE
========================================= */

export const updateAttendanceController =
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    /* =========================================
       VALIDATE REQUEST
    ========================================= */

    if (!id) {
      throw new ApiError(
        400,
        "Attendance ID is required."
      );
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      throw new ApiError(
        400,
        "Attendance update data is required."
      );
    }

    const attendance =
      await updateAttendanceService(
        id,
        req.body,
        req.user.id
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        attendance,
        "Attendance updated successfully."
      )
    );
  });


/* =========================================
   REPLACE ATTENDANCE DOCUMENT
========================================= */

export const replaceAttendanceDocumentController =
  asyncHandler(async (req, res) => {
    const {
      attendanceId,
      documentId,
    } = req.params;

    /* =========================================
       VALIDATE REQUEST
    ========================================= */

    if (!attendanceId) {
      throw new ApiError(
        400,
        "Attendance ID is required."
      );
    }

    if (!documentId) {
      throw new ApiError(
        400,
        "Document ID is required."
      );
    }

    if (!req.file) {
      throw new ApiError(
        400,
        "Please upload a document."
      );
    }

    const attendance =
      await replaceAttendanceDocumentService(
        attendanceId,
        documentId,
        req.file,
        req.user.id
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        attendance,
        "Document replaced successfully."
      )
    );
  });

/* =========================================
   DELETE ATTENDANCE DOCUMENT
========================================= */

export const deleteAttendanceDocumentController =
  asyncHandler(async (req, res) => {
    const {
      attendanceId,
      documentId,
    } = req.params;

    /* =========================================
       VALIDATE REQUEST
    ========================================= */

    if (!attendanceId) {
      throw new ApiError(
        400,
        "Attendance ID is required."
      );
    }

    if (!documentId) {
      throw new ApiError(
        400,
        "Document ID is required."
      );
    }

    const attendance =
      await deleteAttendanceDocumentService(
        attendanceId,
        documentId
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        attendance,
        "Document deleted successfully."
      )
    );
  });


/* =========================================
   DELETE ATTENDANCE
========================================= */

export const deleteAttendanceController =
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    /* =========================================
       VALIDATE REQUEST
    ========================================= */

    if (!id) {
      throw new ApiError(
        400,
        "Attendance ID is required."
      );
    }

    const confirmDelete =
      req.body.confirmDelete === true;

    const response =
      await deleteAttendanceService(
        id,
        confirmDelete
      );

    return res.status(200).json(
      new ApiResponse(
        200,
        response,
        response.message
      )
    );
  });
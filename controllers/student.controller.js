import {
  createStudentService,
  getAllStudentsService,
  getStudentByIdService,
  updateStudentService,
  deleteStudentService,
  getStudentsByDivisionService,
  getStudentsByTeacherService,
} from "../services/student.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/ApiError.js";

/* =========================================
   CREATE STUDENT
========================================= */

export const createStudentController = asyncHandler(async (req, res) => {
  const newStudent = await createStudentService(req.body);

  return res.status(201).json(
    new ApiResponse(
      201,
      newStudent,
      "Student created successfully"
    )
  );
});

/* =========================================
   GET ALL STUDENTS
========================================= */

export const getAllStudentsController = asyncHandler(async (req, res) => {
  if (req.user.role === "teacher") {
    const students = await getStudentsByTeacherService(req.user.id);
    return res.status(200).json(
      new ApiResponse(
        200,
        students,
        "Students fetched successfully"
      )
    );
  }

  const result = await getAllStudentsService(req.query);

  return res.status(200).json({
    success: true,
    data: result.students,
    pagination: result.pagination,
  });
});

/* =========================================
   GET STUDENT BY ID
========================================= */

export const getStudentByIdController = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Student ID is required");
  }

  const student = await getStudentByIdService(req.params.id);

  return res.status(200).json(
    new ApiResponse(
      200,
      student,
      "Student fetched successfully"
    )
  );
});

/* =========================================
   UPDATE STUDENT
========================================= */

export const updateStudentController = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Student ID is required");
  }

  const updatedStudent = await updateStudentService(
    req.params.id,
    req.body,
    req.user
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      updatedStudent,
      "Student updated successfully"
    )
  );
});

/* =========================================
   DELETE STUDENT
========================================= */

export const deleteStudentController = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Student ID is required");
  }

  await deleteStudentService(req.params.id);

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Student deleted successfully"
    )
  );
});

/* =========================================
   GET STUDENTS BY TEACHER
========================================= */

export const getStudentsByTeacherController = asyncHandler(async (req, res) => {
  const result = await getStudentsByTeacherService(req.user.id, req.query);

  return res.status(200).json({
    success: true,
    data: result.students || result,
    pagination: result.pagination,
  });
});

/* =========================================
   GET STUDENTS BY DIVISION
========================================= */

export const getStudentsByDivisionController = asyncHandler(async (req, res) => {
  if (!req.params.divisionId) {
    throw new ApiError(400, "Division ID is required");
  }

  const result = await getStudentsByDivisionService(
    req.params.divisionId,
    req.user,
    req.query
  );

  return res.status(200).json({
    success: true,
    data: result.students || result,
    pagination: result.pagination,
  });
});
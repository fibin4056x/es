import {
  createTeacherService,
  getAllTeacherService,
  getTeacherByIdService,
  updateTeacherService,
  updateTeacherStatusService,
  deleteTeacherService,
} from "../services/teacher.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/ApiError.js";

export const createTeacher = asyncHandler(async (req, res) => {
  const teacherData = await createTeacherService(req.body);

  return res.status(201).json(
    new ApiResponse(
      201,
      teacherData,
      "Teacher created successfully"
    )
  );
});

export const getAllTeachers = asyncHandler(async (req, res) => {
  const result = await getAllTeacherService(req.query);

  return res.status(200).json({
    success: true,
    data: result.teachers,
    pagination: result.pagination,
  });
});

export const getTeacherById = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Teacher ID is required");
  }

  const teacher = await getTeacherByIdService(req.params.id);

  return res.status(200).json(
    new ApiResponse(
      200,
      teacher,
      "Teacher fetched successfully"
    )
  );
});

export const updateTeacher = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Teacher ID is required");
  }

  const teacher = await updateTeacherService(
    req.params.id,
    req.body
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      teacher,
      "Teacher updated successfully"
    )
  );
});

export const updateTeacherStatus = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Teacher ID is required");
  }

  const teacher = await updateTeacherStatusService(
    req.params.id,
    req.body.status
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      teacher,
      "Teacher status updated successfully"
    )
  );
});

export const deleteTeacher = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Teacher ID is required");
  }

  await deleteTeacherService(req.params.id);

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Teacher deleted successfully"
    )
  );
});
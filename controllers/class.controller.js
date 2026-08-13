import {
  createClassService,
  getAllClassesService,
  getClassByIdService,
  updateClassService,
  deleteClassService,
} from "../services/class.service.js";
import { getTeacherDivisionsService } from "../services/division.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/ApiError.js";

/* =========================================
   CREATE CLASS
========================================= */

export const createClass = asyncHandler(async (req, res) => {
  const newClass = await createClassService(req.body);

  return res.status(201).json(
    new ApiResponse(
      201,
      newClass,
      "Class created successfully"
    )
  );
});

/* =========================================
   GET ALL CLASSES
========================================= */

export const getAllClasses = asyncHandler(async (req, res) => {
  let classes;
  let pagination;

  if (req.user.role === "teacher") {
    const divisions = await getTeacherDivisionsService(req.user.id);

    classes = [
      ...new Map(
        divisions
          .filter((division) => division.classId)
          .map((division) => [
            division.classId._id.toString(),
            division.classId,
          ])
      ).values(),
    ];
  } else {
    const result = await getAllClassesService(req.query);
    classes = result.classes;
    pagination = result.pagination;
  }

  return res.status(200).json({
    success: true,
    data: classes,
    pagination,
  });
});

/* =========================================
   GET CLASS BY ID
========================================= */

export const getClassById = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Class ID is required");
  }

  const singleClass = await getClassByIdService(req.params.id);

  return res.status(200).json(
    new ApiResponse(
      200,
      singleClass,
      "Class fetched successfully"
    )
  );
});

/* =========================================
   UPDATE CLASS
========================================= */

export const updateClass = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Class ID is required");
  }

  const updatedClass = await updateClassService(
    req.params.id,
    req.body
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      updatedClass,
      "Class updated successfully"
    )
  );
});

/* =========================================
   DELETE CLASS
========================================= */

export const deleteClass = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Class ID is required");
  }

  await deleteClassService(req.params.id);

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Class deleted successfully"
    )
  );
});
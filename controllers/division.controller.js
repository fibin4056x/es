import {
  createDivisionService,
  getAllDivisionsService,
  getDivisionByIdService,
  updateDivisionService,
  deleteDivisionService,
  getTeacherDivisionsService,
} from "../services/division.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/ApiError.js";

/* =========================================
   CREATE DIVISION
========================================= */

export const createDivisionController = asyncHandler(async (req, res) => {
  const newDivision = await createDivisionService(req.body);

  return res.status(201).json(
    new ApiResponse(
      201,
      newDivision,
      "Division created successfully"
    )
  );
});

/* =========================================
   GET ALL DIVISIONS
========================================= */

export const getAllDivisionsController = asyncHandler(async (req, res) => {
  let divisions;
  let pagination;

  if (req.user.role === "teacher") {
    divisions = await getTeacherDivisionsService(req.user.id);
  } else {
    const result = await getAllDivisionsService(req.query);
    divisions = result.divisions;
    pagination = result.pagination;
  }

  return res.status(200).json({
    success: true,
    data: divisions,
    pagination,
  });
});

/* =========================================
   GET DIVISION BY ID
========================================= */

export const getDivisionByIdController = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Division ID is required");
  }

  const division = await getDivisionByIdService(req.params.id);

  return res.status(200).json(
    new ApiResponse(
      200,
      division,
      "Division fetched successfully"
    )
  );
});

/* =========================================
   UPDATE DIVISION
========================================= */

export const updateDivisionController = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Division ID is required");
  }

  const updatedDivision = await updateDivisionService(
    req.params.id,
    req.body
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      updatedDivision,
      "Division updated successfully"
    )
  );
});

/* =========================================
   DELETE DIVISION
========================================= */

export const deleteDivisionController = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new ApiError(400, "Division ID is required");
  }

  await deleteDivisionService(req.params.id);

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Division deleted successfully"
    )
  );
});

/* =========================================
   GET MY DIVISIONS
========================================= */

export const getMyDivisionsController = asyncHandler(async (req, res) => {
  const divisions = await getTeacherDivisionsService(req.user.id);

  return res.status(200).json(
    new ApiResponse(
      200,
      divisions,
      "Teacher divisions fetched successfully"
    )
  );
});
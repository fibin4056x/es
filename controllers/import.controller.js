import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { importStudentsService } from "../services/import.service.js";
import {
  parseImportFile,
  generateImportTemplateBuffer,
} from "../utils/import.utils.js";

/* =========================================
   1. IMPORT STUDENTS CONTROLLER
========================================= */

export const importStudentsController = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw new ApiError(400, "Please upload a valid CSV or Excel (.xlsx, .xls) file");
  }

  // Parse uploaded file buffer to structured array of rows
  const parsedRecords = parseImportFile(req.file.buffer);

  if (!parsedRecords || parsedRecords.length === 0) {
    throw new ApiError(400, "The uploaded file is empty or formatted incorrectly");
  }

  // Execute bulk import service
  const summary = await importStudentsService(parsedRecords);

  return res
    .status(200)
    .json(new ApiResponse(200, summary, "Student import completed successfully"));
});

/* =========================================
   2. DOWNLOAD IMPORT TEMPLATE CONTROLLER
========================================= */

export const downloadImportTemplateController = asyncHandler(async (req, res) => {
  const format = (req.query.format || "csv").toLowerCase();

  if (!["csv", "xlsx"].includes(format)) {
    throw new ApiError(400, "Invalid format. Supported formats: csv, xlsx");
  }

  const { buffer, filename, contentType } = generateImportTemplateBuffer(format);

  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  return res.status(200).send(buffer);
});

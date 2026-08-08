import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {
  exportAllStudentsService,
  exportStudentsByClassService,
  exportStudentsByDivisionService,
  exportStudentsByTeacherService,
} from "../services/export.service.js";
import { generateExportBuffer } from "../utils/export.utils.js";

/* =========================================
   1. EXPORT ALL STUDENTS
========================================= */

export const exportAllStudentsController = asyncHandler(async (req, res) => {
  const format = (req.query.format || "csv").toLowerCase();
  if (!["csv", "xlsx"].includes(format)) {
    throw new ApiError(400, "Invalid format. Supported formats: csv, xlsx");
  }

  const exportResult = await exportAllStudentsService();
  const { buffer, filename, contentType } = await generateExportBuffer({
    metadata: exportResult.metadata,
    data: exportResult.data,
    format,
  });

  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  return res.status(200).send(buffer);
});

/* =========================================
   2. EXPORT STUDENTS BY CLASS
========================================= */

export const exportStudentsByClassController = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const format = (req.query.format || "csv").toLowerCase();

  if (!["csv", "xlsx"].includes(format)) {
    throw new ApiError(400, "Invalid format. Supported formats: csv, xlsx");
  }

  const exportResult = await exportStudentsByClassService(classId);
  const { buffer, filename, contentType } = await generateExportBuffer({
    metadata: exportResult.metadata,
    data: exportResult.data,
    format,
  });

  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  return res.status(200).send(buffer);
});

/* =========================================
   3. EXPORT STUDENTS BY DIVISION
========================================= */

export const exportStudentsByDivisionController = asyncHandler(
  async (req, res) => {
    const { divisionId } = req.params;
    const format = (req.query.format || "csv").toLowerCase();

    if (!["csv", "xlsx"].includes(format)) {
      throw new ApiError(400, "Invalid format. Supported formats: csv, xlsx");
    }

    const exportResult = await exportStudentsByDivisionService(divisionId);
    const { buffer, filename, contentType } = await generateExportBuffer({
      metadata: exportResult.metadata,
      data: exportResult.data,
      format,
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    return res.status(200).send(buffer);
  }
);

/* =========================================
   4. EXPORT STUDENTS BY TEACHER
========================================= */

export const exportStudentsByTeacherController = asyncHandler(
  async (req, res) => {
    const { teacherId } = req.params;
    const format = (req.query.format || "csv").toLowerCase();

    if (!["csv", "xlsx"].includes(format)) {
      throw new ApiError(400, "Invalid format. Supported formats: csv, xlsx");
    }

    const exportResult = await exportStudentsByTeacherService(teacherId);
    const { buffer, filename, contentType } = await generateExportBuffer({
      metadata: exportResult.metadata,
      data: exportResult.data,
      format,
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    return res.status(200).send(buffer);
  }
);

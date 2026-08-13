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
  const { format = "csv", classId, divisionId, teacherId, status, academicYear, search } = req.query;
  const normalizedFormat = String(format).toLowerCase();

  if (!["csv", "xlsx"].includes(normalizedFormat)) {
    throw new ApiError(400, "Invalid format. Supported formats: csv, xlsx");
  }

  const exportResult = await exportAllStudentsService({
    classId,
    divisionId,
    teacherId,
    status,
    academicYear,
    search,
  });

  const { buffer, filename, contentType } = await generateExportBuffer({
    metadata: exportResult.metadata,
    data: exportResult.data,
    format: normalizedFormat,
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
  const { format = "csv", divisionId, teacherId, status, academicYear, search } = req.query;
  const normalizedFormat = String(format).toLowerCase();

  if (!["csv", "xlsx"].includes(normalizedFormat)) {
    throw new ApiError(400, "Invalid format. Supported formats: csv, xlsx");
  }

  const exportResult = await exportStudentsByClassService(classId, {
    divisionId,
    teacherId,
    status,
    academicYear,
    search,
  });

  const { buffer, filename, contentType } = await generateExportBuffer({
    metadata: exportResult.metadata,
    data: exportResult.data,
    format: normalizedFormat,
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
    const { format = "csv", classId, teacherId, status, academicYear, search } = req.query;
    const normalizedFormat = String(format).toLowerCase();

    if (!["csv", "xlsx"].includes(normalizedFormat)) {
      throw new ApiError(400, "Invalid format. Supported formats: csv, xlsx");
    }

    const exportResult = await exportStudentsByDivisionService(divisionId, {
      classId,
      teacherId,
      status,
      academicYear,
      search,
    });

    const { buffer, filename, contentType } = await generateExportBuffer({
      metadata: exportResult.metadata,
      data: exportResult.data,
      format: normalizedFormat,
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
    const { format = "csv", classId, divisionId, status, academicYear, search } = req.query;
    const normalizedFormat = String(format).toLowerCase();

    if (!["csv", "xlsx"].includes(normalizedFormat)) {
      throw new ApiError(400, "Invalid format. Supported formats: csv, xlsx");
    }

    const exportResult = await exportStudentsByTeacherService(teacherId, {
      classId,
      divisionId,
      status,
      academicYear,
      search,
    });

    const { buffer, filename, contentType } = await generateExportBuffer({
      metadata: exportResult.metadata,
      data: exportResult.data,
      format: normalizedFormat,
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    return res.status(200).send(buffer);
  }
);

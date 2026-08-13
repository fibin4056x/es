import mongoose from "mongoose";
import StudentModel from "../models/student.model.js";
import ClassModel from "../models/class.model.js";
import DivisionModel from "../models/division.model.js";
import UserModel from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";

/* =========================================
   PIPELINE BUILDER FOR STUDENT EXPORT
========================================= */

/* =========================================
   PIPELINE BUILDER FOR STUDENT EXPORT
========================================= */

const buildStudentExportPipeline = async (filters = {}) => {
  const { classId, divisionId, teacherId, status, academicYear, search } = filters;
  const matchFilter = {};

  if (classId && mongoose.Types.ObjectId.isValid(classId)) {
    matchFilter.classId = new mongoose.Types.ObjectId(classId);
  }

  if (divisionId && mongoose.Types.ObjectId.isValid(divisionId)) {
    matchFilter.divisionId = new mongoose.Types.ObjectId(divisionId);
  }

  if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
    const assignedDivisions = await DivisionModel.find({
      assignedTeacher: teacherId,
    }).select("_id");

    const divisionIds = assignedDivisions.map(
      (division) => new mongoose.Types.ObjectId(division._id)
    );
    matchFilter.divisionId = { $in: divisionIds };
  }

  if (status) {
    matchFilter.status = status;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");
    matchFilter.$or = [
      { nameEnglish: searchRegex },
      { nameMalayalam: searchRegex },
      { admissionNumber: searchRegex },
      { parentName: searchRegex },
      { parentPhone: searchRegex },
    ];
  }

  const pipeline = [
    { $match: matchFilter },
    {
      $lookup: {
        from: "classes",
        localField: "classId",
        foreignField: "_id",
        as: "classInfo",
      },
    },
    {
      $unwind: {
        path: "$classInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "divisions",
        localField: "divisionId",
        foreignField: "_id",
        as: "divisionInfo",
      },
    },
    {
      $unwind: {
        path: "$divisionInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  if (academicYear) {
    pipeline.push({
      $match: { "classInfo.academicYear": academicYear },
    });
  }

  pipeline.push(
    {
      $sort: {
        "classInfo.name": 1,
        "divisionInfo.name": 1,
        rollNumber: 1,
        nameEnglish: 1,
      },
    },
    {
      $project: {
        _id: 0,
        admissionNumber: 1,
        admissionDate: 1,
        rollNumber: 1,
        nameEnglish: 1,
        nameMalayalam: 1,
        gender: 1,
        dateOfBirth: 1,
        bloodGroup: 1,
        className: "$classInfo.name",
        academicYear: "$classInfo.academicYear",
        divisionName: "$divisionInfo.name",
        parentName: 1,
        parentPhone: 1,
        guardianRelation: 1,
        address: 1,
        aadhaarNumber: 1,
        economicCategory: 1,
        status: 1,
      },
    }
  );

  return pipeline;
};

/* =========================================
   1. EXPORT ALL STUDENTS
========================================= */

export const exportAllStudentsService = async (filters = {}) => {
  const pipeline = await buildStudentExportPipeline(filters);
  const students = await StudentModel.aggregate(pipeline);

  return {
    metadata: {
      scope: "all",
      filters,
    },
    data: students,
  };
};

/* =========================================
   2. EXPORT STUDENTS BY CLASS
========================================= */

export const exportStudentsByClassService = async (classId, filters = {}) => {
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw new ApiError(400, "Invalid Class ID");
  }

  const classData = await ClassModel.findById(classId);
  if (!classData) {
    throw new ApiError(404, "Class not found");
  }

  const mergedFilters = { ...filters, classId };
  const pipeline = await buildStudentExportPipeline(mergedFilters);
  const students = await StudentModel.aggregate(pipeline);

  return {
    metadata: {
      scope: "class",
      className: classData.name,
      filters: mergedFilters,
    },
    data: students,
  };
};

/* =========================================
   3. EXPORT STUDENTS BY DIVISION
========================================= */

export const exportStudentsByDivisionService = async (divisionId, filters = {}) => {
  if (!mongoose.Types.ObjectId.isValid(divisionId)) {
    throw new ApiError(400, "Invalid Division ID");
  }

  const divisionData = await DivisionModel.findById(divisionId).populate(
    "classId",
    "name"
  );
  if (!divisionData) {
    throw new ApiError(404, "Division not found");
  }

  const mergedFilters = { ...filters, divisionId };
  const pipeline = await buildStudentExportPipeline(mergedFilters);
  const students = await StudentModel.aggregate(pipeline);

  return {
    metadata: {
      scope: "division",
      className: divisionData.classId?.name || "",
      divisionName: divisionData.name,
      filters: mergedFilters,
    },
    data: students,
  };
};

/* =========================================
   4. EXPORT STUDENTS BY TEACHER
========================================= */

export const exportStudentsByTeacherService = async (teacherId, filters = {}) => {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new ApiError(400, "Invalid Teacher ID");
  }

  const teacher = await UserModel.findById(teacherId);
  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  const mergedFilters = { ...filters, teacherId };
  const pipeline = await buildStudentExportPipeline(mergedFilters);
  const students = await StudentModel.aggregate(pipeline);

  return {
    metadata: {
      scope: "teacher",
      teacherName: teacher.name,
      filters: mergedFilters,
    },
    data: students,
  };
};


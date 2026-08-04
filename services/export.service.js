import mongoose from "mongoose";
import StudentModel from "../models/student.model.js";
import ClassModel from "../models/class.model.js";
import DivisionModel from "../models/division.model.js";
import UserModel from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";

/* =========================================
   PIPELINE BUILDER FOR STUDENT EXPORT
========================================= */

const buildStudentExportPipeline = (matchFilter = {}) => {
  return [
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
    },
  ];
};

/* =========================================
   1. EXPORT ALL STUDENTS
========================================= */

export const exportAllStudentsService = async () => {
  const pipeline = buildStudentExportPipeline({});
  const students = await StudentModel.aggregate(pipeline);

  return {
    metadata: {
      scope: "all",
    },
    data: students,
  };
};

/* =========================================
   2. EXPORT STUDENTS BY CLASS
========================================= */

export const exportStudentsByClassService = async (classId) => {
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw new ApiError(400, "Invalid Class ID");
  }

  const classData = await ClassModel.findById(classId);
  if (!classData) {
    throw new ApiError(404, "Class not found");
  }

  const pipeline = buildStudentExportPipeline({
    classId: new mongoose.Types.ObjectId(classId),
  });

  const students = await StudentModel.aggregate(pipeline);

  return {
    metadata: {
      scope: "class",
      className: classData.name,
    },
    data: students,
  };
};

/* =========================================
   3. EXPORT STUDENTS BY DIVISION
========================================= */

export const exportStudentsByDivisionService = async (divisionId) => {
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

  const pipeline = buildStudentExportPipeline({
    divisionId: new mongoose.Types.ObjectId(divisionId),
  });

  const students = await StudentModel.aggregate(pipeline);

  return {
    metadata: {
      scope: "division",
      className: divisionData.classId?.name || "",
      divisionName: divisionData.name,
    },
    data: students,
  };
};

/* =========================================
   4. EXPORT STUDENTS BY TEACHER
========================================= */

export const exportStudentsByTeacherService = async (teacherId) => {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new ApiError(400, "Invalid Teacher ID");
  }

  const teacher = await UserModel.findById(teacherId);
  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  const assignedDivisions = await DivisionModel.find({
    assignedTeacher: teacherId,
  }).select("_id");

  const divisionIds = assignedDivisions.map(
    (division) => new mongoose.Types.ObjectId(division._id)
  );

  if (!divisionIds.length) {
    return {
      metadata: {
        scope: "teacher",
        teacherName: teacher.name,
      },
      data: [],
    };
  }

  const pipeline = buildStudentExportPipeline({
    divisionId: { $in: divisionIds },
  });

  const students = await StudentModel.aggregate(pipeline);

  return {
    metadata: {
      scope: "teacher",
      teacherName: teacher.name,
    },
    data: students,
  };
};


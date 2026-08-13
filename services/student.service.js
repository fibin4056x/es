import StudentModel from "../models/student.model.js";
import DivisionModel from "../models/division.model.js";

/* =========================================
   HELPERS
========================================= */

const isBlankValue = (value) =>
  value === undefined ||
  value === null ||
  String(value).trim() === "";

const normalizeStudentPayload = (
  studentData
) => {
  const payload = {
    ...studentData,
  };

  if (
    isBlankValue(
      payload.admissionNumber
    )
  ) {
    delete payload.admissionNumber;
  }

  if (
    isBlankValue(
      payload.nameMalayalam
    )
  ) {
    delete payload.nameMalayalam;
  }

  if (
    isBlankValue(
      payload.aadhaarNumber
    )
  ) {
    delete payload.aadhaarNumber;
  }

  if (
    isBlankValue(
      payload.economicCategory
    )
  ) {
    delete payload.economicCategory;
  }

  return payload;
};

/* =========================================
   POPULATE
========================================= */

const studentPopulate = [
  {
    path: "classId",
    select: "name academicYear",
  },
  {
    path: "divisionId",
    select: "name capacity",
  },
];

/* =========================================
   CREATE STUDENT
========================================= */

export const createStudentService =
  async (studentData) => {

    const division =
      await DivisionModel.findById(
        studentData.divisionId
      );

    if (!division) {
      throw new Error(
        "Division not found"
      );
    }

    if (
      division.classId.toString() !==
      studentData.classId
    ) {
      throw new Error(
        "Selected division does not belong to the selected class"
      );
    }

    try {

      const newStudent =
        await StudentModel.create(
          normalizeStudentPayload(
            studentData
          )
        );

      return await newStudent.populate(
        studentPopulate
      );

    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Admission number already exists");
      }
      throw error;
    }
  };
  /* =========================================
   GET ALL STUDENTS
========================================= */

export const getAllStudentsService = async (options = {}) => {
  let page = Math.max(1, Number(options.page) || 1);
  let limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;

  const queryFilter = {};
  if (options.classId) queryFilter.classId = options.classId;
  if (options.divisionId) queryFilter.divisionId = options.divisionId;
  if (options.status) queryFilter.status = options.status;
  if (options.search && options.search.trim()) {
    const searchRegex = new RegExp(options.search.trim(), "i");
    queryFilter.$or = [
      { nameEnglish: searchRegex },
      { nameMalayalam: searchRegex },
      { admissionNumber: searchRegex },
      { parentName: searchRegex },
      { parentPhone: searchRegex },
    ];
  }

  const totalRecords = await StudentModel.countDocuments(queryFilter);

  const students = await StudentModel.find(queryFilter)
    .populate(studentPopulate)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    students,
    pagination: {
      totalRecords,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit) || 1,
      limit,
      hasNextPage: page * limit < totalRecords,
      hasPreviousPage: page > 1,
    },
  };
};

/* =========================================
   GET STUDENT BY ID
========================================= */

export const getStudentByIdService =
  async (studentId) => {

    const student =
      await StudentModel
        .findById(studentId)

        .populate(
          studentPopulate
        );

    if (!student) {

      throw new Error(
        "Student not found"
      );

    }

    return student;

  };

/* =========================================
   UPDATE STUDENT
========================================= */

export const updateStudentService =
  async (
    studentId,
    updateData,
    user
  ) => {

    const payload =
      normalizeStudentPayload(
        updateData
      );

    /* =========================================
       CHECK STUDENT EXISTS
    ========================================= */

    const existingStudent =
      await StudentModel.findById(
        studentId
      );

    if (!existingStudent) {

      throw new Error(
        "Student not found"
      );

    }

    /* =========================================
       TEACHER CAN UPDATE ONLY
       ASSIGNED DIVISION STUDENTS
    ========================================= */

    if (user?.role === "teacher") {

      const assignedDivision =
        await DivisionModel.findOne({

          _id:
            existingStudent.divisionId,

          assignedTeacher:
            user.id,

        });

      if (!assignedDivision) {

        throw new Error(
          "You are not allowed to update this student"
        );

      }

      /* =========================================
         TEACHER CANNOT CHANGE
         CLASS / DIVISION / ADMISSION NUMBER
      ========================================= */

      payload.classId =
        existingStudent.classId;

      payload.divisionId =
        existingStudent.divisionId;

      payload.admissionNumber =
        existingStudent.admissionNumber;

    }

    /* =========================================
       VALIDATE DIVISION
    ========================================= */

    const division =
      await DivisionModel.findById(
        payload.divisionId
      );

    if (!division) {

      throw new Error(
        "Division not found"
      );

    }

    if (
      division.classId.toString() !==
      payload.classId.toString()
    ) {

      throw new Error(
        "Selected division does not belong to the selected class"
      );

    }

    try {

      const updatedStudent =
        await StudentModel
          .findByIdAndUpdate(
            studentId,
            payload,
            {
              new: true,
              runValidators: true,
            }
          )

          .populate(
            studentPopulate
          );

      return updatedStudent;

    } catch (error) {

      if (error.code === 11000) {

        throw new Error(
          "Admission number already exists"
        );

      }

      throw error;

    }

  };
  /* =========================================
   DELETE STUDENT
========================================= */

export const deleteStudentService =
  async (studentId) => {

    const deletedStudent =
      await StudentModel.findByIdAndDelete(
        studentId
      );

    if (!deletedStudent) {

      throw new Error(
        "Student not found"
      );

    }

    return deletedStudent;

  };

/* =========================================
   GET STUDENTS BY DIVISION
========================================= */

export const getStudentsByDivisionService = async (
  divisionId,
  user,
  options = {}
) => {
  if (user?.role === "teacher") {
    const assignedDivision = await DivisionModel.findOne({
      _id: divisionId,
      assignedTeacher: user.id,
    });

    if (!assignedDivision) {
      throw new Error("Division not assigned to this teacher");
    }
  }

  let page = Math.max(1, Number(options.page) || 1);
  let limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;

  const queryFilter = {
    divisionId,
    status: options.status || "active",
  };

  if (options.search && options.search.trim()) {
    const searchRegex = new RegExp(options.search.trim(), "i");
    queryFilter.$or = [
      { nameEnglish: searchRegex },
      { nameMalayalam: searchRegex },
      { admissionNumber: searchRegex },
    ];
  }

  const totalRecords = await StudentModel.countDocuments(queryFilter);

  const students = await StudentModel.find(queryFilter)
    .populate(studentPopulate)
    .sort({
      rollNumber: 1,
      nameEnglish: 1,
    })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    students,
    pagination: {
      totalRecords,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit) || 1,
      limit,
      hasNextPage: page * limit < totalRecords,
      hasPreviousPage: page > 1,
    },
  };
};

/* =========================================
   GET STUDENTS BY TEACHER
========================================= */

export const getStudentsByTeacherService = async (teacherId, options = {}) => {
  try {
    const divisions = await DivisionModel.find({
      assignedTeacher: teacherId,
    }).select("_id");

    const divisionIds = divisions.map((division) => division._id);

    if (!divisionIds.length) {
      return {
        students: [],
        pagination: {
          totalRecords: 0,
          currentPage: 1,
          totalPages: 0,
          limit: 20,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    let page = Math.max(1, Number(options.page) || 1);
    let limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const queryFilter = {
      divisionId: { $in: divisionIds },
      status: options.status || "active",
    };

    if (options.search && options.search.trim()) {
      const searchRegex = new RegExp(options.search.trim(), "i");
      queryFilter.$or = [
        { nameEnglish: searchRegex },
        { nameMalayalam: searchRegex },
        { admissionNumber: searchRegex },
      ];
    }

    const totalRecords = await StudentModel.countDocuments(queryFilter);

    const students = await StudentModel.find(queryFilter)
      .populate(studentPopulate)
      .sort({
        rollNumber: 1,
        nameEnglish: 1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      students,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit) || 1,
        limit,
        hasNextPage: page * limit < totalRecords,
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    console.log("GET TEACHER STUDENTS ERROR:", error);
    throw new Error("Failed to fetch teacher students");
  }
};
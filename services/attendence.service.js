import AttendanceModel from "../models/attendance.model.js";
import StudentModel from "../models/student.model.js";
import DivisionModel from "../models/division.model.js";
import ApiError from "../utils/ApiError.js";

/* =========================================
   POPULATE OPTIONS
========================================= */

const attendancePopulate = [
  {
    path: "classId",
    select: "name",
  },
  {
    path: "divisionId",
    select: "name",
  },
  {
    path: "markedBy",
    select: "name",
  },
  {
    path: "students.studentId",
    select: "admissionNumber nameEnglish",
  },
];

/* =========================================
   MARK ATTENDANCE
========================================= */

/* =========================================
   MARK ATTENDANCE
========================================= */

export const markAttendanceService = async (
  attendanceData,
  userId
) => {
  const {
    date,
    classId,
    divisionId,
    students,
  } = attendanceData;

  /* =========================================
     STUDENT IDS
  ========================================= */

  const studentIds = students.map(
    (student) => student.studentId
  );

  /* =========================================
     VALIDATE DIVISION & STUDENTS
  ========================================= */

  const [division, validStudents] =
    await Promise.all([
      DivisionModel.findById(
        divisionId
      ).lean(),

      StudentModel.find({
        _id: {
          $in: studentIds,
        },
        divisionId,
        status: "active",
      }).lean(),
    ]);

  /* =========================================
     VALIDATE DIVISION
  ========================================= */

  if (!division) {
    throw new ApiError(
      404,
      "Division not found"
    );
  }

  if (
    division.classId.toString() !==
    classId
  ) {
    throw new ApiError(
      400,
      "Selected division does not belong to the selected class"
    );
  }

  /* =========================================
     VALIDATE STUDENTS
  ========================================= */

  if (
    validStudents.length !==
    students.length
  ) {
    throw new ApiError(
      400,
      "One or more students are invalid or do not belong to the selected division"
    );
  }

  /* =========================================
     CHECK DUPLICATE STUDENTS
  ========================================= */

  const uniqueStudents = new Set(studentIds);

  if (
    uniqueStudents.size !==
    studentIds.length
  ) {
    throw new ApiError(
      400,
      "Duplicate students found in attendance"
    );
  }

  /* =========================================
     VALIDATE REASON
  ========================================= */

  for (const student of students) {
    if (
      ["absent", "late"].includes(
        student.status
      ) &&
      !student.reason?.trim()
    ) {
      throw new ApiError(
        400,
        "Reason is required for absent or late students."
      );
    }
  }

  /* =========================================
     NORMALIZE DATE
  ========================================= */

  const attendanceDate =
    new Date(date);

  if (
    isNaN(attendanceDate.getTime())
  ) {
    throw new ApiError(
      400,
      "Invalid attendance date."
    );
  }

  attendanceDate.setHours(
    0,
    0,
    0,
    0
  );

  /* =========================================
     ATTENDANCE SUMMARY
  ========================================= */

  const totalStudents =
    students.length;

  const presentCount =
    students.filter(
      (student) =>
        student.status ===
        "present"
    ).length;

  const absentCount =
    students.filter(
      (student) =>
        student.status ===
        "absent"
    ).length;

  const lateCount =
    students.filter(
      (student) =>
        student.status ===
        "late"
    ).length;

  /* =========================================
     CREATE OR UPDATE
  ========================================= */

  const attendance =
    await AttendanceModel.findOneAndUpdate(
      {
        divisionId,
        date: attendanceDate,
      },
      {
        classId,
        divisionId,
        markedBy: userId,
        date: attendanceDate,

        totalStudents,
        presentCount,
        absentCount,
        lateCount,

        students,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

  return attendance.populate(
    attendancePopulate
  );
};

/* =========================================
   GET ATTENDANCE BY DATE
========================================= */

export const getAttendanceByDateService =
  async (
    divisionId,
    date
  ) => {
    const attendanceDate =
      new Date(date);

    if (isNaN(attendanceDate.getTime())) {
      throw new ApiError(
        400,
        "Invalid attendance date."
      );
    }

    attendanceDate.setHours(
      0,
      0,
      0,
      0
    );

    return AttendanceModel.findOne({
      divisionId,
      date: attendanceDate,
    }).populate(attendancePopulate).lean();
  };

/* =========================================
   GET DIVISION ATTENDANCE HISTORY
========================================= */

export const getDivisionAttendanceService =
  async (
    divisionId
  ) => {
    return AttendanceModel.find({
      divisionId,
    })
      .populate(attendancePopulate)
      .sort({
        date: -1,
      })
      .lean();
  };
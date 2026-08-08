import mongoose from "mongoose";
import AttendanceModel from "../models/attendance.model.js";
import StudentModel from "../models/student.model.js";
import ClassModel from "../models/class.model.js";
import DivisionModel from "../models/division.model.js";
import ApiError from "../utils/ApiError.js";

/* =========================================
   HELPERS
========================================= */

const assertValidObjectId = (id, label = "ID") => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
};

const calculateMetrics = (stats = {}) => {
  const present = stats.present || 0;
  const absent = stats.absent || 0;
  const late = stats.late || 0;
  const leave = stats.leave || 0;
  const total = present + absent + late + leave;

  const attendancePercentage =
    total > 0 ? Number((((present + late) / total) * 100).toFixed(1)) : 0;

  return {
    total,
    present,
    absent,
    late,
    leave,
    attendancePercentage,
  };
};

/* =========================================
   1. DAILY ATTENDANCE REPORT
========================================= */

export const getDailyAttendanceReportService = async ({
  date,
  classId,
  divisionId,
}) => {
  const reportDate = date ? new Date(date) : new Date();
  if (isNaN(reportDate.getTime())) {
    throw new ApiError(400, "Invalid date format");
  }
  reportDate.setHours(0, 0, 0, 0);

  const nextDate = new Date(reportDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const matchFilter = {
    date: { $gte: reportDate, $lt: nextDate },
  };

  if (classId) {
    assertValidObjectId(classId, "Class ID");
    matchFilter.classId = new mongoose.Types.ObjectId(classId);
  }

  if (divisionId) {
    assertValidObjectId(divisionId, "Division ID");
    matchFilter.divisionId = new mongoose.Types.ObjectId(divisionId);
  }

  const [summaryData, records] = await Promise.all([
    AttendanceModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] },
          },
        },
      },
    ]),

    AttendanceModel.find(matchFilter)
      .populate("studentId", "nameEnglish admissionNumber rollNumber")
      .populate("classId", "name")
      .populate("divisionId", "name")
      .populate("markedBy", "name")
      .sort({ "studentId.rollNumber": 1 })
      .lean(),
  ]);

  const metrics = calculateMetrics(summaryData[0] || {});

  return {
    date: reportDate.toISOString().split("T")[0],
    summary: metrics,
    totalRecords: records.length,
    records,
  };
};

/* =========================================
   2. MONTHLY ATTENDANCE REPORT
========================================= */

export const getMonthlyAttendanceReportService = async ({
  month,
  year,
  classId,
  divisionId,
}) => {
  const now = new Date();
  const selectedYear = Number(year) || now.getFullYear();
  const selectedMonth = Number(month) ? Number(month) - 1 : now.getMonth();

  const startDate = new Date(selectedYear, selectedMonth, 1);
  const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

  const matchFilter = {
    date: { $gte: startDate, $lte: endDate },
  };

  if (classId) {
    assertValidObjectId(classId, "Class ID");
    matchFilter.classId = new mongoose.Types.ObjectId(classId);
  }

  if (divisionId) {
    assertValidObjectId(divisionId, "Division ID");
    matchFilter.divisionId = new mongoose.Types.ObjectId(divisionId);
  }

  const [summaryData, dailyBreakdown] = await Promise.all([
    AttendanceModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] },
          },
        },
      },
    ]),

    AttendanceModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          present: 1,
          absent: 1,
          late: 1,
          leave: 1,
          total: 1,
          attendancePercentage: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $add: ["$present", "$late"] },
                          "$total",
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
            ],
          },
        },
      },
      { $sort: { date: 1 } },
    ]),
  ]);

  const metrics = calculateMetrics(summaryData[0] || {});

  return {
    year: selectedYear,
    month: selectedMonth + 1,
    summary: metrics,
    dailyBreakdown,
  };
};

/* =========================================
   3. DIVISION ATTENDANCE REPORT
========================================= */

export const getDivisionAttendanceReportService = async (
  divisionId,
  { startDate, endDate } = {}
) => {
  assertValidObjectId(divisionId, "Division ID");

  const division = await DivisionModel.findById(divisionId).populate("classId", "name");
  if (!division) {
    throw new ApiError(404, "Division not found");
  }

  const matchFilter = {
    divisionId: new mongoose.Types.ObjectId(divisionId),
  };

  if (startDate || endDate) {
    matchFilter.date = {};
    if (startDate) matchFilter.date.$gte = new Date(startDate);
    if (endDate) matchFilter.date.$lte = new Date(endDate);
  }

  const [summaryData, studentBreakdown] = await Promise.all([
    AttendanceModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] },
          },
        },
      },
    ]),

    AttendanceModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$studentId",
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      { $unwind: "$studentInfo" },
      {
        $project: {
          _id: 0,
          studentId: "$studentInfo._id",
          admissionNumber: "$studentInfo.admissionNumber",
          nameEnglish: "$studentInfo.nameEnglish",
          rollNumber: "$studentInfo.rollNumber",
          present: 1,
          absent: 1,
          late: 1,
          leave: 1,
          total: 1,
          attendancePercentage: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $add: ["$present", "$late"] },
                          "$total",
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
            ],
          },
        },
      },
      { $sort: { rollNumber: 1, nameEnglish: 1 } },
    ]),
  ]);

  const metrics = calculateMetrics(summaryData[0] || {});

  return {
    division: {
      id: division._id,
      name: division.name,
      className: division.classId?.name || "",
    },
    summary: metrics,
    students: studentBreakdown,
  };
};

/* =========================================
   4. CLASS ATTENDANCE REPORT
========================================= */

export const getClassAttendanceReportService = async (
  classId,
  { startDate, endDate } = {}
) => {
  assertValidObjectId(classId, "Class ID");

  const classData = await ClassModel.findById(classId);
  if (!classData) {
    throw new ApiError(404, "Class not found");
  }

  const matchFilter = {
    classId: new mongoose.Types.ObjectId(classId),
  };

  if (startDate || endDate) {
    matchFilter.date = {};
    if (startDate) matchFilter.date.$gte = new Date(startDate);
    if (endDate) matchFilter.date.$lte = new Date(endDate);
  }

  const [summaryData, divisionBreakdown] = await Promise.all([
    AttendanceModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] },
          },
        },
      },
    ]),

    AttendanceModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$divisionId",
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "divisions",
          localField: "_id",
          foreignField: "_id",
          as: "divisionInfo",
        },
      },
      { $unwind: "$divisionInfo" },
      {
        $project: {
          _id: 0,
          divisionId: "$divisionInfo._id",
          divisionName: "$divisionInfo.name",
          present: 1,
          absent: 1,
          late: 1,
          leave: 1,
          total: 1,
          attendancePercentage: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $add: ["$present", "$late"] },
                          "$total",
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
            ],
          },
        },
      },
      { $sort: { divisionName: 1 } },
    ]),
  ]);

  const metrics = calculateMetrics(summaryData[0] || {});

  return {
    class: {
      id: classData._id,
      name: classData.name,
      academicYear: classData.academicYear,
    },
    summary: metrics,
    divisions: divisionBreakdown,
  };
};

/* =========================================
   5. SCHOOL ATTENDANCE REPORT
========================================= */

export const getSchoolAttendanceReportService = async ({
  startDate,
  endDate,
} = {}) => {
  const matchFilter = {};

  if (startDate || endDate) {
    matchFilter.date = {};
    if (startDate) matchFilter.date.$gte = new Date(startDate);
    if (endDate) matchFilter.date.$lte = new Date(endDate);
  }

  const [summaryData, classBreakdown] = await Promise.all([
    AttendanceModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] },
          },
        },
      },
    ]),

    AttendanceModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$classId",
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "classes",
          localField: "_id",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: "$classInfo" },
      {
        $project: {
          _id: 0,
          classId: "$classInfo._id",
          className: "$classInfo.name",
          present: 1,
          absent: 1,
          late: 1,
          leave: 1,
          total: 1,
          attendancePercentage: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $add: ["$present", "$late"] },
                          "$total",
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
            ],
          },
        },
      },
      { $sort: { className: 1 } },
    ]),
  ]);

  const metrics = calculateMetrics(summaryData[0] || {});

  return {
    summary: metrics,
    classes: classBreakdown,
  };
};

/* =========================================
   6. STUDENT ATTENDANCE HISTORY REPORT
========================================= */

export const getStudentAttendanceHistoryService = async (
  studentId,
  { startDate, endDate, page = 1, limit = 20 } = {}
) => {
  assertValidObjectId(studentId, "Student ID");

  const student = await StudentModel.findById(studentId)
    .populate("classId", "name")
    .populate("divisionId", "name");

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  const matchFilter = {
    studentId: new mongoose.Types.ObjectId(studentId),
  };

  if (startDate || endDate) {
    matchFilter.date = {};
    if (startDate) matchFilter.date.$gte = new Date(startDate);
    if (endDate) matchFilter.date.$lte = new Date(endDate);
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.max(Number(limit) || 20, 1);
  const skip = (pageNum - 1) * limitNum;

  const [summaryData, totalRecords, history] = await Promise.all([
    AttendanceModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] },
          },
        },
      },
    ]),

    AttendanceModel.countDocuments(matchFilter),

    AttendanceModel.find(matchFilter)
      .populate("markedBy", "name")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  const metrics = calculateMetrics(summaryData[0] || {});

  return {
    student: {
      id: student._id,
      admissionNumber: student.admissionNumber,
      nameEnglish: student.nameEnglish,
      rollNumber: student.rollNumber,
      className: student.classId?.name || "",
      divisionName: student.divisionId?.name || "",
    },
    summary: metrics,
    pagination: {
      totalRecords,
      currentPage: pageNum,
      totalPages: Math.ceil(totalRecords / limitNum),
      limit: limitNum,
    },
    history,
  };
};

import mongoose from "mongoose";
import AttendanceModel from "../models/attendance.model.js";
import StudentModel from "../models/student.model.js";
import DivisionModel from "../models/division.model.js";
import ApiError from "../utils/ApiError.js";
import ClassModel from "../models/class.model.js";
import UserModel from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";
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
    path: "studentId",
    select: "admissionNumber nameEnglish",
  },
];

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
     VALIDATE DATE
  ========================================= */

  const attendanceDate = new Date(date);

  if (isNaN(attendanceDate.getTime())) {
    throw new ApiError(400, "Invalid attendance date.");
  }

  attendanceDate.setHours(0, 0, 0, 0);

  /* =========================================
     VALIDATE INPUT
  ========================================= */

  if (!students || !students.length) {
    throw new ApiError(
      400,
      "Attendance list cannot be empty."
    );
  }

  const studentIds = students.map(
    (student) => student.studentId
  );

  /* =========================================
     CHECK DUPLICATE STUDENTS
  ========================================= */

  if (
    new Set(studentIds).size !==
    studentIds.length
  ) {
    throw new ApiError(
      400,
      "Duplicate students found."
    );
  }

  /* =========================================
     VALIDATE CLASS, DIVISION, USER & STUDENTS
  ========================================= */

  const [
    classData,
    division,
    teacher,
    validStudents,
  ] = await Promise.all([
    ClassModel.findById(classId).lean(),

    DivisionModel.findById(
      divisionId
    ).lean(),

    UserModel.findById(userId).lean(),

    StudentModel.find({
      _id: {
        $in: studentIds,
      },
      divisionId,
      status: "active",
    }).lean(),
  ]);

  if (!classData) {
    throw new ApiError(
      404,
      "Class not found."
    );
  }

  if (!division) {
    throw new ApiError(
      404,
      "Division not found."
    );
  }

  if (!teacher) {
    throw new ApiError(
      404,
      "Teacher not found."
    );
  }

  if (
    division.classId.toString() !==
    classId
  ) {
    throw new ApiError(
      400,
      "Selected division does not belong to the selected class."
    );
  }

  if (
    validStudents.length !==
    students.length
  ) {
    throw new ApiError(
      400,
      "One or more students are invalid or inactive."
    );
  }

  /* =========================================
     VALIDATE STATUS
  ========================================= */

  const validStatuses = ["present", "absent", "late", "leave"];
  for (const student of students) {
    if (!validStatuses.includes(student.status)) {
      throw new ApiError(
        400,
        `Invalid attendance status: ${student.status}`
      );
    }
  }

  /* =========================================
     BULK UPSERT
  ========================================= */

  const operations = students.map(
    (student) => ({
      updateOne: {
        filter: {
          studentId:
            student.studentId,
          divisionId,
          date: attendanceDate,
        },

        update: {
          $set: {
            date: attendanceDate,

            classId,

            divisionId,

            studentId:
              student.studentId,

            status:
              student.status,

            reason:
              student.reason?.trim() ||
              "",

            markedBy: userId,
          },
        },

        upsert: true,
      },
    })
  );

  try {
    await AttendanceModel.bulkWrite(
      operations,
      {
        ordered: false,
      }
    );
  } catch (error) {
    throw new ApiError(
      500,
      "Failed to save attendance."
    );
  }

  /* =========================================
     RETURN UPDATED ATTENDANCE
  ========================================= */

  return AttendanceModel.find({
    divisionId,
    date: attendanceDate,
  })
    .populate(attendancePopulate)
    .sort({
      studentId: 1,
    })
    .lean();
};

/* =========================================
   GET ATTENDANCE BY DATE
========================================= */

export const getAttendanceByDateService = async (
  divisionId,
  date
) => {
  /* =========================================
     VALIDATE DIVISION ID
  ========================================= */

  if (!divisionId) {
    throw new ApiError(
      400,
      "Division ID is required."
    );
  }

  /* =========================================
     VALIDATE DATE
  ========================================= */

  const attendanceDate = new Date(date);

  if (isNaN(attendanceDate.getTime())) {
    throw new ApiError(
      400,
      "Invalid attendance date."
    );
  }

  attendanceDate.setHours(0, 0, 0, 0);

  /* =========================================
     CHECK DIVISION EXISTS
  ========================================= */

  const division = await DivisionModel.findById(
    divisionId
  ).lean();

  if (!division) {
    throw new ApiError(
      404,
      "Division not found."
    );
  }

  /* =========================================
     GET ATTENDANCE
  ========================================= */

  const attendance = await AttendanceModel.find({
    divisionId,
    date: attendanceDate,
  })
    .populate(attendancePopulate)
    .sort({
      studentId: 1,
    })
    .lean();

  return attendance;
};

/* =========================================
   GET ATTENDANCE CALENDAR
========================================= */

export const getAttendanceCalendarService = async (
  divisionId,
  month,
  year
) => {
  if (!divisionId) {
    throw new ApiError(400, "Division ID is required.");
  }

  const division = await DivisionModel.findById(divisionId).lean();
  if (!division) {
    throw new ApiError(404, "Division not found.");
  }

  const selectedYear = Number(year) || new Date().getFullYear();
  const selectedMonth = Number(month) || (new Date().getMonth() + 1);

  if (selectedMonth < 1 || selectedMonth > 12) {
    throw new ApiError(400, "Invalid month value.");
  }

  const startDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(selectedYear, selectedMonth, 0, 23, 59, 59, 999));

  // Count active students in division
  const totalStudentsInDivision = await StudentModel.countDocuments({
    divisionId,
    status: "active",
  });

  const aggregateResults = await AttendanceModel.aggregate([
    {
      $match: {
        divisionId: new mongoose.Types.ObjectId(divisionId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        totalMarked: { $sum: 1 },
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
    { $sort: { _id: 1 } },
  ]);

  const statsMap = new Map();
  for (const item of aggregateResults) {
    statsMap.set(item._id, item);
  }

  const totalDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = [];

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayStat = statsMap.get(dateStr);

    if (dayStat) {
      const total = totalStudentsInDivision || dayStat.totalMarked;
      const presentCount = dayStat.present;
      const attendancePercentage =
        total > 0 ? Number(((presentCount / total) * 100).toFixed(1)) : 0;

      days.push({
        date: dateStr,
        marked: true,
        total,
        present: dayStat.present,
        absent: dayStat.absent,
        late: dayStat.late,
        leave: dayStat.leave,
        attendancePercentage,
      });
    } else {
      days.push({
        date: dateStr,
        marked: false,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        attendancePercentage: 0,
      });
    }
  }

  return {
    year: selectedYear,
    month: selectedMonth,
    divisionId,
    days,
  };
};

/* =========================================
   GET DIVISION ATTENDANCE HISTORY / DATE RANGE
========================================= */

export const getDivisionAttendanceService = async (
  divisionId,
  options = {}
) => {
  const division = await DivisionModel.findById(divisionId).lean();
  if (!division) {
    throw new ApiError(404, "Division not found.");
  }

  // Handle both signatures: options object or page/limit arguments
  let page = 1;
  let limit = 20;
  let startDate, endDate, status, studentId, classId, sortBy = "date", sortOrder = "desc";

  if (typeof options === "object" && options !== null) {
    page = options.page || 1;
    limit = options.limit || 20;
    startDate = options.startDate;
    endDate = options.endDate;
    status = options.status;
    studentId = options.studentId;
    classId = options.classId;
    if (options.sortBy) sortBy = options.sortBy;
    if (options.sortOrder) sortOrder = options.sortOrder;
  } else {
    page = arguments[1] || 1;
    limit = arguments[2] || 20;
  }

  page = Math.max(1, Number(page) || 1);
  limit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (page - 1) * limit;

  const queryFilter = { divisionId };

  if (classId && mongoose.Types.ObjectId.isValid(classId)) {
    queryFilter.classId = classId;
  }

  if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
    queryFilter.studentId = studentId;
  }

  if (status) {
    queryFilter.status = String(status).toLowerCase();
  }

  if (startDate || endDate) {
    queryFilter.date = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        queryFilter.date.$gte = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        queryFilter.date.$lte = end;
      }
    }
  }

  const sortDirection = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;
  const sortOptions = {};
  sortOptions[sortBy] = sortDirection;
  if (sortBy !== "createdAt") {
    sortOptions.createdAt = -1;
  }

  const totalRecords = await AttendanceModel.countDocuments(queryFilter);

  const attendance = await AttendanceModel.find(queryFilter)
    .populate(attendancePopulate)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    attendance,
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
   UPLOAD ATTENDANCE DOCUMENTS
========================================= */

export const uploadAttendanceFileService = async (
  attendanceId,
  files,
  userId
) => {
  if (!files || files.length === 0) {
    throw new ApiError(
      400,
      "Please upload at least one document."
    );
  }

  const attendance =
    await AttendanceModel.findById(attendanceId);

  if (!attendance) {
    throw new ApiError(
      404,
      "Attendance record not found."
    );
  }

  /* =========================================
     LIMIT DOCUMENTS
  ========================================= */

  if (
    attendance.documents.length +
      files.length >
    10
  ) {
    throw new ApiError(
      400,
      "Maximum 10 documents are allowed."
    );
  }

  /* =========================================
     PREVENT DUPLICATE FILES
  ========================================= */

  for (const file of files) {
    const exists =
      attendance.documents.some(
        (doc) =>
          doc.publicId === file.filename
      );

    if (exists) {
      continue;
    }

    attendance.documents.push({
      url: file.path,
      publicId: file.filename,
      fileName: file.originalname,
      uploadedBy: userId,
    });
  }

  const updatedDoc = await AttendanceModel.findById(attendanceId)
    .populate(attendancePopulate)
    .lean();

  return formatAttendanceResponse(updatedDoc);
};


/* =========================================
   REPLACE ATTENDANCE DOCUMENT
========================================= */

export const replaceAttendanceDocumentService = async (
  attendanceId,
  documentId,
  file,
  userId
) => {
  const attendance = await AttendanceModel.findById(attendanceId);

  if (!attendance) {
    throw new ApiError(
      404,
      "Attendance record not found."
    );
  }

  const document = attendance.documents.id(documentId);

  if (!document) {
    throw new ApiError(
      404,
      "Document not found."
    );
  }

  if (document.publicId) {
    try {
      await cloudinary.uploader.destroy(document.publicId, { resource_type: "image" });
      await cloudinary.uploader.destroy(document.publicId, { resource_type: "raw" });
    } catch (err) {
      console.error("Cloudinary delete error on replace:", err);
    }
  }

  document.url = file.path;
  document.publicId = file.filename;
  document.fileName = file.originalname;
  document.uploadedBy = userId;
  document.uploadedAt = new Date();

  await attendance.save();

  return AttendanceModel.findById(attendanceId)
    .populate(attendancePopulate)
    .lean();
};

/* =========================================
   DELETE ATTENDANCE DOCUMENT
========================================= */

export const deleteAttendanceDocumentService = async (
  attendanceId,
  documentId
) => {
  const attendance =
    await AttendanceModel.findById(attendanceId);

  if (!attendance) {
    throw new ApiError(
      404,
      "Attendance record not found."
    );
  }

  const document =
    attendance.documents.id(documentId);

  if (!document) {
    throw new ApiError(
      404,
      "Document not found."
    );
  }

  /* =========================================
     DELETE FROM CLOUDINARY
  ========================================= */

  if (document.publicId) {
    try {
      await cloudinary.uploader.destroy(document.publicId, { resource_type: "image" });
      await cloudinary.uploader.destroy(document.publicId, { resource_type: "raw" });
    } catch (err) {
      console.error("Cloudinary delete error on document delete:", err);
    }
  }

  /* =========================================
     REMOVE DOCUMENT
  ========================================= */

  document.deleteOne();

  await attendance.save();

  return AttendanceModel.findById(
    attendanceId
  )
    .populate(attendancePopulate)
    .lean();
};

const formatAttendanceResponse = (attendanceDoc) => {
  if (!attendanceDoc) return null;
  const attendance =
    typeof attendanceDoc.toObject === "function"
      ? attendanceDoc.toObject()
      : { ...attendanceDoc };

  const firstDocUrl = attendance.documents?.[0]?.url || null;

  return {
    ...attendance,
    file: firstDocUrl,
    documentUrl: firstDocUrl,
    attachment: attendance.documents?.[0] || null,
  };
};

/* =========================================
   UPDATE ATTENDANCE
========================================= */

export const updateAttendanceService = async (
  attendanceId,
  updateData = {},
  userId,
  files = []
) => {
  const { status, reason } = updateData;

  const attendance = await AttendanceModel.findById(attendanceId);

  if (!attendance) {
    throw new ApiError(404, "Attendance record not found.");
  }

  if (status) {
    const validStatus = ["present", "absent", "late", "leave"];
    if (!validStatus.includes(status)) {
      throw new ApiError(400, "Invalid attendance status.");
    }
    attendance.status = status;
  }

  if (reason !== undefined) {
    attendance.reason = typeof reason === "string" ? reason.trim() : "";
  }

  attendance.markedBy = userId;

  if (files && files.length > 0) {
    for (const file of files) {
      const exists = attendance.documents.some(
        (doc) => doc.publicId === file.filename
      );
      if (!exists) {
        attendance.documents.push({
          url: file.path,
          publicId: file.filename,
          fileName: file.originalname,
          uploadedBy: userId,
        });
      }
    }
  }

  await attendance.save();

  const updatedDoc = await AttendanceModel.findById(attendanceId)
    .populate(attendancePopulate)
    .lean();

  return formatAttendanceResponse(updatedDoc);
};




/* =========================================
   DELETE ATTENDANCE
========================================= */

export const deleteAttendanceService = async (
  attendanceId,
  confirmDelete
) => {
  /* =========================================
     CONFIRM DELETE
  ========================================= */

  if (!confirmDelete) {
    throw new ApiError(
      400,
      "Please confirm before deleting this attendance record."
    );
  }

  /* =========================================
     FIND ATTENDANCE
  ========================================= */

  const attendance =
    await AttendanceModel.findById(
      attendanceId
    );

  if (!attendance) {
    throw new ApiError(
      404,
      "Attendance record not found."
    );
  }

  /* =========================================
     DELETE DOCUMENTS FROM CLOUDINARY
     (Uncomment if using Cloudinary)
  ========================================= */

  /*
  for (const document of attendance.documents) {
    await cloudinary.uploader.destroy(
      document.publicId
    );
  }
  */

  /* =========================================
     DELETE ATTENDANCE
  ========================================= */

  await attendance.deleteOne();

  return {
    success: true,
    deletedAttendanceId: attendanceId,
    message:
      "Attendance deleted successfully.",
  };
};
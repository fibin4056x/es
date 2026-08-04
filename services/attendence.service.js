import AttendanceModel from "../models/attendance.model.js";
import StudentModel from "../models/student.model.js";
import DivisionModel from "../models/division.model.js";
import ApiError from "../utils/ApiError.js";
import ClassModel from "../models/class.model.js";
import UserModel from "../models/user.model.js";
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
     VALIDATE STATUS & REASON
  ========================================= */

  for (const student of students) {
    if (
      ["absent", "late", "leave"].includes(
        student.status
      ) &&
      !student.reason?.trim()
    ) {
      throw new ApiError(
        400,
        `${student.status} requires a reason.`
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
   GET DIVISION ATTENDANCE HISTORY
========================================= */

export const getDivisionAttendanceService = async (
  divisionId,
  page = 1,
  limit = 20
) => {
  /* =========================================
     VALIDATE DIVISION
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

  page = Number(page);
  limit = Number(limit);

  const skip = (page - 1) * limit;

  /* =========================================
     GET TOTAL RECORDS
  ========================================= */

  const totalRecords =
    await AttendanceModel.countDocuments({
      divisionId,
    });

  /* =========================================
     GET HISTORY
  ========================================= */

  const attendance =
    await AttendanceModel.find({
      divisionId,
    })
      .populate(attendancePopulate)
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

  return {
    attendance,
    pagination: {
      totalRecords,
      currentPage: page,
      totalPages: Math.ceil(
        totalRecords / limit
      ),
      limit,
      hasNextPage:
        page * limit < totalRecords,
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

  await attendance.save();

  return AttendanceModel.findById(
    attendanceId
  )
    .populate(attendancePopulate)
    .lean();
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

  /*
    Delete old file from Cloudinary here
    Example:

    await cloudinary.uploader.destroy(document.publicId);
  */

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

  /*
  await cloudinary.uploader.destroy(
    document.publicId
  );
  */

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

/* =========================================
   UPDATE ATTENDANCE
========================================= */

export const updateAttendanceService = async (
  attendanceId,
  updateData,
  userId
) => {
  const {
    status,
    reason,
  } = updateData;

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
     VALIDATE STATUS
  ========================================= */

  const validStatus = [
    "present",
    "absent",
    "late",
    "leave",
  ];

  if (!validStatus.includes(status)) {
    throw new ApiError(
      400,
      "Invalid attendance status."
    );
  }

  /* =========================================
     VALIDATE REASON
  ========================================= */

  if (
    ["absent", "late", "leave"].includes(status) &&
    !reason?.trim()
  ) {
    throw new ApiError(
      400,
      `Reason is required for ${status}.`
    );
  }

  attendance.status = status;
  attendance.reason =
    reason?.trim() || "";

  attendance.markedBy = userId;

  await attendance.save();

  return AttendanceModel.findById(
    attendanceId
  )
    .populate(attendancePopulate)
    .lean();
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
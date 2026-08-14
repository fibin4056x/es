import mongoose from "mongoose";
import ReportModel from "../models/report.model.js";
import StudentModel from "../models/student.model.js";
import UserModel from "../models/user.model.js";
import DivisionModel from "../models/division.model.js";
import ApiError from "../utils/ApiError.js";
import cloudinary from "../config/cloudinary.js";

/* =========================================
   POPULATE SCHEMAS
========================================= */

const reportPopulate = [
  {
    path: "studentId",
    select: "admissionNumber nameEnglish rollNumber classId divisionId",
    populate: [
      { path: "classId", select: "name" },
      { path: "divisionId", select: "name" },
    ],
  },
  {
    path: "senderId",
    select: "name email role avatar",
  },
  {
    path: "recipientId",
    select: "name email role avatar",
  },
];

/* =========================================
   CREATE / COMPOSE REPORT
========================================= */

export const createReportService = async (reportData, sender, files = []) => {
  const { studentId, recipientId, subject, body } = reportData;

  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    throw new ApiError(400, "Valid Student ID is required.");
  }

  if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
    throw new ApiError(400, "Valid Recipient ID is required.");
  }

  if (!subject || !subject.trim()) {
    throw new ApiError(400, "Report subject is required.");
  }

  if (!body || !body.trim()) {
    throw new ApiError(400, "Report message body is required.");
  }

  const [student, recipient] = await Promise.all([
    StudentModel.findById(studentId).lean(),
    UserModel.findById(recipientId).lean(),
  ]);

  if (!student) {
    throw new ApiError(404, "Student not found.");
  }

  if (!recipient) {
    throw new ApiError(404, "Recipient user not found.");
  }

  // Teacher authorization check: teacher can only report on assigned division students
  if (sender.role === "teacher") {
    const isAssigned = await DivisionModel.exists({
      _id: student.divisionId,
      assignedTeacher: sender.id,
    });

    // Also check if sender is the recipient or recipient is principal/assigned teacher
    if (!isAssigned && recipient.role !== "principal") {
      throw new ApiError(
        403,
        "You are not authorized to create a report for students outside your assigned divisions."
      );
    }
  }

  // Process attachments
  const attachments = (files || []).map((file) => ({
    url: file.path,
    publicId: file.filename,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
  }));

  const newReport = await ReportModel.create({
    studentId,
    senderId: sender.id,
    recipientId,
    subject: subject.trim(),
    body: body.trim(),
    attachments,
    status: "sent",
    isRead: false,
  });

  return ReportModel.findById(newReport._id).populate(reportPopulate).lean();
};

/* =========================================
   GET INBOX REPORTS
========================================= */

export const getInboxReportsService = async (userId, options = {}) => {
  let page = Math.max(1, Number(options.page) || 1);
  let limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {
    recipientId: new mongoose.Types.ObjectId(userId),
    status: "sent",
  };

  if (options.studentId && mongoose.Types.ObjectId.isValid(options.studentId)) {
    filter.studentId = new mongoose.Types.ObjectId(options.studentId);
  }

  if (options.isRead !== undefined && options.isRead !== "") {
    filter.isRead = options.isRead === "true" || options.isRead === true;
  }

  if (options.startDate || options.endDate) {
    filter.createdAt = {};
    if (options.startDate) {
      const start = new Date(options.startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
  }

  if (options.search && options.search.trim()) {
    const searchRegex = new RegExp(options.search.trim(), "i");
    filter.$or = [{ subject: searchRegex }, { body: searchRegex }];
  }

  const totalRecords = await ReportModel.countDocuments(filter);

  const items = await ReportModel.find(filter)
    .populate(reportPopulate)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    items,
    pagination: {
      currentPage: page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit) || 1,
      hasNextPage: page * limit < totalRecords,
      hasPreviousPage: page > 1,
    },
  };
};

/* =========================================
   GET SENT REPORTS
========================================= */

export const getSentReportsService = async (userId, options = {}) => {
  let page = Math.max(1, Number(options.page) || 1);
  let limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {
    senderId: new mongoose.Types.ObjectId(userId),
  };

  if (options.studentId && mongoose.Types.ObjectId.isValid(options.studentId)) {
    filter.studentId = new mongoose.Types.ObjectId(options.studentId);
  }

  if (options.recipientId && mongoose.Types.ObjectId.isValid(options.recipientId)) {
    filter.recipientId = new mongoose.Types.ObjectId(options.recipientId);
  }

  if (options.startDate || options.endDate) {
    filter.createdAt = {};
    if (options.startDate) {
      const start = new Date(options.startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
  }

  if (options.search && options.search.trim()) {
    const searchRegex = new RegExp(options.search.trim(), "i");
    filter.$or = [{ subject: searchRegex }, { body: searchRegex }];
  }

  const totalRecords = await ReportModel.countDocuments(filter);

  const items = await ReportModel.find(filter)
    .populate(reportPopulate)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    items,
    pagination: {
      currentPage: page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit) || 1,
      hasNextPage: page * limit < totalRecords,
      hasPreviousPage: page > 1,
    },
  };
};

/* =========================================
   GET REPORT BY ID
========================================= */

export const getReportByIdService = async (reportId, userId, userRole) => {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new ApiError(400, "Invalid Report ID.");
  }

  const report = await ReportModel.findById(reportId);

  if (!report) {
    throw new ApiError(404, "Report not found.");
  }

  const isSender = report.senderId.toString() === userId.toString();
  const isRecipient = report.recipientId.toString() === userId.toString();

  if (!isSender && !isRecipient && userRole !== "principal") {
    throw new ApiError(403, "Access forbidden to this report.");
  }

  // Mark as read if recipient opens it
  if (isRecipient && !report.isRead) {
    report.isRead = true;
    report.readAt = new Date();
    await report.save();
  }

  return ReportModel.findById(reportId).populate(reportPopulate).lean();
};

/* =========================================
   MARK REPORT READ
========================================= */

export const markReportReadService = async (
  reportId,
  userId,
  isRead = true,
  userRole = ""
) => {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new ApiError(400, "Invalid Report ID.");
  }

  const report = await ReportModel.findById(reportId);

  if (!report) {
    throw new ApiError(404, "Report not found.");
  }

  const isSender = report.senderId.toString() === userId.toString();
  const isRecipient = report.recipientId.toString() === userId.toString();

  if (!isRecipient && !isSender && userRole !== "principal") {
    throw new ApiError(403, "Access forbidden to update this report status.");
  }

  report.isRead = Boolean(isRead);
  report.readAt = isRead ? new Date() : null;

  await report.save();

  return ReportModel.findById(reportId).populate(reportPopulate).lean();
};

/* =========================================
   DELETE REPORT
========================================= */

export const deleteReportService = async (reportId, userId, userRole) => {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new ApiError(400, "Invalid Report ID.");
  }

  const report = await ReportModel.findById(reportId);

  if (!report) {
    throw new ApiError(404, "Report not found.");
  }

  const isSender = report.senderId.toString() === userId.toString();
  const isRecipient = report.recipientId.toString() === userId.toString();

  if (!isSender && !isRecipient && userRole !== "principal") {
    throw new ApiError(403, "Access forbidden to delete this report.");
  }

  // Destroy Cloudinary assets if present
  for (const attachment of report.attachments) {
    if (attachment.publicId) {
      try {
        await cloudinary.uploader.destroy(attachment.publicId, {
          resource_type: "image",
        });
        await cloudinary.uploader.destroy(attachment.publicId, {
          resource_type: "raw",
        });
      } catch (err) {
        console.error(`Failed to delete Cloudinary asset ${attachment.publicId}:`, err);
      }
    }
  }

  await report.deleteOne();

  return {
    success: true,
    deletedReportId: reportId,
    message: "Report deleted successfully.",
  };
};

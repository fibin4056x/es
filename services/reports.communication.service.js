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

const formatReportResponse = (reportDoc) => {
  if (!reportDoc) return null;
  const report =
    typeof reportDoc.toObject === "function"
      ? reportDoc.toObject()
      : { ...reportDoc };

  const creator = report.senderId || null;

  return {
    ...report,
    title: report.subject || report.title || "",
    subject: report.subject || report.title || "",
    message: report.body || report.message || report.content || "",
    body: report.body || report.message || report.content || "",
    createdBy: creator,
    submittedBy: creator,
  };
};

/* =========================================
   CREATE / COMPOSE REPORT
========================================= */

export const createReportService = async (reportData, sender, files = []) => {
  // CRITICAL SECURITY REQUIREMENT: Extract authenticated user ID.
  // Ignore any client-supplied createdBy, senderId, authorId, or userId.
  const authenticatedUserId = new mongoose.Types.ObjectId(sender.id || sender._id);

  const { studentId, recipientId } = reportData;
  const subject = (reportData.subject || reportData.title || "").trim();
  const body = (reportData.body || reportData.message || reportData.content || "").trim();

  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    throw new ApiError(400, "Valid Student ID is required.");
  }

  if (!subject) {
    throw new ApiError(400, "Report subject is required.");
  }

  if (!body) {
    throw new ApiError(400, "Report message body is required.");
  }

  const student = await StudentModel.findById(studentId).lean();
  if (!student) {
    throw new ApiError(404, "Student not found.");
  }

  // Recipient selection is OPTIONAL for report creation.
  let validRecipientId = null;
  if (recipientId && mongoose.Types.ObjectId.isValid(recipientId)) {
    const recipient = await UserModel.findById(recipientId).lean();
    if (recipient) {
      validRecipientId = recipient._id;
    }
  }

  // Teacher authorization check: teacher can create reports for active students
  if (sender.role === "teacher") {
    const isAssigned = await DivisionModel.exists({
      _id: student.divisionId,
      assignedTeacher: authenticatedUserId,
    });

    if (!isAssigned && student.status !== "active") {
      throw new ApiError(
        403,
        "You are not authorized to create a report for this student."
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
    studentId: new mongoose.Types.ObjectId(studentId),
    senderId: authenticatedUserId,
    recipientId: validRecipientId,
    subject,
    body,
    attachments,
    status: "sent",
    isRead: false,
  });

  const createdReportDoc = await ReportModel.findById(newReport._id)
    .populate(reportPopulate)
    .lean();

  return formatReportResponse(createdReportDoc);
};

/* =========================================
   GET ALL REPORTS (Unified for Principal & Teacher)
========================================= */

export const getAllReportsService = async (user, options = {}) => {
  let page = Math.max(1, Number(options.page) || 1);
  let limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {};

  // Role-based retrieval policy:
  // Principals can view all reports across the school.
  // Teachers can view reports they created or were sent to them.
  if (user.role !== "principal") {
    const userIdObj = new mongoose.Types.ObjectId(user.id || user._id);
    filter.$or = [
      { senderId: userIdObj },
      { recipientId: userIdObj },
    ];
  }

  if (options.studentId && mongoose.Types.ObjectId.isValid(options.studentId)) {
    filter.studentId = new mongoose.Types.ObjectId(options.studentId);
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
    const searchFilter = [{ subject: searchRegex }, { body: searchRegex }];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchFilter }];
      delete filter.$or;
    } else {
      filter.$or = searchFilter;
    }
  }

  const totalRecords = await ReportModel.countDocuments(filter);

  const rawItems = await ReportModel.find(filter)
    .populate(reportPopulate)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const items = rawItems.map(formatReportResponse);

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
   GET INBOX REPORTS
========================================= */

export const getInboxReportsService = async (userId, options = {}, userRole = "teacher") => {
  if (userRole === "principal") {
    return getAllReportsService({ id: userId, role: userRole }, options);
  }
  let page = Math.max(1, Number(options.page) || 1);
  let limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {
    $or: [
      { recipientId: new mongoose.Types.ObjectId(userId) },
      { senderId: new mongoose.Types.ObjectId(userId) },
    ],
    status: "sent",
  };

  if (options.studentId && mongoose.Types.ObjectId.isValid(options.studentId)) {
    filter.studentId = new mongoose.Types.ObjectId(options.studentId);
  }

  const totalRecords = await ReportModel.countDocuments(filter);

  const rawItems = await ReportModel.find(filter)
    .populate(reportPopulate)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const items = rawItems.map(formatReportResponse);

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

export const getSentReportsService = async (userId, options = {}, userRole = "teacher") => {
  if (userRole === "principal") {
    return getAllReportsService({ id: userId, role: userRole }, options);
  }
  let page = Math.max(1, Number(options.page) || 1);
  let limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {
    senderId: new mongoose.Types.ObjectId(userId),
  };

  if (options.studentId && mongoose.Types.ObjectId.isValid(options.studentId)) {
    filter.studentId = new mongoose.Types.ObjectId(options.studentId);
  }

  const totalRecords = await ReportModel.countDocuments(filter);

  const rawItems = await ReportModel.find(filter)
    .populate(reportPopulate)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const items = rawItems.map(formatReportResponse);

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

  const reportDoc = await ReportModel.findById(reportId).populate(reportPopulate).lean();
  return formatReportResponse(reportDoc);
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

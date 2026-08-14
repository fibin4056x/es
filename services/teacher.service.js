import User from "../models/user.model.js";
import DivisionModel from "../models/division.model.js";
import bcrypt from "bcryptjs";
import ApiError from "../utils/ApiError.js";

import { sendTeacherAccountCreatedEmail } from "./email.service.js";

export const createTeacherService = async (teacherData) => {
  const email = teacherData.email?.trim().toLowerCase();
  const existingTeacher = await User.findOne({ email });
  if (existingTeacher) {
    throw new ApiError(400, "Teacher with this email already exists");
  }

  const teacher = await User.create({
    ...teacherData,
    email,
    role: "teacher",
    isActive: true,
    emailVerified: false,
    firstLoginCompleted: false,
    status: "pending_verification",
  });

  // Send welcome notification email asynchronously
  sendTeacherAccountCreatedEmail({ to: teacher.email, name: teacher.name })
    .catch((err) => console.error("Welcome email warning:", err.message));

  return teacher;
};

export const getAllTeacherService = async (options = {}) => {
  let page = Math.max(1, Number(options.page) || 1);
  let limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = { role: "teacher" };
  if (options.status) {
    filter.status = options.status;
  }
  if (options.search && options.search.trim()) {
    const searchRegex = new RegExp(options.search.trim(), "i");
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
    ];
  }

  const totalRecords = await User.countDocuments(filter);
  const teachers = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    teachers,
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

export const getTeacherByIdService = async (teacherId) => {
  const teacher = await User.findOne({
    _id: teacherId,
    role: "teacher",
  }).select("-password");

  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  return teacher;
};

export const updateTeacherStatusService = async (
  teacherId,
  status
) => {
  const teacher = await User.findOneAndUpdate(
    {
      _id: teacherId,
      role: "teacher",
    },
    {
      status,
    },
    { new: true }
  ).select("-password");

  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  return teacher;
};

export const updateTeacherService = async (teacherId, teacherData) => {
  if (teacherData.password) {
    teacherData.password = await bcrypt.hash(teacherData.password, 10);
  }

  const teacher = await User.findOneAndUpdate(
    {
      _id: teacherId,
      role: "teacher",
    },
    {
      $set: teacherData,
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).select("-password");

  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  return teacher;
};

export const deleteTeacherService = async (teacherId) => {
  // Check if teacher exists 
  const teacher = await User.findOne({
    _id: teacherId,
    role: "teacher",
  });

  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  // Check if teacher is assigned to any division
  const assignedDivision = await DivisionModel.exists({
    assignedTeacher: teacherId,
  });

  if (assignedDivision) {
    throw new ApiError(
      400,
      "Cannot delete teacher because the teacher is assigned to a division."
    );
  }

  // Safe to delete
  await User.findOneAndDelete({
    _id: teacherId,
    role: "teacher",
  });

  return {
    message: "Teacher deleted successfully",
  };
};
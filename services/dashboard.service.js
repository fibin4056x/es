import User from "../models/user.model.js";
import Student from "../models/student.model.js";
import ClassModel from "../models/class.model.js";
import Attendance from "../models/attendence.model.js";

export const dashboardStatsService = async () => {
  const students = await Student.countDocuments({
    status: "active",
  });

  const teachers = await User.countDocuments({
    role: "teacher",
    status: "active",
  });

  const classes = await ClassModel.countDocuments({
    status: "active",
  });

  const attendance = 95;

  return {
    students,
    teachers,
    classes,
    attendance,
  };
};
import User from "../models/user.model.js";
import Student from "../models/student.model.js";
import ClassModel from "../models/class.model.js";
import AttendanceModel from "../models/attendance.model.js";

export const dashboardStatsService = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    students,
    teachers,
    classes,
    todayAttendance,
  ] = await Promise.all([
    Student.countDocuments({
      status: "active",
    }),

    User.countDocuments({
      role: "teacher",
      status: "active",
    }),

    ClassModel.countDocuments({
      status: "active",
    }),

    AttendanceModel.countDocuments({
      date: today,
    }),
  ]);

  return {
    students,
    teachers,
    classes,
    attendance: todayAttendance,
  };
};
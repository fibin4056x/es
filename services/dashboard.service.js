import User from "../models/user.model.js";
import StudentModel from "../models/student.model.js";
import ClassModel from "../models/class.model.js";
import AttendanceModel from "../models/attendance.model.js";
import AcademicCalendar from "../models/academicCalendar.model.js";

/* =========================================
   WEEKLY ATTENDANCE CHART
========================================= */

const getWeeklyAttendanceChart = async () => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  const weeklyChart = await AttendanceModel.aggregate([
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: "$date",
        totalStudents: { $sum: 1 },
        attendedStudents: {
          $sum: {
            $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,

        day: "$_id",

        rate: {
          $round: [
            {
              $cond: [
                {
                  $eq: ["$totalStudents", 0],
                },
                0,
                {
                  $multiply: [
                    {
                      $divide: [
                        "$attendedStudents",
                        "$totalStudents",
                      ],
                    },
                    100,
                  ],
                },
              ],
            },
            1,
          ],
        },
      },
    },
    {
      $sort: {
        day: 1,
      },
    },
  ]);

  return weeklyChart;
};
/* =========================================
   MONTHLY ATTENDANCE CHART
========================================= */

const getMonthlyAttendanceChart = async () => {
  const now = new Date();

  const startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  );
  endDate.setHours(23, 59, 59, 999);

  const monthlyChart = await AttendanceModel.aggregate([
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: {
          week: {
            $ceil: {
              $divide: [
                {
                  $dayOfMonth: "$date",
                },
                7,
              ],
            },
          },
        },
        totalStudents: { $sum: 1 },
        attendedStudents: {
          $sum: {
            $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,

        day: {
          $concat: [
            "Week ",
            {
              $toString: "$_id.week",
            },
          ],
        },

        rate: {
          $round: [
            {
              $cond: [
                {
                  $eq: [
                    "$totalStudents",
                    0,
                  ],
                },
                0,
                {
                  $multiply: [
                    {
                      $divide: [
                        "$attendedStudents",
                        "$totalStudents",
                      ],
                    },
                    100,
                  ],
                },
              ],
            },
            1,
          ],
        },

        week: "$_id.week",
      },
    },
    {
      $sort: {
        week: 1,
      },
    },
    {
      $project: {
        week: 0,
      },
    },
  ]);

  return monthlyChart;
};;

/* =========================================
   TOP & LOWEST ATTENDANCE DIVISIONS
========================================= */

const getDivisionAttendanceRankings = async (limitCount = 5, sortDirection = -1) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const rankings = await AttendanceModel.aggregate([
    {
      $match: {
        date: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: "$divisionId",
        total: { $sum: 1 },
        attended: {
          $sum: {
            $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        total: 1,
        attended: 1,
        attendanceRate: {
          $round: [
            {
              $cond: [
                { $eq: ["$total", 0] },
                0,
                {
                  $multiply: [{ $divide: ["$attended", "$total"] }, 100],
                },
              ],
            },
            1,
          ],
        },
      },
    },
    { $sort: { attendanceRate: sortDirection, total: -1 } },
    { $limit: limitCount },
    {
      $lookup: {
        from: "divisions",
        localField: "_id",
        foreignField: "_id",
        as: "divisionInfo",
      },
    },
    { $unwind: { path: "$divisionInfo", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "classes",
        localField: "divisionInfo.classId",
        foreignField: "_id",
        as: "classInfo",
      },
    },
    { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        divisionId: "$_id",
        divisionName: "$divisionInfo.name",
        className: "$classInfo.name",
        attendanceRate: 1,
        totalRecords: "$total",
      },
    },
  ]);

  return rankings;
};

/* =========================================
   DASHBOARD STATS & REPORTS
========================================= */

export const dashboardStatsService = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  const [
    activeStudents,
    inactiveStudents,
    totalStudents,
    activeTeachers,
    inactiveTeachers,
    totalTeachers,
    classesCount,
    todayAttendance,
    recentTeachers,
    recentStudents,
    weeklyChart,
    monthlyChart,
    topDivisions,
    lowestDivisions,
    holidayCount,
  ] = await Promise.all([
    StudentModel.countDocuments({ status: "active" }),
    StudentModel.countDocuments({ status: "inactive" }),
    StudentModel.countDocuments({}),
    User.countDocuments({ role: "teacher", status: "active" }),
    User.countDocuments({ role: "teacher", status: { $ne: "active" } }),
    User.countDocuments({ role: "teacher" }),
    ClassModel.countDocuments({ status: "active" }),

    AttendanceModel.aggregate([
      { $match: { date: today } },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
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
      {
        $project: {
          _id: 0,
          totalStudents: 1,
          present: 1,
          absent: 1,
          late: 1,
          leave: 1,
          percentage: {
            $cond: [
              { $eq: ["$totalStudents", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $add: ["$present", "$late"] },
                          "$totalStudents",
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
    ]),

    User.find({ role: "teacher", status: "active" })
      .select("name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    StudentModel.find({ status: "active" })
      .select("nameEnglish admissionNumber photo status classId")
      .populate("classId", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    getWeeklyAttendanceChart(),
    getMonthlyAttendanceChart(),
    getDivisionAttendanceRankings(5, -1),
    getDivisionAttendanceRankings(5, 1),
    
    // Holiday Count in current month
    AcademicCalendar.countDocuments({
      status: "active",
      category: { $in: ["holiday", "vacation"] },
      startDate: { $lte: lastDayOfMonth },
      endDate: { $gte: firstDayOfMonth },
    }),
  ]);

  const attendance = todayAttendance[0] || {
    totalStudents: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    percentage: 0,
  };

  return {
    studentStats: {
      active: activeStudents,
      inactive: inactiveStudents,
      total: totalStudents,
    },
    teacherStats: {
      active: activeTeachers,
      inactive: inactiveTeachers,
      total: totalTeachers,
    },
    students: activeStudents,
    teachers: activeTeachers,
    classes: classesCount,
    holidayCount,
    attendance,
    attendanceChart: {
      weekly: weeklyChart,
      monthly: monthlyChart,
    },
    topDivisions,
    lowestDivisions,
    recentTeachers,
    recentStudents,
  };
};

export const dashboardPreviewStatsService = async () => {
  const [studentsCount, teachersCount, classesCount, recentStudents, firstTeacher] = await Promise.all([
    StudentModel.countDocuments({ status: "active" }),
    User.countDocuments({ role: "teacher", status: "active" }),
    ClassModel.countDocuments({ status: "active" }),
    StudentModel.find({ status: "active" })
      .select("nameEnglish classId")
      .populate("classId", "name")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean(),
    User.findOne({ role: "teacher", status: "active" }).select("name").lean()
  ]);

  const attendanceRate = 94.2;
  const presentCount = Math.round(studentsCount * (attendanceRate / 100)) || 0;

  const studentsList = recentStudents.map(s => ({
    name: s.nameEnglish,
    grade: s.classId?.name || "Grade 10"
  }));

  if (studentsList.length === 0) {
    studentsList.push(
      { name: "Alex Johnson", grade: "Class 1" },
      { name: "Sophia Williams", grade: "Class 2" },
      { name: "Ryan Garcia", grade: "Class 1" }
    );
  }

  const activeClasses = await ClassModel.find({ status: "active" }).limit(2).lean();
  const classesSchedule = activeClasses.map((c, index) => ({
    time: index === 0 ? "09:30 AM" : "10:15 AM",
    subject: `${c.name} Lectures`,
    teacher: firstTeacher ? `${firstTeacher.name}` : "Teacher One"
  }));

  if (classesSchedule.length === 0) {
    classesSchedule.push(
      { time: "09:30 AM", subject: "Advanced Mathematics", teacher: "Teacher One" },
      { time: "10:15 AM", subject: "Physics Lab Experiments", teacher: "Teacher Two" }
    );
  }

  const activityLogs = [];
  if (recentStudents.length > 0) {
    activityLogs.push({
      type: "blue",
      text: `Report cards generated for ${recentStudents[0].classId?.name || "Class 1"}`,
      time: "2 mins ago"
    });
    if (recentStudents.length > 1) {
      activityLogs.push({
        type: "green",
        text: `Leave application filed by ${recentStudents[1].nameEnglish}'s Parents`,
        time: "10 mins ago"
      });
    } else {
      activityLogs.push({
        type: "green",
        text: `Leave application filed by ${recentStudents[0].nameEnglish}'s Parents`,
        time: "10 mins ago"
      });
    }
  } else {
    activityLogs.push(
      { type: "blue", text: "Report cards generated for Class 1", time: "2 mins ago" },
      { type: "green", text: "Leave application filed by Anna's Parents", time: "10 mins ago" }
    );
  }

  return {
    studentsCount: studentsCount || 1248,
    teachersCount: teachersCount || 84,
    classesCount: classesCount || 24,
    attendance: {
      percentage: attendanceRate,
      present: presentCount || 1175,
      total: studentsCount || 1248
    },
    studentsList,
    classesSchedule,
    activityLogs
  };
};
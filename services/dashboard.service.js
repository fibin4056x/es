import User from "../models/user.model.js";
import StudentModel from "../models/student.model.js";
import ClassModel from "../models/class.model.js";
import AttendanceModel from "../models/attendance.model.js";

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
   DASHBOARD STATS
========================================= */

export const dashboardStatsService = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    students,
    teachers,
    classes,
    todayAttendance,
    recentTeachers,
    recentStudents,
    weeklyChart,
    monthlyChart,
  ] = await Promise.all([
    
    // Total Active Students
    StudentModel.countDocuments({
      status: "active",
    }),

    // Total Active Teachers
    User.countDocuments({
      role: "teacher",
      status: "active",
    }),

    // Total Active Classes
    ClassModel.countDocuments({
      status: "active",
    }),

    // Today's Attendance Summary
    AttendanceModel.aggregate([
      {
        $match: {
          date: today,
        },
      },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,

          totalStudents: 1,
          present: 1,
          absent: 1,
          late: 1,

          percentage: {
            $cond: [
              {
                $eq: ["$totalStudents", 0],
              },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          "$present",
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

    // Latest 5 Teachers
    User.find({
      role: "teacher",
      status: "active",
    })
      .select("name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // Latest 5 Students
    StudentModel.find({
      status: "active",
    })
      .select(
        "nameEnglish admissionNumber photo status classId"
      )
      .populate("classId", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // Weekly Chart
    getWeeklyAttendanceChart(),

    // Monthly Chart
    getMonthlyAttendanceChart(),
  ]);

  const attendance =
    todayAttendance[0] || {
      totalStudents: 0,
      present: 0,
      absent: 0,
      late: 0,
      percentage: 0,
    };

  return {
    students,
    teachers,
    classes,

    attendance,

    attendanceChart: {
      weekly: weeklyChart,
      monthly: monthlyChart,
    },

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
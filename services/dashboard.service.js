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

        totalStudents: {
          $sum: "$totalStudents",
        },

        presentStudents: {
          $sum: "$presentCount",
        },
      },
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
                    "$presentStudents",
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
        date: 1,
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

        totalStudents: {
          $sum: "$totalStudents",
        },

        presentStudents: {
          $sum: "$presentCount",
        },
      },
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
                        "$presentStudents",
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
};

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

          totalStudents: {
            $sum: "$totalStudents",
          },

          present: {
            $sum: "$presentCount",
          },

          absent: {
            $sum: "$absentCount",
          },

          late: {
            $sum: "$lateCount",
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
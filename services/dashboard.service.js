import User from "../models/user.model.js";
import StudentModel from "../models/student.model.js";
import ClassModel from "../models/class.model.js";
import AttendanceModel from "../models/attendance.model.js";
import AcademicCalendar from "../models/academicCalendar.model.js";

/*
|--------------------------------------------------------------------------
| DATE HELPERS
|--------------------------------------------------------------------------
*/

const getStartOfDay = (date = new Date()) => {
  const value = new Date(date);

  value.setHours(0, 0, 0, 0);

  return value;
};

const getEndOfDay = (date = new Date()) => {
  const value = new Date(date);

  value.setHours(23, 59, 59, 999);

  return value;
};

/*
|--------------------------------------------------------------------------
| ATTENDANCE STATUS
|--------------------------------------------------------------------------
*/

const attendedStatuses = [
  "present",
  "late",
];

/*
|--------------------------------------------------------------------------
| WEEKLY ATTENDANCE
|--------------------------------------------------------------------------
*/

const getWeeklyAttendanceChart = async () => {
  const endDate = getEndOfDay();

  const startDate = getStartOfDay();

  startDate.setDate(
    startDate.getDate() - 6
  );

  const chart =
    await AttendanceModel.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },

      /*
       * Normalize attendance into calendar days.
       */
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
            },
          },

          totalStudents: {
            $sum: 1,
          },

          attendedStudents: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    attendedStatuses,
                  ],
                },
                1,
                0,
              ],
            },
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

          totalStudents: 1,
          attendedStudents: 1,
        },
      },

      {
        $sort: {
          day: 1,
        },
      },
    ]);

  return chart;
};

/*
|--------------------------------------------------------------------------
| MONTHLY ATTENDANCE
|--------------------------------------------------------------------------
*/

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

  endDate.setHours(
    23,
    59,
    59,
    999
  );

  const chart =
    await AttendanceModel.aggregate([
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
            $ceil: {
              $divide: [
                {
                  $dayOfMonth: "$date",
                },
                7,
              ],
            },
          },

          totalStudents: {
            $sum: 1,
          },

          attendedStudents: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    attendedStatuses,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,

          week: "$_id",

          day: {
            $concat: [
              "Week ",
              {
                $toString: "$_id",
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

          totalStudents: 1,
          attendedStudents: 1,
        },
      },

      {
        $sort: {
          week: 1,
        },
      },
    ]);

  return chart;
};

/*
|--------------------------------------------------------------------------
| DIVISION ATTENDANCE RANKING
|--------------------------------------------------------------------------
*/

const getDivisionAttendanceRankings = async (
  limitCount = 5,
  sortDirection = -1
) => {
  const startDate = new Date();

  startDate.setDate(
    startDate.getDate() - 30
  );

  startDate.setHours(0, 0, 0, 0);

  return AttendanceModel.aggregate([
    {
      $match: {
        date: {
          $gte: startDate,
        },
      },
    },

    {
      $group: {
        _id: "$divisionId",

        total: {
          $sum: 1,
        },

        attended: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$status",
                  attendedStatuses,
                ],
              },
              1,
              0,
            ],
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
                {
                  $eq: ["$total", 0],
                },
                0,
                {
                  $multiply: [
                    {
                      $divide: [
                        "$attended",
                        "$total",
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
        attendanceRate: sortDirection,
        total: -1,
      },
    },

    {
      $limit: limitCount,
    },

    {
      $lookup: {
        from: "divisions",

        localField: "_id",

        foreignField: "_id",

        as: "divisionInfo",
      },
    },

    {
      $unwind: {
        path: "$divisionInfo",

        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "classes",

        localField:
          "divisionInfo.classId",

        foreignField: "_id",

        as: "classInfo",
      },
    },

    {
      $unwind: {
        path: "$classInfo",

        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 0,

        divisionId: "$_id",

        divisionName:
          "$divisionInfo.name",

        className:
          "$classInfo.name",

        attendanceRate: 1,

        totalRecords: "$total",

        attendedRecords: "$attended",
      },
    },
  ]);
};

/*
|--------------------------------------------------------------------------
| TODAY ATTENDANCE
|--------------------------------------------------------------------------
*/

const getTodayAttendance = async () => {
  const startDate = getStartOfDay();

  const endDate = getEndOfDay();

  const result =
    await AttendanceModel.aggregate([
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
          _id: null,

          totalStudents: {
            $sum: 1,
          },

          present: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "present",
                  ],
                },
                1,
                0,
              ],
            },
          },

          absent: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "absent",
                  ],
                },
                1,
                0,
              ],
            },
          },

          late: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "late",
                  ],
                },
                1,
                0,
              ],
            },
          },

          leave: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "leave",
                  ],
                },
                1,
                0,
              ],
            },
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
              {
                $eq: [
                  "$totalStudents",
                  0,
                ],
              },

              0,

              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $add: [
                              "$present",
                              "$late",
                            ],
                          },

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
    ]);

  return (
    result[0] || {
      totalStudents: 0,
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      percentage: 0,
    }
  );
};

/*
|--------------------------------------------------------------------------
| MAIN DASHBOARD
|--------------------------------------------------------------------------
*/

export const dashboardStatsService =
  async () => {
    const now = new Date();

    const firstDayOfMonth =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

    firstDayOfMonth.setHours(
      0,
      0,
      0,
      0
    );

    const lastDayOfMonth =
      new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      );

    lastDayOfMonth.setHours(
      23,
      59,
      59,
      999
    );

    const [
      activeStudents,
      inactiveStudents,
      totalStudents,

      activeTeachers,
      inactiveTeachers,
      totalTeachers,

      classesCount,

      attendance,

      recentTeachers,
      recentStudents,

      weeklyChart,
      monthlyChart,

      topDivisions,
      lowestDivisions,

      holidayCount,
    ] = await Promise.all([
      StudentModel.countDocuments({
        status: "active",
      }),

      StudentModel.countDocuments({
        status: "inactive",
      }),

      StudentModel.countDocuments({}),

      User.countDocuments({
        role: "teacher",
        status: "active",
      }),

      User.countDocuments({
        role: "teacher",
        status: {
          $ne: "active",
        },
      }),

      User.countDocuments({
        role: "teacher",
      }),

      ClassModel.countDocuments({
        status: "active",
      }),

      getTodayAttendance(),

      User.find({
        role: "teacher",
        status: "active",
      })
        .select("name email")
        .sort({
          createdAt: -1,
        })
        .limit(5)
        .lean(),

      StudentModel.find({
        status: "active",
      })
        .select(
          "nameEnglish admissionNumber photo status classId"
        )
        .populate(
          "classId",
          "name"
        )
        .sort({
          createdAt: -1,
        })
        .limit(5)
        .lean(),

      getWeeklyAttendanceChart(),

      getMonthlyAttendanceChart(),

      getDivisionAttendanceRankings(
        5,
        -1
      ),

      getDivisionAttendanceRankings(
        5,
        1
      ),

      AcademicCalendar.countDocuments({
        status: "active",

        category: {
          $in: [
            "holiday",
            "vacation",
          ],
        },

        startDate: {
          $lte: lastDayOfMonth,
        },

        endDate: {
          $gte: firstDayOfMonth,
        },
      }),
    ]);

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

/*
|--------------------------------------------------------------------------
| DASHBOARD REPORTS
|--------------------------------------------------------------------------
*/

export const dashboardReportsService =
  async () => {
    const [
      topDivisions,
      lowestDivisions,
      weeklyAttendance,
      monthlyAttendance,
    ] = await Promise.all([
      getDivisionAttendanceRankings(
        10,
        -1
      ),

      getDivisionAttendanceRankings(
        10,
        1
      ),

      getWeeklyAttendanceChart(),

      getMonthlyAttendanceChart(),
    ]);

    return {
      attendance: {
        weekly: weeklyAttendance,
        monthly: monthlyAttendance,
      },

      divisions: {
        highest: topDivisions,
        lowest: lowestDivisions,
      },
    };
  };

/*
|--------------------------------------------------------------------------
| PUBLIC DASHBOARD PREVIEW
|--------------------------------------------------------------------------
*/

export const dashboardPreviewStatsService =
  async () => {
    const [
      studentsCount,
      teachersCount,
      classesCount,
      recentStudents,
      firstTeacher,
      activeClasses,
    ] = await Promise.all([
      StudentModel.countDocuments({
        status: "active",
      }),

      User.countDocuments({
        role: "teacher",
        status: "active",
      }),

      ClassModel.countDocuments({
        status: "active",
      }),

      StudentModel.find({
        status: "active",
      })
        .select(
          "nameEnglish classId"
        )
        .populate(
          "classId",
          "name"
        )
        .sort({
          createdAt: -1,
        })
        .limit(3)
        .lean(),

      User.findOne({
        role: "teacher",
        status: "active",
      })
        .select("name")
        .lean(),

      ClassModel.find({
        status: "active",
      })
        .select("name")
        .sort({
          createdAt: 1,
        })
        .limit(2)
        .lean(),
    ]);

    const studentsList =
      recentStudents.map(
        (student) => ({
          name:
            student.nameEnglish,

          grade:
            student.classId?.name ||
            null,
        })
      );

    const classesSchedule =
      activeClasses.map(
        (classItem, index) => ({
          time:
            index === 0
              ? "09:30 AM"
              : "10:15 AM",

          subject:
            `${classItem.name} Lectures`,

          teacher:
            firstTeacher?.name ||
            null,
        })
      );

    return {
      studentsCount,

      teachersCount,

      classesCount,

      attendance: {
        percentage: null,
        present: null,
        total: studentsCount,
      },

      studentsList,

      classesSchedule,

      activityLogs: [],
    };
  };
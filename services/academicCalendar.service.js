import mongoose from "mongoose";
import AcademicCalendar from "../models/academicCalendar.model.js"; // adjust path to wherever your schema file lives

/* =========================================
   HELPERS
========================================= */

function assertValidObjectId(id, label = "ID") {
  if (!id) {
    const err = new Error(`${label} is required.`);
    err.status = 400;
    throw err;
  }

  if (Array.isArray(id)) {
    const err = new Error(`${label} must be a single ObjectId.`);
    err.status = 400;
    throw err;
  }

  if (typeof id !== "string" && !(id instanceof mongoose.Types.ObjectId)) {
    const err = new Error(`${label} must be a valid ObjectId.`);
    err.status = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${label}.`);
    err.status = 400;
    throw err;
  }

  return true;
}

function assertValidDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    const err = new Error(
      "startDate and endDate are required."
    );
    err.status = 400;
    throw err;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    const err = new Error(
      "startDate and endDate must be valid dates."
    );
    err.status = 400;
    throw err;
  }

  if (start > end) {
    const err = new Error(
      "startDate cannot be after endDate."
    );
    err.status = 400;
    throw err;
  }

  return {
    start,
    end,
  };
}


/* =========================================
   VALID TARGETS
========================================= */

const VALID_TARGETS = [
  "school",
  "class",
  "division",
];

/* =========================================
   VALIDATE TARGET SCOPE
========================================= */

function assertTargetScope(
  target,
  classId,
  divisionId
) {
  /* =========================================
     VALIDATE TARGET
  ========================================= */

  if (!VALID_TARGETS.includes(target)) {
    const err = new Error(
      "Invalid target. Allowed values are: school, class and division."
    );
    err.status = 400;
    throw err;
  }

  /* =========================================
     SCHOOL LEVEL
  ========================================= */

  if (target === "school") {
    if (classId || divisionId) {
      const err = new Error(
        "School level entries must not contain classId or divisionId."
      );
      err.status = 400;
      throw err;
    }

    return true;
  }

  /* =========================================
     CLASS LEVEL
  ========================================= */

  if (target === "class") {
    if (!classId) {
      const err = new Error(
        "classId is required when target is 'class'."
      );
      err.status = 400;
      throw err;
    }

    if (divisionId) {
      const err = new Error(
        "divisionId is not allowed when target is 'class'."
      );
      err.status = 400;
      throw err;
    }

    return true;
  }

  /* =========================================
     DIVISION LEVEL
  ========================================= */

  if (target === "division") {
    if (!classId || !divisionId) {
      const err = new Error(
        "classId and divisionId are required when target is 'division'."
      );
      err.status = 400;
      throw err;
    }

    return true;
  }
}

/* =========================================
   BUILD TARGET SCOPE FILTER
========================================= */

function buildScopeFilter({
  classId,
  divisionId,
}) {
  const or = [
    {
      target: "school",
    },
  ];

  if (classId) {
    assertValidObjectId(
      classId,
      "classId"
    );

    or.push({
      target: "class",
      classId,
    });
  }

  if (divisionId) {
    assertValidObjectId(
      divisionId,
      "divisionId"
    );

    or.push({
      target: "division",
      divisionId,
    });
  }

  return or;
}

/* =========================================
   NOT FOUND ERROR
========================================= */

function notFoundError(
  message = "Academic calendar entry not found."
) {
  const err = new Error(message);
  err.status = 404;

  return err;
}

/* =========================================
   CREATE ACADEMIC CALENDAR
========================================= */

export async function createAcademicCalendarService(
  payload,
  userId
) {
  const {
    title,
    category,
    target,
    classId,
    divisionId,
    startDate,
    endDate,
    academicYear,
  } = payload;

  /* =========================================
     REQUIRED FIELDS
  ========================================= */

  if (
    !title ||
    !category ||
    !target ||
    !startDate ||
    !endDate ||
    !academicYear
  ) {
    const err = new Error(
      "title, category, target, startDate, endDate and academicYear are required."
    );
    err.status = 400;
    throw err;
  }

  /* =========================================
     VALIDATIONS
  ========================================= */

  assertTargetScope(
    target,
    classId,
    divisionId
  );

  const { start, end } =
    assertValidDateRange(
      startDate,
      endDate
    );

  const academicYearRegex =
    /^\d{4}-\d{4}$/;

  if (
    !academicYearRegex.test(
      academicYear
    )
  ) {
    const err = new Error(
      "Academic year must be in YYYY-YYYY format."
    );
    err.status = 400;
    throw err;
  }

  assertValidObjectId(
    userId,
    "createdBy"
  );

  /* =========================================
     DUPLICATE CHECK
  ========================================= */

  const existing =
    await AcademicCalendar.findOne({
      title,
      category,
      target,
      classId:
        target === "school"
          ? null
          : classId,
      divisionId:
        target === "division"
          ? divisionId
          : null,
      startDate: start,
      endDate: end,
      status: "active",
    });

  if (existing) {
    const err = new Error(
      "Academic calendar entry already exists."
    );
    err.status = 409;
    throw err;
  }

  /* =========================================
     CREATE ENTRY
  ========================================= */

  const entry =
    await AcademicCalendar.create({
      ...payload,

      classId:
        target === "school"
          ? null
          : classId,

      divisionId:
        target === "division"
          ? divisionId
          : null,

      startDate: start,
      endDate: end,

      createdBy: userId,
    });

  return entry;
}

/* =========================================
   GET ACADEMIC CALENDAR
========================================= */

export async function getAcademicCalendarService(
  filters = {},
  pagination = {}
) {
  const {
    academicYear,
    category,
    target,
    classId,
    divisionId,
    status,
    priority,
    from,
    to,
  } = filters;

  const {
    page = 1,
    limit = 20,
    sortBy = "startDate",
    sortOrder = "asc",
  } = pagination;

  /* =========================================
     BUILD QUERY
  ========================================= */

  const query = {};

  if (academicYear) {
    query.academicYear = academicYear;
  }

  if (category) {
    query.category = String(category).toLowerCase();
  }

  if (target) {
    query.target = String(target).toLowerCase();
  }

  if (status) {
    query.status = String(status).toLowerCase();
  }

  if (priority) {
    query.priority = String(priority).toLowerCase();
  }

  if (classId) {
    assertValidObjectId(
      classId,
      "classId"
    );

    query.classId = classId;
  }

  if (divisionId) {
    assertValidObjectId(
      divisionId,
      "divisionId"
    );

    query.divisionId = divisionId;
  }

  /* =========================================
     DATE RANGE FILTER
  ========================================= */

  if (from || to) {
    query.$and = [];

    if (from) {
      const fromDate = new Date(from);

      if (Number.isNaN(fromDate.getTime())) {
        const err = new Error(
          "Invalid 'from' date."
        );
        err.status = 400;
        throw err;
      }

      query.$and.push({
        endDate: {
          $gte: fromDate,
        },
      });
    }

    if (to) {
      const toDate = new Date(to);

      if (Number.isNaN(toDate.getTime())) {
        const err = new Error(
          "Invalid 'to' date."
        );
        err.status = 400;
        throw err;
      }

      query.$and.push({
        startDate: {
          $lte: toDate,
        },
      });
    }
  }

  /* =========================================
     PAGINATION
  ========================================= */

  const numericPage = Math.max(
    Number(page) || 1,
    1
  );

  const numericLimit = Math.max(
    Number(limit) || 20,
    1
  );

  const skip =
    (numericPage - 1) * numericLimit;

  /* =========================================
     SORTING
  ========================================= */

  const sort = {
    [sortBy]:
      sortOrder === "desc"
        ? -1
        : 1,
  };

  /* =========================================
     FETCH DATA
  ========================================= */

  const [items, total] =
    await Promise.all([
      AcademicCalendar.find(query)
        .sort(sort)
        .skip(skip)
        .limit(numericLimit)
        .populate(
          "classId",
          "name"
        )
        .populate(
          "divisionId",
          "name"
        )
        .lean(),

      AcademicCalendar.countDocuments(
        query
      ),
    ]);

  /* =========================================
     RESPONSE
  ========================================= */

  return {
    items,
    total,
    page: numericPage,
    limit: numericLimit,
    totalPages: Math.max(
      Math.ceil(
        total / numericLimit
      ),
      1
    ),
  };
}

/* =========================================
   GET ACADEMIC CALENDAR BY ID
========================================= */

export async function getAcademicCalendarByIdService(
  id
) {
  /* =========================================
     VALIDATE ID
  ========================================= */

  assertValidObjectId(
    id,
    "Academic Calendar ID"
  );

  /* =========================================
     FIND ENTRY
  ========================================= */

  const entry =
    await AcademicCalendar.findById(id)
      .populate(
        "classId",
        "name"
      )
      .populate(
        "divisionId",
        "name"
      )
      .populate(
        "createdBy",
        "name email"
      )
      .lean();

  /* =========================================
     CHECK ENTRY
  ========================================= */

  if (!entry) {
    throw notFoundError();
  }

  /* =========================================
     RETURN ENTRY
  ========================================= */

  return entry;
}
/* =========================================
   UPDATE ACADEMIC CALENDAR
========================================= */

export async function updateAcademicCalendarService(
  id,
  updates = {},
  userId
) {
  /* =========================================
     VALIDATE IDS
  ========================================= */

  assertValidObjectId(
    id,
    "Academic Calendar ID"
  );

  assertValidObjectId(
    userId,
    "updatedBy"
  );

  /* =========================================
     FIND ENTRY
  ========================================= */

  const entry =
    await AcademicCalendar.findById(id);

  if (!entry) {
    throw notFoundError();
  }

  /* =========================================
     VALIDATE UPDATED VALUES
  ========================================= */

  const nextTarget =
    updates.target ?? entry.target;

  const nextClassId =
    updates.classId !== undefined
      ? updates.classId
      : entry.classId;

  const nextDivisionId =
    updates.divisionId !== undefined
      ? updates.divisionId
      : entry.divisionId;

  assertTargetScope(
    nextTarget,
    nextClassId,
    nextDivisionId
  );

  const nextStart =
    updates.startDate ??
    entry.startDate;

  const nextEnd =
    updates.endDate ??
    entry.endDate;

  const { start, end } =
    assertValidDateRange(
      nextStart,
      nextEnd
    );

  /* =========================================
     APPLY UPDATES
  ========================================= */

  Object.assign(
    entry,
    updates
  );

  entry.startDate = start;
  entry.endDate = end;

  /* =========================================
     KEEP TARGET CONSISTENT
  ========================================= */

  if (entry.target === "school") {
    entry.classId = null;
    entry.divisionId = null;
  }

  if (entry.target === "class") {
    entry.divisionId = null;
  }

  // Division keeps both classId and divisionId

  /* =========================================
     AUDIT
  ========================================= */

  entry.updatedBy = userId;

  /* =========================================
     SAVE
  ========================================= */

  await entry.save();

  return entry;
}

/* =========================================
   DELETE ACADEMIC CALENDAR
========================================= */

/* =========================================
   DELETE ACADEMIC CALENDAR
========================================= */

export async function deleteAcademicCalendarService(
  id,
  userId,
  options = {}
) {
  /* =========================================
     VALIDATE IDS
  ========================================= */

  assertValidObjectId(
    id,
    "Academic Calendar ID"
  );

  assertValidObjectId(
    userId,
    "deletedBy"
  );

  /* =========================================
     FIND ENTRY
  ========================================= */

  const entry = await AcademicCalendar.findById(id);

  if (!entry) {
    throw notFoundError();
  }

  if (options.hardDelete) {
    await entry.deleteOne();
    return { id, deleted: true };
  }

  /* =========================================
     SOFT DELETE
  ========================================= */

  entry.status = "inactive";
  entry.deletedBy = userId;
  entry.updatedBy = userId;

  await entry.save();

  /* =========================================
     RETURN ENTRY
  ========================================= */

  return entry;
}

/* =========================================
   RESTORE SOFT DELETED ACADEMIC CALENDAR
========================================= */

export async function restoreAcademicCalendarService(id, userId) {
  /* =========================================
     VALIDATE IDS
  ========================================= */

  assertValidObjectId(id, "Academic Calendar ID");
  assertValidObjectId(userId, "restoredBy");

  /* =========================================
     FIND ENTRY
  ========================================= */

  const entry = await AcademicCalendar.findById(id);

  if (!entry) {
    throw notFoundError("Academic calendar entry not found.");
  }

  if (entry.status === "active") {
    return entry;
  }

  /* =========================================
     DUPLICATE CHECK BEFORE RESTORE
  ========================================= */

  const existingActive = await AcademicCalendar.findOne({
    _id: { $ne: id },
    title: entry.title,
    category: entry.category,
    target: entry.target,
    classId: entry.classId,
    divisionId: entry.divisionId,
    startDate: entry.startDate,
    endDate: entry.endDate,
    status: "active",
  });

  if (existingActive) {
    const err = new Error(
      "An active calendar entry with the same title, dates and scope already exists."
    );
    err.status = 409;
    throw err;
  }

  /* =========================================
     RESTORE ENTRY
  ========================================= */

  entry.status = "active";
  entry.restoredBy = userId;
  entry.updatedBy = userId;
  entry.deletedBy = null;

  await entry.save();

  return entry;
}

/* =========================================
   GET ACADEMIC REPORTS
========================================= */

export async function getAcademicReportsService({
  startDate,
  endDate,
  classId,
  divisionId,
  academicYear,
} = {}) {
  const today = new Date();
  const defaultStart = startDate
    ? new Date(startDate)
    : new Date(today.getFullYear(), 0, 1);
  const defaultEnd = endDate
    ? new Date(endDate)
    : new Date(today.getFullYear(), 11, 31, 23, 59, 59);

  const [workingDaysData, holidays, upcomingEvents] = await Promise.all([
    getWorkingDaysService({
      startDate: defaultStart,
      endDate: defaultEnd,
      classId,
      divisionId,
    }),

    AcademicCalendar.find({
      status: "active",
      category: { $in: ["holiday", "vacation"] },
      startDate: { $lte: defaultEnd },
      endDate: { $gte: defaultStart },
      ...(academicYear ? { academicYear } : {}),
    })
      .sort({ startDate: 1 })
      .lean(),

    getUpcomingEventsService({ limit: 10, classId, divisionId }),
  ]);

  return {
    period: {
      startDate: defaultStart.toISOString().split("T")[0],
      endDate: defaultEnd.toISOString().split("T")[0],
    },
    workingDays: workingDaysData,
    holidayReport: {
      totalHolidays: holidays.length,
      holidays,
    },
    upcomingEvents,
  };
}

/* =========================================
   GET CALENDAR MONTH
========================================= */

export async function getCalendarMonthService({
  month,
  year,
  classId,
  divisionId,
} = {}) {
  const now = new Date();
  const targetYear = Number(year) || now.getFullYear();
  const targetMonth = Number(month) ? Number(month) - 1 : now.getMonth();

  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  const scopeFilter = buildScopeFilter({ classId, divisionId });

  const query = {
    status: "active",
    $or: scopeFilter,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };

  const entries = await AcademicCalendar.find(query)
    .sort({ startDate: 1 })
    .populate("classId", "name")
    .populate("divisionId", "name")
    .lean();

  return {
    year: targetYear,
    month: targetMonth + 1,
    count: entries.length,
    data: entries,
  };
}

/* =========================================
   GET WORKING DAYS
========================================= */

export async function getWorkingDaysService({
  startDate,
  endDate,
  classId,
  divisionId,
  excludeWeekends = true,
}) {
  /* =========================================
     VALIDATE DATE RANGE
  ========================================= */

  const { start, end } = assertValidDateRange(
    startDate,
    endDate
  );

  /* =========================================
     BUILD TARGET FILTER
  ========================================= */

  const scopeFilter =
    buildScopeFilter({
      classId,
      divisionId,
    });

  /* =========================================
     GET HOLIDAYS & VACATIONS
  ========================================= */

  const closures =
    await AcademicCalendar.find({
      status: "active",

      $or: scopeFilter,

      category: {
        $in: [
          "holiday",
          "vacation",
        ],
      },

      startDate: {
        $lte: end,
      },

      endDate: {
        $gte: start,
      },
    }).lean();

  /* =========================================
     BUILD CLOSED DATE SET
  ========================================= */

  const closedDates = new Set();

  for (const closure of closures) {
    const rangeStart = new Date(
      Math.max(
        new Date(
          closure.startDate
        ).getTime(),
        start.getTime()
      )
    );

    const rangeEnd = new Date(
      Math.min(
        new Date(
          closure.endDate
        ).getTime(),
        end.getTime()
      )
    );

    for (
      const current = new Date(
        rangeStart
      );
      current <= rangeEnd;
      current.setDate(
        current.getDate() + 1
      )
    ) {
      closedDates.add(
        current
          .toISOString()
          .split("T")[0]
      );
    }
  }

  /* =========================================
     CALCULATE DAYS
  ========================================= */

  let totalDays = 0;
  let workingDays = 0;
  let weekends = 0;
  let holidays = 0;

  for (
    const current = new Date(
      start
    );
    current <= end;
    current.setDate(
      current.getDate() + 1
    )
  ) {
    totalDays++;

    const dateKey =
      current
        .toISOString()
        .split("T")[0];

    const isWeekend =
      excludeWeekends &&
      (
        current.getDay() === 0 ||
        current.getDay() === 6
      );

    const isHoliday =
      closedDates.has(dateKey);

    if (isWeekend) {
      weekends++;
    } else if (isHoliday) {
      holidays++;
    } else {
      workingDays++;
    }
  }

  /* =========================================
     RETURN SUMMARY
  ========================================= */

  return {
    startDate: start,
    endDate: end,
    totalDays,
    workingDays,
    weekends,
    holidays,
  };
}

/* =========================================
   GET UPCOMING EVENTS
========================================= */

export async function getUpcomingEventsService({
  limit = 5,
  classId,
  divisionId,
  category,
} = {}) {
  /* =========================================
     PREPARE FILTERS
  ========================================= */

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const numericLimit = Math.max(
    Number(limit) || 5,
    1
  );

  const scopeFilter = buildScopeFilter({
    classId,
    divisionId,
  });

  const query = {
    status: "active",
    $or: scopeFilter,
  };

  if (category) {
    query.category = String(category).toLowerCase();
  }

  /* =========================================
     NON-REPEATING EVENTS
  ========================================= */

  const directEvents =
    await AcademicCalendar.find({
      ...query,
      repeatEveryYear: false,
      endDate: {
        $gte: today,
      },
    })
      .sort({
        startDate: 1,
      })
      .limit(numericLimit * 2)
      .lean();

  /* =========================================
     REPEATING EVENTS
  ========================================= */

  const repeatingEvents =
    await AcademicCalendar.find({
      ...query,
      repeatEveryYear: true,
    }).lean();

  const currentYear =
    today.getFullYear();

  const projectedEvents =
    repeatingEvents
      .map((event) => {
        const projectedStart =
          new Date(event.startDate);

        const projectedEnd =
          new Date(event.endDate);

        projectedStart.setFullYear(
          currentYear
        );

        projectedEnd.setFullYear(
          currentYear
        );

        if (
          projectedEnd < today
        ) {
          projectedStart.setFullYear(
            currentYear + 1
          );

          projectedEnd.setFullYear(
            currentYear + 1
          );
        }

        return {
          ...event,
          projectedStartDate:
            projectedStart,
          projectedEndDate:
            projectedEnd,
        };
      })
      .filter(
        (event) =>
          event.projectedEndDate >=
          today
      );

  /* =========================================
     MERGE EVENTS
  ========================================= */

  const events = [
    ...directEvents,
    ...projectedEvents,
  ]
    .sort((a, b) => {
      const first =
        a.projectedStartDate ??
        a.startDate;

      const second =
        b.projectedStartDate ??
        b.startDate;

      return (
        new Date(first) -
        new Date(second)
      );
    })
    .slice(0, numericLimit);

  return events;
}
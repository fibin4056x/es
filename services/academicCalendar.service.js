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

// Builds the common "school-wide OR this class OR this division" visibility filter
function buildScopeFilter({ classId, divisionId }) {
  const or = [{ target: "school" }];
  if (classId) or.push({ target: "class", classId });
  if (divisionId) or.push({ target: "division", divisionId });
  return or;
}

function notFoundError(message = "Academic calendar entry not found") {
  const err = new Error(message);
  err.status = 404;
  return err;
}

/* =========================================
   CREATE
========================================= */
export async function createAcademicCalendarService(payload, userId) {
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

  if (!title || !category || !target || !startDate || !endDate || !academicYear) {
    const err = new Error(
      "title, category, target, startDate, endDate and academicYear are required"
    );
    err.status = 400;
    throw err;
  }

  assertTargetScope(target, classId, divisionId);
  assertValidDateRange(startDate, endDate);
  const academicYearRegex = /^\d{4}-\d{4}$/;

if (!academicYearRegex.test(academicYear)) {
  const err = new Error(
    "Academic year must be in YYYY-YYYY format."
  );
  err.status = 400;
  throw err;
};
  if (!userId) {
    const err = new Error("createdBy (userId) is required");
    err.status = 400;
    throw err;
  }
   const existing = await AcademicCalendar.findOne({
  title,
  target,
  classId: target === "school" ? null : classId,
  divisionId: target === "division" ? divisionId : null,
  startDate,
  endDate,
  status: "active",
});

if (existing) {
  const err = new Error(
    "Academic calendar entry already exists."
  );
  err.status = 409;
  throw err;
}
  const entry = await AcademicCalendar.create({
    ...payload,
    // keep the scope fields consistent with target, regardless of what was passed in
    classId: target === "class" ? classId : null,
    divisionId: target === "division" ? divisionId : null,
    createdBy: userId,
  });

  return entry;
}

/* =========================================
   LIST (with filters + pagination)
========================================= */
export async function getAcademicCalendarService(filters = {}, pagination = {}) {
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

  const query = {};
  if (academicYear) query.academicYear = academicYear;
  if (category) query.category = String(category).toLowerCase();
  if (target) query.target = String(target).toLowerCase();
  if (status) query.status = String(status).toLowerCase();
  if (priority) query.priority = String(priority).toLowerCase();

  if (classId) {
    assertValidObjectId(classId, "classId");
    query.classId = classId;
  }
  if (divisionId) {
    assertValidObjectId(divisionId, "divisionId");
    query.divisionId = divisionId;
  }

  // date-range overlap filter: entry.endDate >= from AND entry.startDate <= to
  if (from || to) {
    query.$and = query.$and || [];
    if (from) query.$and.push({ endDate: { $gte: new Date(from) } });
    if (to) query.$and.push({ startDate: { $lte: new Date(to) } });
  }

  const numericLimit = Number(limit) || 20;
  const numericPage = Number(page) || 1;
  const skip = (numericPage - 1) * numericLimit;
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const [items, total] = await Promise.all([
    AcademicCalendar.find(query)
      .sort(sort)
      .skip(skip)
      .limit(numericLimit)
      .populate("classId", "name")
      .populate("divisionId", "name")
      .lean(),
    AcademicCalendar.countDocuments(query),
  ]);

  return {
    items,
    total,
    page: numericPage,
    limit: numericLimit,
    totalPages: Math.max(Math.ceil(total / numericLimit), 1),
  };
}

/* =========================================
   GET BY ID
========================================= */
export async function getAcademicCalendarByIdService(id) {
  assertValidObjectId(id, "calendar entry ID");

  const entry = await AcademicCalendar.findById(id)
    .populate("classId", "name")
    .populate("divisionId", "name")
    .populate("createdBy", "name email");

  if (!entry) throw notFoundError();
  return entry;
}

/* =========================================
   UPDATE
========================================= */
export async function updateAcademicCalendarService(id, updates = {}, userId) {
  assertValidObjectId(id, "calendar entry ID");

  const entry = await AcademicCalendar.findById(id);
  if (!entry) throw notFoundError();

  const nextTarget = updates.target ?? entry.target;
  const nextClassId = updates.classId !== undefined ? updates.classId : entry.classId;
  const nextDivisionId =
    updates.divisionId !== undefined ? updates.divisionId : entry.divisionId;
  assertTargetScope(nextTarget, nextClassId, nextDivisionId);

  const nextStart = updates.startDate ?? entry.startDate;
  const nextEnd = updates.endDate ?? entry.endDate;
  assertValidDateRange(nextStart, nextEnd);

  Object.assign(entry, updates);

  // re-derive scope fields so a target change can't leave a stale classId/divisionId behind
if (entry.target === "school") {
  entry.classId = null;
  entry.divisionId = null;
}

if (entry.target === "class") {
  entry.divisionId = null;
}

// Division keeps BOTH classId and divisionId
 entry.updatedBy = userId; 
  await entry.save();
  return entry;
}

/* =========================================
   DELETE (soft by default, hard on request)
========================================= */
export async function deleteAcademicCalendarService(id, { hardDelete = false } = {}) {
  assertValidObjectId(id, "calendar entry ID");

  if (hardDelete) {
    const deleted = await AcademicCalendar.findByIdAndDelete(id);
    if (!deleted) throw notFoundError();
    return deleted;
  }

  const entry = await AcademicCalendar.findByIdAndUpdate(
    id,
    { status: "inactive" },
    { new: true }
  );
  if (!entry) throw notFoundError();
  return entry;
}

/* =========================================
   MONTH VIEW (handles repeatEveryYear entries)
========================================= */
export async function getCalendarMonthService({ month, year, classId, divisionId }) {
  if (!month || !year) {
    const err = new Error("month and year are required");
    err.status = 400;
    throw err;
  }

  const numMonth = Number(month);
  if (numMonth < 1 || numMonth > 12) {
  const err = new Error("Month must be between 1 and 12.");
  err.status = 400;
  throw err;
}
  const numYear = Number(year);
  const monthStart = new Date(numYear, numMonth - 1, 1);
  const monthEnd = new Date(numYear, numMonth, 0, 23, 59, 59, 999);

  const scopeOr = buildScopeFilter({ classId, divisionId });

  // Non-repeating entries that directly overlap this month
  const directEvents = await AcademicCalendar.find({
    status: "active",
    $or: scopeOr,
    repeatEveryYear: false,
    startDate: { $lte: monthEnd },
    endDate: { $gte: monthStart },
  }).lean();

  // Repeating entries: re-anchor their month/day onto the requested year, then check overlap
  const repeatingCandidates = await AcademicCalendar.find({
    status: "active",
    $or: scopeOr,
    repeatEveryYear: true,
  }).lean();

  const repeatingEvents = repeatingCandidates
    .map((ev) => {
      const projectedStartDate = new Date(ev.startDate);
      projectedStartDate.setFullYear(numYear);
      const projectedEndDate = new Date(ev.endDate);
      projectedEndDate.setFullYear(numYear);
      return { ...ev, projectedStartDate, projectedEndDate };
    })
    .filter((ev) => ev.projectedStartDate <= monthEnd && ev.projectedEndDate >= monthStart);

  const allEvents = [...directEvents, ...repeatingEvents].sort((a, b) => {
    const aDate = a.projectedStartDate || a.startDate;
    const bDate = b.projectedStartDate || b.startDate;
    return new Date(aDate) - new Date(bDate);
  });

  return {
    month: numMonth,
    year: numYear,
    totalEvents: allEvents.length,
    events: allEvents,
  };
}

/* =========================================
   WORKING DAYS (excludes weekends + holiday/vacation entries)
========================================= */
export async function getWorkingDaysService({
  startDate,
  endDate,
  classId,
  divisionId,
  excludeWeekends = true,
}) {
  const { start, end } = assertValidDateRange(startDate, endDate);
  const scopeOr = buildScopeFilter({ classId, divisionId });

  const closures = await AcademicCalendar.find({
    status: "active",
    $or: scopeOr,
    category: { $in: ["holiday", "vacation"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).lean();

  // Flatten every overlapping closure range into a set of individual closed dates
  const closedDates = new Set();
  for (const closure of closures) {
    const rangeStart = new Date(Math.max(new Date(closure.startDate).getTime(), start.getTime()));
    const rangeEnd = new Date(Math.min(new Date(closure.endDate).getTime(), end.getTime()));
    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      closedDates.add(d.toISOString().slice(0, 10));
    }
  }

  let totalDays = 0;
  let workingDays = 0;
  let weekends = 0;
  let holidays = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    totalDays += 1;
    const dateKey = d.toISOString().slice(0, 10);
    const isWeekend = excludeWeekends && (d.getDay() === 0 || d.getDay() === 6);
    const isClosed = closedDates.has(dateKey);

    if (isWeekend) weekends += 1;
    else if (isClosed) holidays += 1;
    else workingDays += 1;
  }

  return { startDate: start, endDate: end, totalDays, workingDays, weekends, holidays };
}

/* =========================================
   UPCOMING EVENTS (handles repeatEveryYear roll-forward)
========================================= */
export async function getUpcomingEventsService({
  limit = 5,
  classId,
  divisionId,
  category,
} = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const numericLimit = Number(limit) || 5;
  const scopeOr = buildScopeFilter({ classId, divisionId });

  const baseFilter = { status: "active", $or: scopeOr };
  if (category) baseFilter.category = String(category).toLowerCase();

  // Non-repeating events that haven't ended yet
  const direct = await AcademicCalendar.find({
    ...baseFilter,
    repeatEveryYear: false,
    endDate: { $gte: today },
  })
    .sort({ startDate: 1 })
    .limit(numericLimit * 2)
    .lean();

  // Repeating events: project onto this year, roll to next year if this year's date already passed
  const repeatingCandidates = await AcademicCalendar.find({
    ...baseFilter,
    repeatEveryYear: true,
  }).lean();

  const currentYear = today.getFullYear();
  const repeating = repeatingCandidates
    .map((ev) => {
      let projectedStartDate = new Date(ev.startDate);
      projectedStartDate.setFullYear(currentYear);
      let projectedEndDate = new Date(ev.endDate);
      projectedEndDate.setFullYear(currentYear);

      if (projectedEndDate < today) {
        projectedStartDate.setFullYear(currentYear + 1);
        projectedEndDate.setFullYear(currentYear + 1);
      }
      return { ...ev, projectedStartDate, projectedEndDate };
    })
    .filter((ev) => ev.projectedEndDate >= today);

  const merged = [...direct, ...repeating]
    .sort((a, b) => {
      const aDate = a.projectedStartDate || a.startDate;
      const bDate = b.projectedStartDate || b.startDate;
      return new Date(aDate) - new Date(bDate);
    })
    .slice(0, numericLimit);

  return merged;
}
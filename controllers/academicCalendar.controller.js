import {
  createAcademicCalendarService,
  getAcademicCalendarService,
  getAcademicCalendarByIdService,
  updateAcademicCalendarService,
  deleteAcademicCalendarService,
  restoreAcademicCalendarService,
  getAcademicReportsService,
  getCalendarMonthService,
  getWorkingDaysService,
  getUpcomingEventsService,
} from "../services/academicCalendar.service.js";

/* =========================================
   CREATE
   POST /api/academic-calendar
========================================= */
export async function createAcademicCalendarController(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id;
    const entry = await createAcademicCalendarService(req.body, userId);

    res.status(201).json({
      message: "Academic calendar entry created",
      data: entry,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================
   LIST (filters + pagination)
   GET /api/academic-calendar
   query: academicYear, category, target, classId, divisionId, status,
          priority, from, to, page, limit, sortBy, sortOrder
========================================= */
export async function getAcademicCalendarController(req, res, next) {
  try {
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
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getAcademicCalendarService(
      { academicYear, category, target, classId, divisionId, status, priority, from, to },
      { page, limit, sortBy, sortOrder }
    );

    res.status(200).json({
      message: "Academic calendar entries fetched",
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================
   GET BY ID
   GET /api/academic-calendar/:id
========================================= */
export async function getAcademicCalendarByIdController(req, res, next) {
  try {
    const { id } = req.params;
    const entry = await getAcademicCalendarByIdService(id);

    res.status(200).json({
      message: "Academic calendar entry fetched",
      data: entry,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================
   UPDATE
   PATCH /api/academic-calendar/:id
========================================= */
export async function updateAcademicCalendarController(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const entry = await updateAcademicCalendarService(id, req.body, userId);

    res.status(200).json({
      message: "Academic calendar entry updated",
      data: entry,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================
   DELETE (soft by default; ?hard=true for a real delete)
   DELETE /api/academic-calendar/:id
========================================= */
export async function deleteAcademicCalendarController(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const hardDelete = req.query.hard === "true";

    const entry = await deleteAcademicCalendarService(id, userId, { hardDelete });

    res.status(200).json({
      message: hardDelete
        ? "Academic calendar entry permanently deleted"
        : "Academic calendar entry deactivated",
      data: entry,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================
   RESTORE SOFT DELETED CALENDAR ENTRY
   PATCH /api/academic-calendar/:id/restore
========================================= */
export async function restoreAcademicCalendarController(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    const entry = await restoreAcademicCalendarService(id, userId);

    res.status(200).json({
      message: "Academic calendar entry restored successfully",
      data: entry,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================
   ACADEMIC REPORTS
   GET /api/academic-calendar/reports
========================================= */
export async function getAcademicReportsController(req, res, next) {
  try {
    const { startDate, endDate, classId, divisionId, academicYear } = req.query;

    const report = await getAcademicReportsService({
      startDate,
      endDate,
      classId,
      divisionId,
      academicYear,
    });

    res.status(200).json({
      message: "Academic report fetched successfully",
      data: report,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================
   MONTH VIEW
   GET /api/academic-calendar/month?month=&year=&classId=&divisionId=
========================================= */
export async function getCalendarMonthController(req, res, next) {
  try {
    const { month, year, classId, divisionId } = req.query;

    const result = await getCalendarMonthService({ month, year, classId, divisionId });

    res.status(200).json({
      message: "Calendar month fetched",
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================
   WORKING DAYS
   GET /api/academic-calendar/working-days?startDate=&endDate=&classId=&divisionId=&excludeWeekends=
========================================= */
export async function getWorkingDaysController(req, res, next) {
  try {
    const { startDate, endDate, classId, divisionId, excludeWeekends } = req.query;

    const result = await getWorkingDaysService({
      startDate,
      endDate,
      classId,
      divisionId,
      excludeWeekends: excludeWeekends === "false" ? false : true,
    });

    res.status(200).json({
      message: "Working days calculated",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================
   UPCOMING EVENTS
   GET /api/academic-calendar/upcoming?limit=&classId=&divisionId=&category=
========================================= */
export async function getUpcomingEventsController(req, res, next) {
  try {
    const { limit, classId, divisionId, category } = req.query;

    const events = await getUpcomingEventsService({ limit, classId, divisionId, category });

    res.status(200).json({
      message: "Upcoming events fetched",
      count: events.length,
      data: events,
    });
  } catch (err) {
    next(err);
  }
}
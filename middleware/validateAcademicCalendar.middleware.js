const VALID_CATEGORIES = ["holiday", "vacation", "exam", "event", "meeting"];
const VALID_TARGETS = ["school", "class", "division"];

/* =========================================
   HELPERS
========================================= */

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDate(value) {
  return value !== undefined && value !== null && !isNaN(new Date(value).getTime());
}

// Runs every rule against the (already-merged) payload and returns a list of
// field-level error messages. Used by both create (full payload) and
// update (payload merged with the existing document) so the rules only live once.
function collectErrors(payload) {
  const errors = [];
  const { title, category, target, academicYear, startDate, endDate, classId, divisionId } = payload;

  // ---- required fields ----
  if (!isNonEmptyString(title)) {
    errors.push("title is required and must be a non-empty string");
  } else if (title.trim().length > 100) {
    errors.push("title must be at most 100 characters");
  }

  if (!isNonEmptyString(category)) {
    errors.push("category is required");
  } else if (!VALID_CATEGORIES.includes(category.toLowerCase())) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }

  if (!isNonEmptyString(target)) {
    errors.push("target is required");
  } else if (!VALID_TARGETS.includes(target.toLowerCase())) {
    errors.push(`target must be one of: ${VALID_TARGETS.join(", ")}`);
  }

  if (!isNonEmptyString(academicYear)) {
    errors.push("academicYear is required");
  }

  if (!isValidDate(startDate)) {
    errors.push("startDate is required and must be a valid date");
  }
  if (!isValidDate(endDate)) {
    errors.push("endDate is required and must be a valid date");
  }

  // ---- endDate >= startDate ----
  if (isValidDate(startDate) && isValidDate(endDate)) {
    if (new Date(endDate) < new Date(startDate)) {
      errors.push("endDate cannot be before startDate");
    }
  }

  // ---- target-based scope rules ----
  const normalizedTarget = isNonEmptyString(target) ? target.toLowerCase() : null;

  if (normalizedTarget === "class") {
    if (!classId) errors.push("classId is required when target is 'class'");
  }

  if (normalizedTarget === "division") {
    if (!classId) errors.push("classId is required when target is 'division'");
    if (!divisionId) errors.push("divisionId is required when target is 'division'");
  }

  if (normalizedTarget === "school") {
    if (classId !== undefined && classId !== null) {
      errors.push("classId must be null when target is 'school'");
    }
    if (divisionId !== undefined && divisionId !== null) {
      errors.push("divisionId must be null when target is 'school'");
    }
  }

  return errors;
}

/* =========================================
   CREATE — every required field must be present in req.body
========================================= */
export function validateCreateAcademicCalendar(req, res, next) {
  const errors = collectErrors(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      message: "Validation failed",
      errors,
    });
  }

  next();
}

/* =========================================
   UPDATE — req.body may be partial (PATCH), so we only require that
   whatever IS being changed is valid. Anything not sent falls back to
   res.locals.existingEntry, which a small loader middleware (below)
   should attach before this runs.
========================================= */
export function validateUpdateAcademicCalendar(req, res, next) {
  const existing = res.locals.existingEntry;

  if (!existing) {
    return res.status(500).json({
      message:
        "validateUpdateAcademicCalendar requires res.locals.existingEntry to be set first (see loadExistingCalendarEntry)",
    });
  }

  const merged = {
    title: req.body.title ?? existing.title,
    category: req.body.category ?? existing.category,
    target: req.body.target ?? existing.target,
    academicYear: req.body.academicYear ?? existing.academicYear,
    startDate: req.body.startDate ?? existing.startDate,
    endDate: req.body.endDate ?? existing.endDate,
    classId: req.body.classId !== undefined ? req.body.classId : existing.classId,
    divisionId: req.body.divisionId !== undefined ? req.body.divisionId : existing.divisionId,
  };

  const errors = collectErrors(merged);

  if (errors.length > 0) {
    return res.status(400).json({
      message: "Validation failed",
      errors,
    });
  }

  next();
}

/* =========================================
   Optional helper: loads the existing document so validateUpdateAcademicCalendar
   has something to merge partial updates against. Wire it in before the
   validator on the PATCH route, e.g.:
     router.patch("/:id", loadExistingCalendarEntry, validateUpdateAcademicCalendar, updateAcademicCalendarController)
========================================= */
export function loadExistingCalendarEntry(AcademicCalendarModel) {
  return async function (req, res, next) {
    try {
      const entry = await AcademicCalendarModel.findById(req.params.id).lean();
      if (!entry) {
        return res.status(404).json({ message: "Academic calendar entry not found" });
      }
      res.locals.existingEntry = entry;
      next();
    } catch (err) {
      next(err);
    }
  };
}
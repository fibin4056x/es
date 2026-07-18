export const validateAttendance =
  (
    req,
    res,
    next
  ) => {

    const {
      date,
      classId,
      divisionId,
      students,
    } = req.body;

    if (!date) {

      return res.status(400).json({
        success: false,
        message:
          "Attendance date is required",
      });

    }

    if (!classId) {

      return res.status(400).json({
        success: false,
        message:
          "Class is required",
      });

    }

    if (!divisionId) {

      return res.status(400).json({
        success: false,
        message:
          "Division is required",
      });

    }

    if (
      !Array.isArray(students) ||
      students.length === 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Students attendance is required",
      });

    }

    next();

  };
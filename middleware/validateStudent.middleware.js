export const validateCreateStudent = (
  req,
  res,
  next
) => {

  const {
    admissionNumber,
    admissionDate,
    classId,
    divisionId,
    nameEnglish,
    gender,
    dateOfBirth,
    parentName,
    parentPhone,
    guardianRelation,
    address,
  } = req.body;

  if (!admissionNumber) {
    return res.status(400).json({
      success: false,
      message:
        "Admission number is required",
    });
  }

  if (!admissionDate) {
    return res.status(400).json({
      success: false,
      message:
        "Admission date is required",
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

  if (!nameEnglish) {
    return res.status(400).json({
      success: false,
      message:
        "Student name is required",
    });
  }

  if (!gender) {
    return res.status(400).json({
      success: false,
      message:
        "Gender is required",
    });
  }

  if (!dateOfBirth) {
    return res.status(400).json({
      success: false,
      message:
        "Date of birth is required",
    });
  }

  if (!parentName) {
    return res.status(400).json({
      success: false,
      message:
        "Parent name is required",
    });
  }

  if (!parentPhone) {
    return res.status(400).json({
      success: false,
      message:
        "Parent phone is required",
    });
  }

  if (!guardianRelation) {
    return res.status(400).json({
      success: false,
      message:
        "Guardian relation is required",
    });
  }

  if (!address) {
    return res.status(400).json({
      success: false,
      message:
        "Address is required",
    });
  }

  next();
};
import StudentModel from "../models/student.model.js";
import ClassModel from "../models/class.model.js";
import DivisionModel from "../models/division.model.js";
import ApiError from "../utils/ApiError.js";

/* =========================================
   BULK IMPORT STUDENTS SERVICE
========================================= */

export const importStudentsService = async (records, options = {}) => {
  const { classId: defaultClassId, divisionId: defaultDivisionId } = options;

  if (!Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, "Import file contains no valid student records");
  }

  /* =========================================
     1. IN-MEMORY LOOKUPS FOR PERFORMANCE
  ========================================= */

  const classes = await ClassModel.find({});
  const divisions = await DivisionModel.find({}).populate("classId", "name");
  const existingStudents = await StudentModel.find({}).select("admissionNumber");

  // Validate optional default classId and divisionId if provided
  let targetClass = null;
  let targetDivision = null;

  if (defaultClassId) {
    targetClass = classes.find((c) => c._id.toString() === String(defaultClassId));
    if (!targetClass) {
      throw new ApiError(404, "Target class specified for import not found");
    }
  }

  if (defaultDivisionId) {
    targetDivision = divisions.find((d) => d._id.toString() === String(defaultDivisionId));
    if (!targetDivision) {
      throw new ApiError(404, "Target division specified for import not found");
    }
    if (targetClass && targetDivision.classId?._id?.toString() !== targetClass._id.toString()) {
      throw new ApiError(400, "Target division does not belong to the specified target class");
    }
  }

  // Class Name -> Class ID Map
  const classMap = new Map();
  classes.forEach((cls) => {
    classMap.set(cls.name.trim().toLowerCase(), cls._id);
  });

  // "ClassName_DivisionName" -> Division ID Map
  const divisionMap = new Map();
  divisions.forEach((div) => {
    const className = div.classId?.name?.trim().toLowerCase();
    const divName = div.name?.trim().toLowerCase();
    if (className && divName) {
      divisionMap.set(`${className}_${divName}`, div._id);
    }
  });

  // DB Admission Numbers Set
  const existingAdmissionNumbers = new Set(
    existingStudents.map((s) => s.admissionNumber.trim().toLowerCase())
  );

  /* =========================================
     2. BATCH VALIDATION & NORMALIZATION
  ========================================= */

  const validStudents = [];
  const errors = [];
  const batchAdmissionNumbers = new Set();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // Accounting for 1-indexed row + header row

    const admissionNumber = row.admissionNumber ? String(row.admissionNumber).trim() : "";
    const nameEnglish = row.nameEnglish ? String(row.nameEnglish).trim() : "";
    const gender = row.gender ? String(row.gender).trim().toLowerCase() : "";
    const dateOfBirth = row.dateOfBirth ? new Date(row.dateOfBirth) : null;
    const parentName = row.parentName ? String(row.parentName).trim() : "";
    const parentPhone = row.parentPhone ? String(row.parentPhone).trim() : "";
    const address = row.address ? String(row.address).trim() : "";
    const className = row.className ? String(row.className).trim() : "";
    const divisionName = row.divisionName ? String(row.divisionName).trim() : "";

    // Phone & Aadhaar Cleaning
    const cleanPhone = parentPhone.replace(/\D/g, "").slice(-10);
    const cleanAadhaar = row.aadhaarNumber ? String(row.aadhaarNumber).replace(/\D/g, "") : "";

    // Determine target classId & divisionId
    let resolvedClassId = null;
    let resolvedDivisionId = null;

    if (className) {
      resolvedClassId = classMap.get(className.toLowerCase());
    } else if (targetClass) {
      resolvedClassId = targetClass._id;
    }

    if (className && divisionName) {
      const divKey = `${className.toLowerCase()}_${divisionName.toLowerCase()}`;
      resolvedDivisionId = divisionMap.get(divKey);
    } else if (targetDivision) {
      resolvedDivisionId = targetDivision._id;
    }

    // Validation 1: Required Fields
    const missingFields = [];
    if (!admissionNumber) missingFields.push("Admission Number");
    if (!nameEnglish) missingFields.push("Student Name");
    if (!gender) missingFields.push("Gender");
    if (!dateOfBirth || isNaN(dateOfBirth.getTime())) missingFields.push("Valid Date of Birth");
    if (!parentName) missingFields.push("Parent Name");
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) missingFields.push("Valid 10-digit Parent Phone");
    if (!address) missingFields.push("Address");
    if (!resolvedClassId) missingFields.push("Valid Class");
    if (!resolvedDivisionId) missingFields.push("Valid Division");

    if (missingFields.length > 0) {
      errors.push({
        row: rowNum,
        admissionNumber: admissionNumber || "N/A",
        reason: `Missing/invalid required field(s): ${missingFields.join(", ")}`,
      });
      continue;
    }

    // Validation 1b: Optional Aadhaar Validation (12 digits if provided)
    if (cleanAadhaar && cleanAadhaar.length !== 12) {
      errors.push({
        row: rowNum,
        admissionNumber,
        reason: "Aadhaar number must be exactly 12 digits",
      });
      continue;
    }

    // Validation 2: Gender Enum Check
    if (!["male", "female", "other"].includes(gender)) {
      errors.push({
        row: rowNum,
        admissionNumber,
        reason: `Invalid gender '${gender}'. Must be male, female, or other.`,
      });
      continue;
    }

    // Validation 3: Duplicate Admission Number in File Batch
    const admKey = admissionNumber.toLowerCase();
    if (batchAdmissionNumbers.has(admKey)) {
      errors.push({
        row: rowNum,
        admissionNumber,
        reason: "Duplicate admission number within the import file",
      });
      continue;
    }

    // Validation 4: Duplicate Admission Number in Database
    if (existingAdmissionNumbers.has(admKey)) {
      errors.push({
        row: rowNum,
        admissionNumber,
        reason: "Admission number already exists in system",
      });
      continue;
    }

    // Passed all validations -> Add to batch & map tracking
    batchAdmissionNumbers.add(admKey);

    // Normalize Enum Values for Mongoose Schema Compliance
    let normalizedRelation = "Father";
    const rawRelation = row.guardianRelation ? String(row.guardianRelation).trim() : "";
    if (/^father$/i.test(rawRelation)) normalizedRelation = "Father";
    else if (/^mother$/i.test(rawRelation)) normalizedRelation = "Mother";
    else if (/^guardian$/i.test(rawRelation)) normalizedRelation = "Guardian";

    const bloodGroup = row.bloodGroup ? String(row.bloodGroup).trim().toUpperCase() : undefined;
    const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const normalizedBloodGroup = validBloodGroups.includes(bloodGroup) ? bloodGroup : undefined;

    const economicCategory = row.economicCategory ? String(row.economicCategory).trim().toUpperCase() : undefined;
    const normalizedEconomicCategory = ["APL", "BPL"].includes(economicCategory) ? economicCategory : undefined;

    validStudents.push({
      admissionNumber,
      admissionDate: row.admissionDate && !isNaN(new Date(row.admissionDate).getTime())
        ? new Date(row.admissionDate)
        : new Date(),
      classId: resolvedClassId,
      divisionId: resolvedDivisionId,
      rollNumber: row.rollNumber && !isNaN(Number(row.rollNumber)) ? Number(row.rollNumber) : undefined,
      nameEnglish,
      nameMalayalam: row.nameMalayalam ? String(row.nameMalayalam).trim() : undefined,
      gender,
      dateOfBirth,
      bloodGroup: normalizedBloodGroup,
      parentName,
      parentPhone: cleanPhone,
      guardianRelation: normalizedRelation,
      address,
      aadhaarNumber: cleanAadhaar || undefined,
      economicCategory: normalizedEconomicCategory,
      status: row.status && ["active", "inactive"].includes(String(row.status).toLowerCase())
        ? String(row.status).toLowerCase()
        : "active",
    });
  }

  /* =========================================
     3. BATCH INSERTION
  ========================================= */

  let insertedCount = 0;

  if (validStudents.length > 0) {
    try {
      const inserted = await StudentModel.insertMany(validStudents, {
        ordered: false,
      });
      insertedCount = inserted.length;
    } catch (insertErr) {
      if (insertErr.insertedDocs) {
        insertedCount = insertErr.insertedDocs.length;
      }
      if (insertErr.writeErrors) {
        insertErr.writeErrors.forEach((we) => {
          errors.push({
            row: "N/A",
            admissionNumber: we.err?.op?.admissionNumber || "N/A",
            reason: we.err?.errmsg || "Database insertion failed",
          });
        });
      }
    }
  }

  /* =========================================
     4. RESULT SUMMARY
  ========================================= */

  return {
    totalRows: records.length,
    successCount: insertedCount,
    failedCount: errors.length,
    errors,
  };
};

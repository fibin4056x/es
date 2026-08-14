import StudentModel from "../models/student.model.js";
import ClassModel from "../models/class.model.js";
import DivisionModel from "../models/division.model.js";
import ApiError from "../utils/ApiError.js";

/* =========================================
   BULK IMPORT STUDENTS SERVICE
========================================= */

export const importStudentsService = async (records, options = {}) => {
  const { defaultClassId, defaultDivisionId, classId, divisionId } = options;
  const targetClassId = defaultClassId || classId;
  const targetDivisionId = defaultDivisionId || divisionId;

  if (!Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, "Import file contains no valid student records");
  }

  /* =========================================
     1. IN-MEMORY LOOKUPS FOR O(1) BATCHING
  ========================================= */

  const classes = await ClassModel.find({});
  const divisions = await DivisionModel.find({}).populate("classId", "name");
  const existingStudents = await StudentModel.find({}).select("admissionNumber");

  // Validate default classId and divisionId if provided
  let targetClass = null;
  let targetDivision = null;

  if (targetClassId) {
    targetClass = classes.find((c) => c._id.toString() === String(targetClassId));
    if (!targetClass) {
      throw new ApiError(404, "Target default class specified for import not found");
    }
  }

  if (targetDivisionId) {
    targetDivision = divisions.find((d) => d._id.toString() === String(targetDivisionId));
    if (!targetDivision) {
      throw new ApiError(404, "Target default division specified for import not found");
    }
    const divClassIdStr = targetDivision.classId?._id?.toString() || targetDivision.classId?.toString();
    if (targetClass && divClassIdStr !== targetClass._id.toString()) {
      throw new ApiError(400, "Target default division does not belong to the specified target class");
    }
  }

  // Build flexible Class lookup maps
  const classMap = new Map();
  classes.forEach((cls) => {
    const rawName = cls.name.trim().toLowerCase();
    classMap.set(rawName, cls);

    // Normalize "Class 10" -> "10" or "10" -> "class 10"
    const numericMatch = rawName.match(/\d+/);
    if (numericMatch) {
      const numStr = numericMatch[0];
      if (!classMap.has(numStr)) classMap.set(numStr, cls);
      if (!classMap.has(`class ${numStr}`)) classMap.set(`class ${numStr}`, cls);
      if (!classMap.has(`std ${numStr}`)) classMap.set(`std ${numStr}`, cls);
      if (!classMap.has(`standard ${numStr}`)) classMap.set(`standard ${numStr}`, cls);
    }
  });

  // Build flexible Division lookup maps keyed by `${classId}_${divisionName}`
  const divisionMap = new Map();
  divisions.forEach((div) => {
    const parentClassId = div.classId?._id?.toString() || div.classId?.toString();
    const rawDivName = div.name.trim().toLowerCase();
    if (parentClassId && rawDivName) {
      divisionMap.set(`${parentClassId}_${rawDivName}`, div);

      // Support "10-A" or "Class 10-A" matching to "A"
      const parts = rawDivName.split(/[-_\s]+/);
      const lastPart = parts[parts.length - 1];
      if (lastPart && !divisionMap.has(`${parentClassId}_${lastPart}`)) {
        divisionMap.set(`${parentClassId}_${lastPart}`, div);
      }
    }
  });

  // DB Admission Numbers Set (case-insensitive)
  const existingAdmissionNumbers = new Set(
    existingStudents.map((s) => s.admissionNumber.trim().toLowerCase())
  );

  /* =========================================
     2. BATCH ROW VALIDATION & NORMALIZATION
  ========================================= */

  const validStudents = [];
  const errors = [];
  const batchAdmissionNumbers = new Set();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // 1-indexed row number accounting for header

    const admissionNumber = row.admissionNumber ? String(row.admissionNumber).trim() : "";
    const nameEnglish = row.nameEnglish ? String(row.nameEnglish).trim() : "";
    const gender = row.gender ? String(row.gender).trim().toLowerCase() : "";
    const rawDob = row.dateOfBirth ? String(row.dateOfBirth).trim() : "";
    const dateOfBirth = rawDob ? new Date(rawDob) : null;
    const parentName = row.parentName ? String(row.parentName).trim() : "";
    const parentPhone = row.parentPhone ? String(row.parentPhone).trim() : "";
    const address = row.address ? String(row.address).trim() : "";
    const className = row.className ? String(row.className).trim() : "";
    const divisionName = row.divisionName ? String(row.divisionName).trim() : "";

    // Clean Phone & Aadhaar
    const cleanPhone = parentPhone.replace(/\D/g, "").slice(-10);
    const cleanAadhaar = row.aadhaarNumber ? String(row.aadhaarNumber).replace(/\D/g, "") : "";

    /* --- CLASS & DIVISION RESOLUTION --- */
    let resolvedClass = null;
    let resolvedDivision = null;

    // 1. Resolve Class: Row Value overrides Default
    if (className) {
      const classKey = className.toLowerCase().trim();
      resolvedClass = classMap.get(classKey);
      if (!resolvedClass) {
        errors.push({
          row: rowNum,
          admissionNumber: admissionNumber || "N/A",
          reason: `Class '${className}' does not exist in system`,
        });
        continue;
      }
    } else if (targetClass) {
      resolvedClass = targetClass;
    }

    if (!resolvedClass) {
      errors.push({
        row: rowNum,
        admissionNumber: admissionNumber || "N/A",
        reason: "Class is required (specify in row or select a default class)",
      });
      continue;
    }

    // 2. Resolve Division: Row Value overrides Default
    if (divisionName) {
      const divKey = `${resolvedClass._id.toString()}_${divisionName.toLowerCase().trim()}`;
      resolvedDivision = divisionMap.get(divKey);

      // Fallback: try raw division name if divisionName contains full name like "10-A"
      if (!resolvedDivision) {
        const parts = divisionName.trim().split(/[-_\s]+/);
        const lastPart = parts[parts.length - 1]?.toLowerCase();
        if (lastPart) {
          resolvedDivision = divisionMap.get(`${resolvedClass._id.toString()}_${lastPart}`);
        }
      }

      if (!resolvedDivision) {
        errors.push({
          row: rowNum,
          admissionNumber: admissionNumber || "N/A",
          reason: `Division '${divisionName}' does not exist under Class '${resolvedClass.name}'`,
        });
        continue;
      }
    } else if (targetDivision) {
      const targetDivClassIdStr = targetDivision.classId?._id?.toString() || targetDivision.classId?.toString();
      if (targetDivClassIdStr === resolvedClass._id.toString()) {
        resolvedDivision = targetDivision;
      } else {
        // Find matching division name in resolvedClass if default division name exists
        const targetDivName = targetDivision.name?.trim().toLowerCase();
        resolvedDivision = divisionMap.get(`${resolvedClass._id.toString()}_${targetDivName}`);
      }
    }

    if (!resolvedDivision) {
      errors.push({
        row: rowNum,
        admissionNumber: admissionNumber || "N/A",
        reason: `Division is required (specify in row or select a default division for ${resolvedClass.name})`,
      });
      continue;
    }

    /* --- FIELD VALIDATIONS --- */
    const missingFields = [];
    if (!admissionNumber) missingFields.push("Admission Number");
    if (!nameEnglish) missingFields.push("Student Name");
    if (!gender) missingFields.push("Gender");
    if (!dateOfBirth || isNaN(dateOfBirth.getTime())) missingFields.push("Valid Date of Birth");
    if (!parentName) missingFields.push("Parent Name");
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) missingFields.push("Valid 10-digit Parent Phone");
    if (!address) missingFields.push("Address");

    if (missingFields.length > 0) {
      errors.push({
        row: rowNum,
        admissionNumber: admissionNumber || "N/A",
        reason: `Missing/invalid required field(s): ${missingFields.join(", ")}`,
      });
      continue;
    }

    // Gender Enum Validation
    if (!["male", "female", "other"].includes(gender)) {
      errors.push({
        row: rowNum,
        admissionNumber,
        reason: `Invalid gender '${gender}'. Must be male, female, or other`,
      });
      continue;
    }

    // Optional Aadhaar Validation (exactly 12 digits if provided)
    if (cleanAadhaar && cleanAadhaar.length !== 12) {
      errors.push({
        row: rowNum,
        admissionNumber,
        reason: "Aadhaar number must be exactly 12 digits",
      });
      continue;
    }

    // Duplicate Admission Number in File Batch
    const admKey = admissionNumber.toLowerCase();
    if (batchAdmissionNumbers.has(admKey)) {
      errors.push({
        row: rowNum,
        admissionNumber,
        reason: "Duplicate admission number within the import file",
      });
      continue;
    }

    // Duplicate Admission Number in Database
    if (existingAdmissionNumbers.has(admKey)) {
      errors.push({
        row: rowNum,
        admissionNumber,
        reason: "Admission number already exists in system",
      });
      continue;
    }

    // Passed validations -> track admission number
    batchAdmissionNumbers.add(admKey);

    // Normalize Guardian Relation
    let normalizedRelation = "Father";
    const rawRelation = row.guardianRelation ? String(row.guardianRelation).trim() : "";
    if (/^father$/i.test(rawRelation)) normalizedRelation = "Father";
    else if (/^mother$/i.test(rawRelation)) normalizedRelation = "Mother";
    else if (/^guardian$/i.test(rawRelation)) normalizedRelation = "Guardian";

    // Normalize Blood Group
    const bloodGroup = row.bloodGroup ? String(row.bloodGroup).trim().toUpperCase() : undefined;
    const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const normalizedBloodGroup = validBloodGroups.includes(bloodGroup) ? bloodGroup : undefined;

    // Normalize Economic Category
    const economicCategory = row.economicCategory ? String(row.economicCategory).trim().toUpperCase() : undefined;
    const normalizedEconomicCategory = ["APL", "BPL"].includes(economicCategory) ? economicCategory : undefined;

    validStudents.push({
      admissionNumber,
      admissionDate: row.admissionDate && !isNaN(new Date(row.admissionDate).getTime())
        ? new Date(row.admissionDate)
        : new Date(),
      classId: resolvedClass._id,
      divisionId: resolvedDivision._id,
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
     3. BATCH INSERTION (PARTIAL SUCCESS EXECUTION)
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
      if (insertErr.writeErrors && Array.isArray(insertErr.writeErrors)) {
        insertErr.writeErrors.forEach((we) => {
          const admNo = we.err?.op?.admissionNumber || "N/A";
          const errmsg = we.err?.errmsg || insertErr.message || "Database insertion failed";
          const isDuplicate = errmsg.includes("E11000") || errmsg.includes("duplicate key");
          errors.push({
            row: "N/A",
            admissionNumber: admNo,
            reason: isDuplicate
              ? `Admission number '${admNo}' already exists`
              : "Database insertion error",
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
    successfullyAdded: insertedCount,
    successCount: insertedCount,
    failed: errors.length,
    failedCount: errors.length,
    errors,
  };
};

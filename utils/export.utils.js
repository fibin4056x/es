import XLSX from "xlsx";

/* =========================================
   DATE FORMATTER HELPER
========================================= */

const formatDate = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

/* =========================================
   FILENAME SANITIZER
========================================= */

const sanitizeFileNamePart = (str) => {
  if (!str) return "export";
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/* =========================================
   GENERATE PROFESSIONAL FILENAMES
   Examples:
   - students-2026-08-04.csv
   - students-class-10.xlsx
   - students-division-a.csv
   - students-teacher-john.xlsx
========================================= */

export const generateFileName = (metadata, format) => {
  const today = new Date().toISOString().split("T")[0];
  const ext = format === "xlsx" ? "xlsx" : "csv";

  switch (metadata?.scope) {
    case "class": {
      const className = sanitizeFileNamePart(metadata.className);
      return `students-class-${className}.${ext}`;
    }
    case "division": {
      const divName = sanitizeFileNamePart(metadata.divisionName);
      return `students-division-${divName}.${ext}`;
    }
    case "teacher": {
      const teacherName = sanitizeFileNamePart(metadata.teacherName);
      return `students-teacher-${teacherName}.${ext}`;
    }
    case "all":
    default:
      return `students-${today}.${ext}`;
  }
};

/* =========================================
   GENERATE EXPORT BUFFER (CSV / XLSX)
========================================= */

export const generateExportBuffer = ({ metadata, data, format }) => {
  const formattedData = (data || []).map((row) => ({
    "Admission No": row.admissionNumber || "",
    "Admission Date": formatDate(row.admissionDate),
    "Roll No": row.rollNumber ?? "",
    "Name (English)": row.nameEnglish || "",
    "Name (Malayalam)": row.nameMalayalam || "",
    Gender: row.gender || "",
    "Date of Birth": formatDate(row.dateOfBirth),
    "Blood Group": row.bloodGroup || "",
    Class: row.className || "",
    "Academic Year": row.academicYear || "",
    Division: row.divisionName || "",
    "Parent/Guardian Name": row.parentName || "",
    "Parent Phone": row.parentPhone || "",
    Relation: row.guardianRelation || "",
    Address: row.address || "",
    "Aadhaar Number": row.aadhaarNumber || "",
    "Economic Category": row.economicCategory || "",
    Status: row.status || "",
  }));

  const defaultHeaders = [
    "Admission No",
    "Admission Date",
    "Roll No",
    "Name (English)",
    "Name (Malayalam)",
    "Gender",
    "Date of Birth",
    "Blood Group",
    "Class",
    "Academic Year",
    "Division",
    "Parent/Guardian Name",
    "Parent Phone",
    "Relation",
    "Address",
    "Aadhaar Number",
    "Economic Category",
    "Status",
  ];

  const worksheet =
    formattedData.length > 0
      ? XLSX.utils.json_to_sheet(formattedData)
      : XLSX.utils.json_to_sheet([], { header: defaultHeaders });

  // Auto-fit column widths
  if (formattedData.length > 0) {
    const colWidths = Object.keys(formattedData[0]).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...formattedData.map((row) => String(row[key] || "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    worksheet["!cols"] = colWidths;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  const filename = generateFileName(metadata, format);

  if (format === "xlsx") {
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return {
      buffer,
      filename,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } else {
    // CSV format with UTF-8 BOM for Excel compatibility
    const csvString = XLSX.utils.sheet_to_csv(worksheet);
    const buffer = Buffer.from("\uFEFF" + csvString, "utf-8");
    return {
      buffer,
      filename,
      contentType: "text/csv; charset=utf-8",
    };
  }
};


import ExcelJS from "exceljs";

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
   GENERATE EXPORT BUFFER (EXCELJS)
========================================= */

export const generateExportBuffer = async ({ metadata, data, format }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "School LMS";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Students", {
    views: [{ showGridLines: true }],
  });

  const columns = [
    { header: "Admission No", key: "admissionNumber", width: 18 },
    { header: "Admission Date", key: "admissionDate", width: 15 },
    { header: "Roll No", key: "rollNumber", width: 10 },
    { header: "Name (English)", key: "nameEnglish", width: 25 },
    { header: "Name (Malayalam)", key: "nameMalayalam", width: 25 },
    { header: "Gender", key: "gender", width: 12 },
    { header: "Date of Birth", key: "dateOfBirth", width: 15 },
    { header: "Blood Group", key: "bloodGroup", width: 14 },
    { header: "Class", key: "className", width: 12 },
    { header: "Academic Year", key: "academicYear", width: 16 },
    { header: "Division", key: "divisionName", width: 12 },
    { header: "Parent/Guardian Name", key: "parentName", width: 24 },
    { header: "Parent Phone", key: "parentPhone", width: 16 },
    { header: "Relation", key: "guardianRelation", width: 14 },
    { header: "Address", key: "address", width: 30 },
    { header: "Aadhaar Number", key: "aadhaarNumber", width: 18 },
    { header: "Economic Category", key: "economicCategory", width: 18 },
    { header: "Status", key: "status", width: 12 },
  ];

  worksheet.columns = columns;

  // Add Data Rows
  (data || []).forEach((row) => {
    worksheet.addRow({
      admissionNumber: row.admissionNumber || "",
      admissionDate: formatDate(row.admissionDate),
      rollNumber: row.rollNumber ?? "",
      nameEnglish: row.nameEnglish || "",
      nameMalayalam: row.nameMalayalam || "",
      gender: row.gender || "",
      dateOfBirth: formatDate(row.dateOfBirth),
      bloodGroup: row.bloodGroup || "",
      className: row.className || "",
      academicYear: row.academicYear || "",
      divisionName: row.divisionName || "",
      parentName: row.parentName || "",
      parentPhone: row.parentPhone || "",
      guardianRelation: row.guardianRelation || "",
      address: row.address || "",
      aadhaarNumber: row.aadhaarNumber || "",
      economicCategory: row.economicCategory || "",
      status: row.status || "",
    });
  });

  // Professional Header Styling for Excel
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1F4E78" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "D9D9D9" } },
      bottom: { style: "medium", color: { argb: "1F4E78" } },
      left: { style: "thin", color: { argb: "D9D9D9" } },
      right: { style: "thin", color: { argb: "D9D9D9" } },
    };
  });

  // Auto-fit column widths based on content
  worksheet.columns.forEach((column) => {
    let maxLen = column.header ? String(column.header).length : 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellLen = cell.value ? String(cell.value).length : 0;
      if (cellLen > maxLen) {
        maxLen = cellLen;
      }
    });
    column.width = Math.min(Math.max(maxLen + 3, 12), 45);
  });

  const filename = generateFileName(metadata, format);

  if (format === "xlsx") {
    const rawBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(rawBuffer);
    return {
      buffer,
      filename,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } else {
    // CSV format with UTF-8 BOM for Microsoft Excel compatibility
    const rawBuffer = await workbook.csv.writeBuffer();
    const buffer = Buffer.concat([Buffer.from("\uFEFF", "utf-8"), Buffer.from(rawBuffer)]);
    return {
      buffer,
      filename,
      contentType: "text/csv; charset=utf-8",
    };
  }
};


import XLSX from "xlsx";

/* =========================================
   HEADER ALIAS MAPPING FOR FLEXIBLE IMPORT
========================================= */

const HEADER_MAP = {
  admissionnumber: "admissionNumber",
  admissionno: "admissionNumber",
  "admission number": "admissionNumber",
  "admission no": "admissionNumber",
  "admission #": "admissionNumber",

  admissiondate: "admissionDate",
  "admission date": "admissionDate",

  rollnumber: "rollNumber",
  rollno: "rollNumber",
  "roll number": "rollNumber",
  "roll no": "rollNumber",

  nameenglish: "nameEnglish",
  "name (english)": "nameEnglish",
  "name english": "nameEnglish",
  "student name": "nameEnglish",
  "student name (english)": "nameEnglish",
  name: "nameEnglish",

  namemalayalam: "nameMalayalam",
  "name (malayalam)": "nameMalayalam",
  "name malayalam": "nameMalayalam",
  "student name (malayalam)": "nameMalayalam",

  gender: "gender",
  sex: "gender",

  dateofbirth: "dateOfBirth",
  dob: "dateOfBirth",
  "date of birth": "dateOfBirth",

  bloodgroup: "bloodGroup",
  "blood group": "bloodGroup",

  class: "className",
  classname: "className",
  "class name": "className",
  standard: "className",
  grade: "className",

  division: "divisionName",
  divisionname: "divisionName",
  "division name": "divisionName",
  section: "divisionName",
  sec: "divisionName",

  parentname: "parentName",
  "parent name": "parentName",
  "parent/guardian name": "parentName",
  "guardian name": "parentName",
  guardian: "parentName",

  parentphone: "parentPhone",
  "parent phone": "parentPhone",
  phone: "parentPhone",
  "contact number": "parentPhone",
  "phone number": "parentPhone",
  "mobile number": "parentPhone",
  mobile: "parentPhone",
  contact: "parentPhone",

  relation: "guardianRelation",
  "guardian relation": "guardianRelation",
  relationship: "guardianRelation",

  address: "address",
  "residential address": "address",

  aadhaar: "aadhaarNumber",
  aadhaarnumber: "aadhaarNumber",
  "aadhaar number": "aadhaarNumber",
  "aadhaar no": "aadhaarNumber",
  aadhar: "aadhaarNumber",
  aadharno: "aadhaarNumber",
  "aadhar no": "aadhaarNumber",

  economiccategory: "economicCategory",
  "economic category": "economicCategory",
  "apl/bpl": "economicCategory",
  category: "economicCategory",

  status: "status",
};

/* =========================================
   PARSE FILE BUFFER TO NORMALIZED OBJECTS
========================================= */

export const parseImportFile = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  return rawRows.map((row) => {
    const normalizedRow = {};

    Object.keys(row).forEach((key) => {
      const cleanKey = String(key).trim().toLowerCase();
      const mappedProp = HEADER_MAP[cleanKey] || key;
      normalizedRow[mappedProp] = row[key];
    });

    return normalizedRow;
  });
};

/* =========================================
   GENERATE SAMPLE IMPORT TEMPLATE
========================================= */

export const generateImportTemplateBuffer = (format = "csv") => {
  const sampleData = [
    {
      "Admission No": "ADM-2026-001",
      "Admission Date": "2026-06-01",
      "Roll No": 1,
      "Name (English)": "John Doe",
      "Name (Malayalam)": "",
      Gender: "male",
      "Date of Birth": "2010-05-15",
      "Blood Group": "O+",
      Class: "10",
      Division: "A",
      "Parent/Guardian Name": "Robert Doe",
      "Parent Phone": "9876543210",
      Relation: "Father",
      Address: "123 Main Street, City",
      "Aadhaar Number": "123456789012",
      "Economic Category": "APL",
      Status: "active",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  const colWidths = Object.keys(sampleData[0]).map((key) => ({
    wch: Math.max(key.length + 3, 15),
  }));
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

  const ext = format === "xlsx" ? "xlsx" : "csv";
  const filename = `student_import_template.${ext}`;

  if (format === "xlsx") {
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return {
      buffer,
      filename,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } else {
    const csvString = XLSX.utils.sheet_to_csv(worksheet);
    const buffer = Buffer.from("\uFEFF" + csvString, "utf-8");
    return {
      buffer,
      filename,
      contentType: "text/csv; charset=utf-8",
    };
  }
};

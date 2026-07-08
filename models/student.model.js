import mongoose from "mongoose";

const normalizeOptionalString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  const trimmed = String(value).trim();

  return trimmed || undefined;
};

const studentSchema = new mongoose.Schema(
  {
    /* =========================================
       ACADEMIC INFO
    ========================================= */

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Division",
      required: true,
    },

    admissionDate: {
      type: Date,
      required: true,
    },



    /* =========================================
       STUDENT BASIC INFO
    ========================================= */

    nameEnglish: {
      type: String,
      required: true,
      trim: true,
    },

    nameArabic: {
      type: String,
      trim: true,
      set: normalizeOptionalString,
    },

    gender: {
      type: String,
      enum: [
        "male",
        "female",
        "other",
      ],
      set: normalizeOptionalString,
    },

    dateOfBirth: {
      type: Date,
    },



    /* =========================================
       IDENTITY INFO
    ========================================= */

    examRegisterNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      set: normalizeOptionalString,
    },

    aadhaarNumber: {
      type: String,
      trim: true,
      set: normalizeOptionalString,
    },



    /* =========================================
       ECONOMIC CATEGORY
    ========================================= */

    economicCategory: {
      type: String,
      enum: ["BPL", "APL"],
      set: normalizeOptionalString,
    },



    /* =========================================
       PHOTO
    ========================================= */

    photo: {
      type: String,
      default: "",
    },



    /* =========================================
       STATUS
    ========================================= */

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
      ],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const StudentModel = mongoose.model(
  "Student",
  studentSchema
);

export default StudentModel;
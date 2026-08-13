import mongoose from "mongoose";

const normalizeOptionalString = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  const trimmed =
    String(value).trim();

  return trimmed || undefined;
};

const studentSchema =
  new mongoose.Schema(
    {
      admissionNumber: {
        type: String,
        required: [
          true,
          "Admission number is required",
        ],
        unique: true,
        trim: true,
      },

      admissionDate: {
        type: Date,
        required: [
          true,
          "Admission date is required",
        ],
      },

      classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true,
        index: true,
      },

      divisionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Division",
        required: true,
        index: true,
      },

      rollNumber: {
        type: Number,
        min: 1,
      },

      status: {
        type: String,
        enum: [
          "active",
          "inactive",
        ],
        default: "active",
        required: true,
        index: true,
      },

      nameEnglish: {
        type: String,
        required: [
          true,
          "Student name is required",
        ],
        trim: true,
        maxlength: 100,
      },

      nameMalayalam: {
        type: String,
        trim: true,
        maxlength: 100,
        set: normalizeOptionalString,
      },

      gender: {
        type: String,
        enum: [
          "male",
          "female",
          "other",
        ],
        required: true,
      },

      dateOfBirth: {
        type: Date,
        required: true,
      },

      bloodGroup: {
        type: String,
        enum: [
          "A+",
          "A-",
          "B+",
          "B-",
          "AB+",
          "AB-",
          "O+",
          "O-",
        ],
        set: normalizeOptionalString,
      },

      photo: {
        type: String,
        trim: true,
        default: "",
      },

      parentName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      parentPhone: {
        type: String,
        required: true,
        trim: true,
        match: [
          /^[6-9]\d{9}$/,
          "Invalid phone number",
        ],
      },

      guardianRelation: {
        type: String,
        enum: [
          "Father",
          "Mother",
          "Guardian",
        ],
        required: true,
      },

      address: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300,
      },

      aadhaarNumber: {
        type: String,
        trim: true,
        sparse: true,
        set: normalizeOptionalString,
        match: [
          /^\d{12}$/,
          "Aadhaar number must be 12 digits",
        ],
      },

      economicCategory: {
        type: String,
        enum: [
          "APL",
          "BPL",
        ],
        set: normalizeOptionalString,
      },
    },

    {
      timestamps: true,
      versionKey: false,
    }
  );

studentSchema.index({
  classId: 1,
  divisionId: 1,
});

studentSchema.index({
  nameEnglish: "text",
});

const StudentModel =
  mongoose.model(
    "Student",
    studentSchema
  );

export default StudentModel;
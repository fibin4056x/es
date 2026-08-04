import mongoose from "mongoose";

/* =========================================
   DOCUMENT SCHEMA
========================================= */

const documentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

/* =========================================
   ATTENDANCE SCHEMA
========================================= */

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
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

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["present", "absent", "late", "leave"],
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    documents: {
      type: [documentSchema],
      default: [],
      validate: {
        validator: (documents) => documents.length <= 10,
        message: "Maximum 10 documents are allowed.",
      },
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
  }
);

/* =========================================
   UNIQUE INDEX
========================================= */

attendanceSchema.index(
  {
    studentId: 1,
    divisionId: 1,
    date: 1,
  },
  {
    unique: true,
    name: "unique_student_attendance",
  }
);

/* =========================================
   FILTER INDEXES
========================================= */

attendanceSchema.index({ classId: 1 });
attendanceSchema.index({ divisionId: 1 });
attendanceSchema.index({ studentId: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ markedBy: 1 });

/* =========================================
   COMPOUND INDEXS FOR REPORTS
========================================= */

attendanceSchema.index({
  classId: 1,
  divisionId: 1,
  date: -1,
});

attendanceSchema.index({
  divisionId: 1,
  status: 1,
  date: -1,
});

/* =========================================
   EXPORT
========================================= */

const Attendance = mongoose.model(
  "Attendance",
  attendanceSchema
);

export default Attendance;
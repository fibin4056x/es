import mongoose from "mongoose";

/* =========================================
   ACADEMIC CALENDAR SCHEMA
========================================= */

const academicCalendarSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    category: {
      type: String,
      enum: [
        "holiday",
        "vacation",
        "exam",
        "event",
        "meeting",
      ],
      required: true,
      lowercase: true,
      trim: true,
    },

    target: {
      type: String,
      enum: [
        "school",
        "class",
        "division",
      ],
      required: true,
      lowercase: true,
      trim: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },

    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Division",
      default: null,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    repeatEveryYear: {
      type: Boolean,
      default: false,
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: [
        "normal",
        "important",
        "critical",
      ],
      default: "normal",
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: [
        "active",
        "inactive",
      ],
      default: "active",
      lowercase: true,
      trim: true,
    },
    updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
  }
);

/* =========================================
   INDEXES
========================================= */

academicCalendarSchema.index({
  academicYear: 1,
  category: 1,
});

academicCalendarSchema.index({
  target: 1,
  classId: 1,
  divisionId: 1,
});

academicCalendarSchema.index({
  startDate: 1,
  endDate: 1,
});

academicCalendarSchema.index({
  status: 1,
});

/* =========================================
   EXPORT
========================================= */

const AcademicCalendar = mongoose.model(
  "AcademicCalendar",
  academicCalendarSchema
);

export default AcademicCalendar;
import mongoose from "mongoose";


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
    },

    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Division",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    status: {
      type: String,
      enum: ["present", "absent", "late", "leave"],
      required: true,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
    },

documents: [
  {
    url: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },

    fileName: {
      type: String,
      required: true,
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
],

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

attendanceSchema.index(
  {
    studentId: 1,
    divisionId: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model("Attendance", attendanceSchema);
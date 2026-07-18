import mongoose from "mongoose";

const attendanceStudentSchema =
  new mongoose.Schema(
    {
      studentId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Student",

        required: true,
      },

      status: {
        type: String,

        enum: [
          "present",
          "absent",
          "late",
        ],

        default: "absent",
      },

      reason: {
        type: String,

        trim: true,

        default: "",
      },
    },
    {
      _id: false,
    }
  );

const attendanceSchema =
  new mongoose.Schema(
    {
      /* =============================
         DATE
      ============================= */

      date: {
        type: Date,

        required: true,
      },

      /* =============================
         CLASS
      ============================= */

      classId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Class",

        required: true,
      },

      /* =============================
         DIVISION
      ============================= */

      divisionId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Division",

        required: true,
      },

      /* =============================
         MARKED BY
      ============================= */

      markedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,
      },

      /* =============================
         STUDENTS
      ============================= */

      students: [
        attendanceStudentSchema,
      ],
    },
    {
      timestamps: true,

      versionKey: false,
    }
  );

/* =====================================
   ONE ATTENDANCE PER DIVISION PER DAY
===================================== */

attendanceSchema.index(
  {
    divisionId: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

const AttendanceModel =
  mongoose.model(
    "Attendance",
    attendanceSchema
  );

export default AttendanceModel;
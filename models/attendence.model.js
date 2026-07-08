import mongoose from "mongoose";

const attendanceSchema =
  new mongoose.Schema(
    {

      /* =====================================
         STUDENT
      ===================================== */
      studentId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Student",

        required: true,
      },

      /* =====================================
         DIVISION
      ===================================== */
      divisionId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Division",

        required: true,
      },

      /* =====================================
         STATUS
      ===================================== */
      status: {
        type: String,

        enum: [
          "present",
          "absent",
          "late",
        ],

        default: "present",
      },

      /* =====================================
         REMARKS
      ===================================== */
      remarks: {
        type: String,
        default: "",
      },

      /* =====================================
         DATE
      ===================================== */
      date: {
        type: Date,

        required: true,
      },
    },

    {
      timestamps: true,
    }
  );

const Attendance =
  mongoose.model(
    "Attendance",
    attendanceSchema
  );

export default Attendance;
import mongoose from "mongoose";

const documentSchema =
  new mongoose.Schema(
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

const attendanceSchema =
  new mongoose.Schema(
    {
      date: {
        type: Date,
        required: true,
        index: true,
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
        enum: [
          "present",
          "absent",
          "late",
          "leave",
        ],
        required: true,
        lowercase: true,
        trim: true,
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
          validator: (documents) =>
            documents.length <= 10,

          message:
            "Maximum 10 documents are allowed.",
        },
      },

      markedBy: {
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

/*
|--------------------------------------------------------------------------
| UNIQUE ATTENDANCE
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| QUERY INDEXES
|--------------------------------------------------------------------------
*/

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

attendanceSchema.index({
  studentId: 1,
  date: -1,
});

const Attendance =
  mongoose.model(
    "Attendance",
    attendanceSchema
  );

export default Attendance;
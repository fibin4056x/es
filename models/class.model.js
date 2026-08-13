import mongoose from "mongoose";

const classSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: [
          true,
          "Class name is required",
        ],
        trim: true,
        maxlength: 100,
      },

      academicYear: {
        type: String,
        required: [
          true,
          "Academic year is required",
        ],
        trim: true,
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
    },

    {
      timestamps: true,
      versionKey: false,
    }
  );

classSchema.index(
  {
    name: 1,
    academicYear: 1,
  },
  {
    unique: true,
  }
);

const ClassModel =
  mongoose.model(
    "Class",
    classSchema
  );

export default ClassModel;
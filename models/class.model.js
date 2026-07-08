import mongoose from "mongoose";



const classSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      academicYear: {
        type: String,
        required: true,
        trim: true,
      },

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

classSchema.index(
  { name: 1, academicYear: 1 },
  { unique: true }
);



const ClassModel =
  mongoose.model(
    "Class",
    classSchema
  );



export default ClassModel;

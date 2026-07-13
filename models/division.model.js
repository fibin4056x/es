import mongoose from "mongoose";



const divisionSchema =
  new mongoose.Schema(
    {
      /* =========================
         DIVISION NAME
         Example:
         A / B / C
      ========================= */

      name: {
        type: String,
        required: true,
        trim: true,
      },



      /* =========================
         RELATED CLASS
      ========================= */

      classId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Class",

        required: true,
      },



      /* =========================
         ASSIGNED CLASS TEACHER
      ========================= */

      assignedTeacher: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        default: null,
      },



      /* =========================
         STUDENT CAPACITY
      ========================= */

      capacity: {
        type: Number,

        default: 40,
      },



      /* =========================
         STATUS
      ========================= */

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
divisionSchema.index(
  {
    classId: 1,
    name: 1,
  },
  {
    unique: true,
  }
);


const DivisionModel =
  mongoose.model(
    "Division",
    divisionSchema
  );



export default DivisionModel;
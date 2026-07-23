import DivisionModel
  from "../models/division.model.js";
import StudentModel from "../models/student.model.js";


/* =========================================
   CREATE DIVISION
========================================= */

export const createDivisionService =
  async (divisionData) => {

    const existingDivision =
      await DivisionModel.findOne({
        name: divisionData.name,

        classId:
          divisionData.classId,
      });



    if (existingDivision) {

      throw new Error(
        "Division already exists in this class"
      );
    }



    const newDivision =
      await DivisionModel.create(
        divisionData
      );



    return await newDivision.populate([
      "classId",
      "assignedTeacher",
    ]);
  };



/* =========================================
   GET ALL DIVISIONS
========================================= */

export const getAllDivisionsService =
  async () => {

    const divisions =
      await DivisionModel.find()

        .populate(
          "classId",
          "name"
        )

        .populate(
          "assignedTeacher",
          "name email"
        )

        .sort({ createdAt: -1 });

    return divisions;
  };




/* =========================================
   GET DIVISION BY ID
========================================= */

export const getDivisionByIdService =
  async (divisionId) => {

    const division =
      await DivisionModel.findById(
        divisionId
      )

        .populate("classId")

        .populate("assignedTeacher");



    if (!division) {

      throw new Error(
        "Division not found"
      );
    }



    return division;
  };



/* =========================================
   UPDATE DIVISION
========================================= */

export const updateDivisionService =
  async (
    divisionId,
    updateData
  ) => {

    const updatedDivision =
      await DivisionModel.findByIdAndUpdate(
        divisionId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )

        .populate("classId")

        .populate("assignedTeacher");



    if (!updatedDivision) {

      throw new Error(
        "Division not found"
      );
    }



    return updatedDivision;
  };



/* =========================================
   DELETE DIVISION
========================================= */

export const deleteDivisionService =
  async (divisionId) => {
   const division = await DivisionModel.findById(divisionId);

   if(!divisionId){
    throw new Error("Division  not found ")
   }

   //check  whether student  are assigned to it.

   const hasStudents = await StudentModel.exists({
    divisionId,})
   

   if(hasStudents){
    throw new Error(
      "cannot delete  divisionId because students are assigned to it."
    
    )

   }

   await DivisionModel.findByIdAndDelete(divisionId);

   return {
    message :" Division deleted successfully"
   }
  };
  /* =========================================
   GET DIVISIONS BY TEACHER
========================================= */

export const getTeacherDivisionsService =
  async (teacherId) => {

    return await DivisionModel.find({
      assignedTeacher: teacherId,
    })

      .populate("classId")

      .populate("assignedTeacher")

      .sort({
        createdAt: -1,
      });
  };
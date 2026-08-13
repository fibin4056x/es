import DivisionModel from "../models/division.model.js";
import StudentModel from "../models/student.model.js";
import ApiError from "../utils/ApiError.js";


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



export const getAllDivisionsService = async (options = {}) => {
  let page = Math.max(1, Number(options.page) || 1);
  let limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {};
  if (options.classId) filter.classId = options.classId;
  if (options.status) filter.status = options.status;
  if (options.search && options.search.trim()) {
    filter.name = new RegExp(options.search.trim(), "i");
  }

  const totalRecords = await DivisionModel.countDocuments(filter);
  const divisions = await DivisionModel.find(filter)
    .populate("classId", "name")
    .populate("assignedTeacher", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    divisions,
    pagination: {
      totalRecords,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit) || 1,
      limit,
      hasNextPage: page * limit < totalRecords,
      hasPreviousPage: page > 1,
    },
  };
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

export const deleteDivisionService = async (divisionId) => {
  const division = await DivisionModel.findById(divisionId);

  if (!division) {
    throw new ApiError(404, "Division not found");
  }

  // Check whether students are assigned to it.
  const hasStudents = await StudentModel.exists({
    divisionId,
  });

  if (hasStudents) {
    throw new ApiError(
      400,
      "Cannot delete division because students are assigned to it."
    );
  }

  await DivisionModel.findByIdAndDelete(divisionId);

  return {
    message: "Division deleted successfully",
  };
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
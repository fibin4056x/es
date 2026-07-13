import StudentModel
  from "../models/student.model.js";

import DivisionModel
  from "../models/division.model.js";



/* =========================================
   HELPERS
========================================= */

const isBlankValue = (value) =>
  value === undefined ||
  value === null ||
  String(value).trim() === "";



const normalizeStudentPayload =
  (studentData) => {

    const payload = {
      ...studentData,
    };

   if (
  isBlankValue(
    payload.admissionNumber
  )
) {
  delete payload.admissionNumber;
}
  };



const studentPopulate = [
  {
    path: "classId",
    select: "name",
  },
  {
    path: "divisionId",
    select: "name",
  },
];



/* =========================================
   CREATE STUDENT
========================================= */

export const createStudentService =
  async (studentData) => {

    const newStudent =
      await StudentModel.create(
        normalizeStudentPayload(
          studentData
        )
      );

    return await newStudent.populate(
      studentPopulate
    );
  };



/* =========================================
   GET ALL STUDENTS
========================================= */

export const getAllStudentsService =
  async () => {

    return await StudentModel
      .find()

      .populate(
        studentPopulate
      )

      .sort({
        createdAt: -1,
      });
  };



/* =========================================
   GET STUDENT BY ID
========================================= */

export const getStudentByIdService =
  async (studentId) => {

    const student =
      await StudentModel
        .findById(studentId)

        .populate(
          studentPopulate
        );

    if (!student) {

      throw new Error(
        "Student not found"
      );
    }

    return student;
  };



/* =========================================
   UPDATE STUDENT
========================================= */

export const updateStudentService =
  async (
    studentId,
    updateData
  ) => {

    const payload =
      normalizeStudentPayload(
        updateData
      );

    const updatedStudent =
      await StudentModel
        .findByIdAndUpdate(
          studentId,
          payload,
          {
            new: true,
            runValidators: true,
          }
        )

        .populate(
          studentPopulate
        );

    if (!updatedStudent) {

      throw new Error(
        "Student not found"
      );
    }

    return updatedStudent;
  };



/* =========================================
   DELETE STUDENT
========================================= */

export const deleteStudentService =
  async (studentId) => {

    const deletedStudent =
      await StudentModel.findByIdAndDelete(
        studentId
      );

    if (!deletedStudent) {

      throw new Error(
        "Student not found"
      );
    }

    return deletedStudent;
  };



/* =========================================
   GET STUDENTS BY DIVISION
========================================= */

export const getStudentsByDivisionService =
  async (
    divisionId,
    user
  ) => {

    if (user?.role === "teacher") {

      const assignedDivision =
        await DivisionModel.findOne({
          _id: divisionId,
          assignedTeacher: user.id,
        });

      if (!assignedDivision) {

        throw new Error(
          "Division not assigned to this teacher"
        );
      }
    }

    return await StudentModel
      .find({
        divisionId,
      })

      .populate(
        studentPopulate
      )

      .sort({
        createdAt: -1,
      });
  };
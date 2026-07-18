import StudentModel from "../models/student.model.js";
import DivisionModel from "../models/division.model.js";

/* =========================================
   HELPERS
========================================= */

const isBlankValue = (value) =>
  value === undefined ||
  value === null ||
  String(value).trim() === "";

const normalizeStudentPayload = (
  studentData
) => {
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

  if (
    isBlankValue(
      payload.nameMalayalam
    )
  ) {
    delete payload.nameMalayalam;
  }

  if (
    isBlankValue(
      payload.aadhaarNumber
    )
  ) {
    delete payload.aadhaarNumber;
  }

  if (
    isBlankValue(
      payload.economicCategory
    )
  ) {
    delete payload.economicCategory;
  }

  return payload;
};

/* =========================================
   POPULATE
========================================= */

const studentPopulate = [
  {
    path: "classId",
    select: "name academicYear",
  },
  {
    path: "divisionId",
    select: "name capacity",
  },
];

/* =========================================
   CREATE STUDENT
========================================= */

export const createStudentService =
  async (studentData) => {

    const division =
      await DivisionModel.findById(
        studentData.divisionId
      );

    if (!division) {
      throw new Error(
        "Division not found"
      );
    }

    if (
      division.classId.toString() !==
      studentData.classId
    ) {
      throw new Error(
        "Selected division does not belong to the selected class"
      );
    }

    try {

      const newStudent =
        await StudentModel.create(
          normalizeStudentPayload(
            studentData
          )
        );

      return await newStudent.populate(
        studentPopulate
      );

    } catch (error) {

  console.log("========== DUPLICATE ERROR ==========");
  console.log(error);
  console.log("Code:", error.code);
  console.log("Key Pattern:", error.keyPattern);
  console.log("Key Value:", error.keyValue);
  console.log("=====================================");

  throw error;

}};
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
    updateData,
    user
  ) => {

    const payload =
      normalizeStudentPayload(
        updateData
      );

    /* =========================================
       CHECK STUDENT EXISTS
    ========================================= */

    const existingStudent =
      await StudentModel.findById(
        studentId
      );

    if (!existingStudent) {

      throw new Error(
        "Student not found"
      );

    }

    /* =========================================
       TEACHER CAN UPDATE ONLY
       ASSIGNED DIVISION STUDENTS
    ========================================= */

    if (user?.role === "teacher") {

      const assignedDivision =
        await DivisionModel.findOne({

          _id:
            existingStudent.divisionId,

          assignedTeacher:
            user.id,

        });

      if (!assignedDivision) {

        throw new Error(
          "You are not allowed to update this student"
        );

      }

      /* =========================================
         TEACHER CANNOT CHANGE
         CLASS / DIVISION / ADMISSION NUMBER
      ========================================= */

      payload.classId =
        existingStudent.classId;

      payload.divisionId =
        existingStudent.divisionId;

      payload.admissionNumber =
        existingStudent.admissionNumber;

    }

    /* =========================================
       VALIDATE DIVISION
    ========================================= */

    const division =
      await DivisionModel.findById(
        payload.divisionId
      );

    if (!division) {

      throw new Error(
        "Division not found"
      );

    }

    if (
      division.classId.toString() !==
      payload.classId.toString()
    ) {

      throw new Error(
        "Selected division does not belong to the selected class"
      );

    }

    try {

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

      return updatedStudent;

    } catch (error) {

      if (error.code === 11000) {

        throw new Error(
          "Admission number already exists"
        );

      }

      throw error;

    }

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
        status: "active",
      })

      .populate(
        studentPopulate
      )

      .sort({
        rollNumber: 1,
        nameEnglish: 1,
      });

  };
/* =========================================
   GET STUDENTS BY TEACHER
========================================= */

export const getStudentsByTeacherService =
  async (teacherId) => {

    try {

      /* =====================================
         GET TEACHER DIVISIONS
      ===================================== */

      const divisions =
        await DivisionModel.find({
          assignedTeacher: teacherId,
        }).select("_id");

      const divisionIds =
        divisions.map(
          (division) => division._id
        );

      /* =====================================
         NO DIVISIONS ASSIGNED
      ===================================== */

      if (!divisionIds.length) {

        return [];

      }

      /* =====================================
         GET STUDENTS
      ===================================== */

      const students =
        await StudentModel.find({

          divisionId: {
            $in: divisionIds,
          },

          status: "active",

        })

          .populate(
            studentPopulate
          )

          .sort({

            rollNumber: 1,

            nameEnglish: 1,

          });

      return students;

    } catch (error) {

      console.log(
        "GET TEACHER STUDENTS ERROR:",
        error
      );

      throw new Error(
        "Failed to fetch teacher students"
      );

    }

  };
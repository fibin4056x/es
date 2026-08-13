import {
  createStudentService,
  getAllStudentsService,
  getStudentByIdService,
  updateStudentService,
  deleteStudentService,
  getStudentsByDivisionService,
  getStudentsByTeacherService,
} from "../services/student.service.js";

/* =========================================
   CREATE STUDENT
========================================= */

export const createStudentController = async (req, res) => {
  console.log("CREATE STUDENT BODY:", req.body);

  try {
    const newStudent = await createStudentService(req.body);

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: newStudent,
    });
  } catch (error) {
    console.log("CREATE STUDENT ERROR:", error.message);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   GET ALL STUDENTS
========================================= */

export const getAllStudentsController = async (req, res) => {
  try {
    let result;

    if (req.user.role === "teacher") {
      const students = await getStudentsByTeacherService(req.user.id);
      return res.status(200).json({
        success: true,
        data: students,
      });
    }

    result = await getAllStudentsService(req.query);

    return res.status(200).json({
      success: true,
      data: result.students,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   GET STUDENT BY ID
========================================= */

export const getStudentByIdController = async (req, res) => {
  try {
    const student = await getStudentByIdService(req.params.id);

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   UPDATE STUDENT
========================================= */

export const updateStudentController = async (req, res) => {
  try {
    const updatedStudent = await updateStudentService(
      req.params.id,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   DELETE STUDENT
========================================= */

export const deleteStudentController = async (req, res) => {
  try {
    await deleteStudentService(req.params.id);

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   GET STUDENTS BY TEACHER
========================================= */

export const getStudentsByTeacherController = async (req, res) => {
  try {
    const result = await getStudentsByTeacherService(req.user.id, req.query);

    res.status(200).json({
      success: true,
      data: result.students || result,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   GET STUDENTS BY DIVISION
========================================= */

export const getStudentsByDivisionController = async (req, res) => {
  try {
    const result = await getStudentsByDivisionService(
      req.params.divisionId,
      req.user,
      req.query
    );

    res.status(200).json({
      success: true,
      data: result.students || result,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
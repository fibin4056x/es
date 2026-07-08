import {
  createStudentService,
  getAllStudentsService,
  getStudentByIdService,
  updateStudentService,
  deleteStudentService,
  getStudentsByDivisionService,
} from "../services/student.service.js";



export const createStudentController =
  async (req, res) => {

    console.log(
      "CREATE STUDENT BODY:",
      req.body
    );

    try {

      const newStudent =
        await createStudentService(
          req.body
        );

      res.status(201).json({
        success: true,

        message:
          "Student created successfully",

        data: newStudent,
      });

    } catch (error) {

      console.log(
        "CREATE STUDENT ERROR:",
        error.message
      );

      res.status(400).json({
        success: false,

        message: error.message,
      });
    }
  };



export const getAllStudentsController =
  async (req, res) => {

    try {

      const students =
        await getAllStudentsService();

      res.status(200).json({
        success: true,

        data: students,
      });

    } catch (error) {

      res.status(500).json({
        success: false,

        message: error.message,
      });
    }
  };



export const getStudentByIdController =
  async (req, res) => {

    try {

      const student =
        await getStudentByIdService(
          req.params.id
        );

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



export const updateStudentController =
  async (req, res) => {

    try {

      const updatedStudent =
        await updateStudentService(
          req.params.id,
          req.body
        );

      res.status(200).json({
        success: true,

        message:
          "Student updated successfully",

        data: updatedStudent,
      });

    } catch (error) {

      res.status(400).json({
        success: false,

        message: error.message,
      });
    }
  };



export const deleteStudentController =
  async (req, res) => {

    try {

      await deleteStudentService(
        req.params.id
      );

      res.status(200).json({
        success: true,

        message:
          "Student deleted successfully",
      });

    } catch (error) {

      res.status(404).json({
        success: false,

        message: error.message,
      });
    }
  };

  /* =========================================
   GET STUDENTS BY DIVISION
========================================= */

export const getStudentsByDivisionController =
  async (req, res) => {

    try {

      const students =
        await getStudentsByDivisionService(
          req.params.divisionId,
          req.user
        );



      res.status(200).json({
        success: true,

        data: students,
      });

    } catch (error) {

      res.status(500).json({
        success: false,

        message: error.message,
      });
    }
  };

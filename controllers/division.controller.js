import {
  createDivisionService,
  getAllDivisionsService,
  getDivisionByIdService,
  updateDivisionService,
  deleteDivisionService,
  getTeacherDivisionsService,
  
} from "../services/division.service.js"; 




/* =========================================
   CREATE DIVISION
========================================= */

export const createDivisionController =
  async (req, res) => {

    try {

      const newDivision =
        await createDivisionService(
          req.body
        );



      res.status(201).json({
        success: true,

        message:
          "Division created successfully",

        data: newDivision,
      });

    } catch (error) {

      res.status(400).json({
        success: false,

        message: error.message,
      });
    }
  };



/* =========================================
   GET ALL DIVISIONS
========================================= */

export const getAllDivisionsController =
  async (req, res) => {

    try {

      const divisions =
        await getAllDivisionsService();



      res.status(200).json({
        success: true,

        data: divisions,
      });

    } catch (error) {

      res.status(500).json({
        success: false,

        message: error.message,
      });
    }
  };



/* =========================================
   GET DIVISION BY ID
========================================= */

export const getDivisionByIdController =
  async (req, res) => {

    try {

      const division =
        await getDivisionByIdService(
          req.params.id
        );



      res.status(200).json({
        success: true,

        data: division,
      });

    } catch (error) {

      res.status(404).json({
        success: false,

        message: error.message,
      });
    }
  };



/* =========================================
   UPDATE DIVISION
========================================= */

export const updateDivisionController =
  async (req, res) => {

    try {

      const updatedDivision =
        await updateDivisionService(
          req.params.id,
          req.body
        );



      res.status(200).json({
        success: true,

        message:
          "Division updated successfully",

        data: updatedDivision,
      });

    } catch (error) {

      res.status(400).json({
        success: false,

        message: error.message,
      });
    }
  };



/* =========================================
   DELETE DIVISION
========================================= */

export const deleteDivisionController =
  async (req, res) => {

    try {

      await deleteDivisionService(
        req.params.id
      );



      res.status(200).json({
        success: true,

        message:
          "Division deleted successfully",
      });

    } catch (error) {

      res.status(404).json({
        success: false,

        message: error.message,
      });
    }
  };
/* =========================================
   GET MY DIVISIONS
========================================= */

export const getMyDivisionsController =
  async (req, res) => {

    try {

      const divisions =
        await getTeacherDivisionsService(
          req.user.id
        );



      res.status(200).json({
        success: true,

        data: divisions,
      });

    } catch (error) {

      res.status(500).json({
        success: false,

        message: error.message,
      });
    }
  };

import {
  createClassService,
  getAllClassesService,
  getClassByIdService,
  updateClassService,
  deleteClassService,
} from "../services/class.service.js";



export const createClass = async (
  req,
  res
) => {
  try {

    const newClass =
      await createClassService(
        req.body
      );

    res.status(201).json({
      success: true,
      message:
        "Class created successfully",
      data: newClass,
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



export const getAllClasses =
  async (req, res) => {

    try {

      const classes =
        await getAllClassesService();

      res.status(200).json({
        success: true,
        data: classes,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };



export const getClassById =
  async (req, res) => {

    try {

      const singleClass =
        await getClassByIdService(
          req.params.id
        );

      res.status(200).json({
        success: true,
        data: singleClass,
      });

    } catch (error) {

      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  };



export const updateClass =
  async (req, res) => {

    try {

      const updatedClass =
        await updateClassService(
          req.params.id,
          req.body
        );

      res.status(200).json({
        success: true,
        message:
          "Class updated successfully",
        data: updatedClass,
      });

    } catch (error) {

      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };



export const deleteClass =
  async (req, res) => {

    try {

      await deleteClassService(
        req.params.id
      );

      res.status(200).json({
        success: true,
        message:
          "Class deleted successfully",
      });

    } catch (error) {

      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  };

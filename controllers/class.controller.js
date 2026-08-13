import {
  createClassService,
  getAllClassesService,
  getClassByIdService,
  updateClassService,
  deleteClassService,
} from "../services/class.service.js";

import { getTeacherDivisionsService } from "../services/division.service.js";

/* =========================================
   CREATE CLASS
========================================= */

export const createClass = async (req, res) => {
  try {
    const newClass = await createClassService(req.body);

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: newClass,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   GET ALL CLASSES
========================================= */

export const getAllClasses = async (req, res) => {
  try {
    let classes;
    let pagination;

    if (req.user.role === "teacher") {
      const divisions = await getTeacherDivisionsService(req.user.id);

      classes = [
        ...new Map(
          divisions.map((division) => [
            division.classId._id.toString(),
            division.classId,
          ])
        ).values(),
      ];
    } else {
      const result = await getAllClassesService(req.query);
      classes = result.classes;
      pagination = result.pagination;
    }

    res.status(200).json({
      success: true,
      data: classes,
      pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   GET CLASS BY ID
========================================= */

export const getClassById = async (req, res) => {
  try {
    const singleClass = await getClassByIdService(req.params.id);

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

/* =========================================
   UPDATE CLASS
========================================= */

export const updateClass = async (req, res) => {
  try {
    const updatedClass = await updateClassService(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      data: updatedClass,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   DELETE CLASS
========================================= */

export const deleteClass = async (req, res) => {
  try {
    await deleteClassService(req.params.id);

    res.status(200).json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};
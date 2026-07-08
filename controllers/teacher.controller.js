import {
  createTeacherService,
  getAllTeacherService,
  getTeacherByIdService,
  updateTeacherStatusService,
} from "../services/teacher.service.js";



export const createTeacher = async (
  req,
  res
) => {

  console.log(
    "CREATE TEACHER BODY:",
    req.body
  );

  try {

    const teacherData =
      await createTeacherService(
        req.body
      );

    res.status(201).json({
      success: true,
      message:
        "Teacher created successfully",
      data: teacherData,
    });

  } catch (error) {

    console.log(
      "CREATE TEACHER ERROR:",
      error.message
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



export const getAllTeachers = async (
  req,
  res
) => {
  try {

    const teachers =
      await getAllTeacherService();

    res.status(200).json({
      success: true,
      data: teachers,
    });

  } catch (error) {

    console.log(
      "GET TEACHERS ERROR:",
      error.message
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



export const getTeacherById = async (
  req,
  res
) => {
  try {

    const teacher =
      await getTeacherByIdService(
        req.params.id
      );

    res.status(200).json({
      success: true,
      data: teacher,
    });

  } catch (error) {

    console.log(
      "GET TEACHER ERROR:",
      error.message
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



export const updateTeacherStatus =
  async (req, res) => {

    console.log(
      "UPDATE STATUS BODY:",
      req.body
    );

    try {

      const teacher =
        await updateTeacherStatusService(
          req.params.id,
          req.body.status
        );

      res.status(200).json({
        success: true,
        message:
          "Teacher status updated successfully",
        data: teacher,
      });

    } catch (error) {

      console.log(
        "UPDATE STATUS ERROR:",
        error.message
      );

      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };
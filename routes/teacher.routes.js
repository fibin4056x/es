import express from "express";

import {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacherStatus,
  updateTeacher,
   deleteTeacher,
} from "../controllers/teacher.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  authorize,
} from "../middleware/role.middleware.js";

import {
  validateCreateTeacher,
} from "../middleware/validateTeacher.middleware.js";



const router = express.Router();



router.post(
  "/",
  authenticate,
  authorize("principal"),
  validateCreateTeacher,
  createTeacher
);



router.get(
  "/",
  authenticate,
  authorize("principal"),
  getAllTeachers
);



router.get(
  "/:id",
  authenticate,
 authorize("principal"),
  getTeacherById
);
  router.patch(
    "/:id",
    authenticate,
    authorize("principal"),
    updateTeacher 
  )




router.patch(
  "/:id/status",
  authenticate,
  authorize("principal"),
  updateTeacherStatus
);


router.delete(
  "/:id",
  authenticate,
  authorize("principal"),
  deleteTeacher
);
 


export default router;
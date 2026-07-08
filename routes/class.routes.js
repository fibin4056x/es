import express from "express";

import {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
} from "../controllers/class.controller.js";


import {
  authenticate,
} from "../middleware/auth.middleware.js"

import {
  authorize,
} from "../middleware/role.middleware.js";



const router = express.Router();



router.post(
  "/",
  authenticate,
  authorize("principal"),
  createClass
);



router.get(
  "/",
  authenticate,
  authorize("principal"),
  getAllClasses
);



router.get(
  "/:id",
  authenticate,
  authorize("principal"),
  getClassById
);



router.patch(
  "/:id",
  authenticate,
  authorize("principal"),
  updateClass
);



router.delete(
  "/:id",
  authenticate,
  authorize("principal"),
  deleteClass
);



export default router;
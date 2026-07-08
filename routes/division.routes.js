import express from "express";

import {
  createDivisionController,
  getAllDivisionsController,
  getDivisionByIdController,
  updateDivisionController,
  deleteDivisionController,
  getMyDivisionsController,
} from "../controllers/division.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  authorize,
} from "../middleware/role.middleware.js";



const router = express.Router();



/* =========================================
   CREATE DIVISION
========================================= */

router.post(
  "/",

  authenticate,

  authorize("principal"),

  createDivisionController
);



/* =========================================
   GET ALL DIVISIONS
========================================= */

router.get(
  "/",

  authenticate,

  authorize("principal"),

  getAllDivisionsController
);


/* =========================================
   TEACHER MY DIVISIONS
========================================= */

router.get(
  "/my/divisions",

  authenticate,

  authorize("teacher"),

  getMyDivisionsController
);



/* =========================================
   GET DIVISION BY ID
========================================= */

router.get(
  "/:id",

  authenticate,

  authorize("principal"),

  getDivisionByIdController
);


/* =========================================
   UPDATE DIVISION
========================================= */

router.patch(
  "/:id",

  authenticate,

  authorize("principal"),

  updateDivisionController
);



/* =========================================
   DELETE DIVISION
========================================= */

router.delete(
  "/:id",

  authenticate,

  authorize("principal"),

  deleteDivisionController
);



export default router;

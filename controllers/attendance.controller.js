import Attendance from "../models/attendence.model.js";

/* =========================================
   MARK ATTENDANCE
========================================= */

export const markAttendance =
  async (req, res) => {

    try {

      const {
        studentId,
        divisionId,
        status,
        remarks,
        date,
      } = req.body;

      /* =====================================
         CHECK EXISTING ATTENDANCE
      ===================================== */

      const existingAttendance =
        await Attendance.findOne({

          studentId,

          divisionId,

          date,
        });

      /* =====================================
         UPDATE EXISTING
      ===================================== */

      if (
        existingAttendance
      ) {

        existingAttendance.status =
          status;

        existingAttendance.remarks =
          remarks || "";

        await existingAttendance.save();

        return res.status(200).json({

          success: true,

          message:
            "Attendance updated successfully",

          data:
            existingAttendance,
        });
      }

      /* =====================================
         CREATE NEW ATTENDANCE
      ===================================== */

      const attendance =
        await Attendance.create({

          studentId,

          divisionId,

          status,

          remarks: remarks || "",

          date,
        });

      res.status(201).json({

        success: true,

        message:
          "Attendance marked successfully",

        data:
          attendance,
      });

    } catch (error) {

      console.log(
        "ATTENDANCE ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to mark attendance",
      });
    }
  };

/* =========================================
   GET DIVISION ATTENDANCE
========================================= */

export const getDivisionAttendance =
  async (req, res) => {

    try {

      const {
        divisionId,
      } = req.params;

      const attendance =
        await Attendance.find({

          divisionId,
        })

          .populate(
            "studentId"
          )

          .sort({
            createdAt: -1,
          });

      res.status(200).json({

        success: true,

        data:
          attendance,
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
          "Failed to fetch attendance",
      });
    }
  };
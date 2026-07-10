import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../models/user.model.js";
import ClassModel from "../models/class.model.js";
import DivisionModel from "../models/division.model.js";
import StudentModel from "../models/student.model.js";
import Attendance from "../models/attendence.model.js";

dotenv.config();

const run = async () => {
  try {
await mongoose.connect(process.env.MONGO_URI, {
  dbName: "slms_db",
});
   console.log("Database:", mongoose.connection.name);
    console.log("DB connected for seeding");

    // Clear existing data
    await User.deleteMany({});
    await ClassModel.deleteMany({});
    await DivisionModel.deleteMany({});
    await StudentModel.deleteMany({});
    await Attendance.deleteMany({});

    console.log("Existing users, classes, divisions, students, and attendance logs cleared.");

    // 1. Create Principal
    const principal = await User.create({
      name: "Principal Admin",
      email: "admin@slms.com",
      password: "123456",
      role: "principal",
      isActive: true,
      status: "active",
    });
    console.log("Seeded Principal Admin");

    // 2. Create Teacher
    const teacher = await User.create({
      name: "Teacher One",
      email: "teacher@slms.com",
      password: "123456",
      role: "teacher",
      isActive: true,
      status: "active",
    });
    console.log("Seeded Teacher One");

    // 3. Create Classes
    const class1 = await ClassModel.create({
      name: "Class 1",
      academicYear: "2025-2026",
      status: "active",
    });

    const class2 = await ClassModel.create({
      name: "Class 2",
      academicYear: "2025-2026",
      status: "active",
    });
    console.log("Seeded Classes: Class 1, Class 2");

    // 4. Create Divisions
    // Class 1 - Div A (Assigned to our teacher)
    const div1A = await DivisionModel.create({
      name: "Div A",
      classId: class1._id,
      assignedTeacher: teacher._id,
      capacity: 35,
      status: "active",
    });

    // Class 1 - Div B (Unassigned)
    const div1B = await DivisionModel.create({
      name: "Div B",
      classId: class1._id,
      assignedTeacher: null,
      capacity: 30,
      status: "active",
    });

    // Class 2 - Div A (Unassigned)
    const div2A = await DivisionModel.create({
      name: "Div A",
      classId: class2._id,
      assignedTeacher: null,
      capacity: 40,
      status: "active",
    });
    console.log("Seeded Divisions: Class 1-A (assigned), Class 1-B, Class 2-A");

    // 5. Seed Students for Class 1 - Div A (Assigned Teacher Classroom)
    const studentsDiv1A = [
      {
        nameEnglish: "Aaron Vance",
        nameArabic: "هارون فانس",
        gender: "male",
        dateOfBirth: new Date("2019-03-12"),
        examRegisterNumber: "EX-2025-001",
        aadhaarNumber: "8899-1122-3344",
        economicCategory: "BPL",
        status: "active",
      },
      {
        nameEnglish: "Bella Thorne",
        nameArabic: "بيلا ثورن",
        gender: "female",
        dateOfBirth: new Date("2019-07-22"),
        examRegisterNumber: "EX-2025-002",
        aadhaarNumber: "7766-5544-3322",
        economicCategory: "APL",
        status: "active",
      },
      {
        nameEnglish: "Charles Prince",
        nameArabic: "تشارلز برينس",
        gender: "male",
        dateOfBirth: new Date("2019-11-05"),
        examRegisterNumber: "EX-2025-003",
        aadhaarNumber: "4433-2211-5566",
        economicCategory: "APL",
        status: "active",
      },
      {
        nameEnglish: "Diana Rose",
        nameArabic: "ديانا روز",
        gender: "female",
        dateOfBirth: new Date("2019-01-30"),
        examRegisterNumber: "EX-2025-004",
        aadhaarNumber: "1122-3344-5566",
        economicCategory: "BPL",
        status: "active",
      },
    ];

    for (const s of studentsDiv1A) {
      await StudentModel.create({
        ...s,
        classId: class1._id,
        divisionId: div1A._id,
        admissionDate: new Date(),
      });
    }

    // Seed Students for Class 1 - Div B
    const studentsDiv1B = [
      {
        nameEnglish: "Ethan Hunt",
        nameArabic: "إيثان هانت",
        gender: "male",
        dateOfBirth: new Date("2019-05-15"),
        examRegisterNumber: "EX-2025-005",
        aadhaarNumber: "9988-7766-5544",
        economicCategory: "APL",
        status: "active",
      },
      {
        nameEnglish: "Fiona Gallagher",
        nameArabic: "فيونا غالاغر",
        gender: "female",
        dateOfBirth: new Date("2019-08-09"),
        examRegisterNumber: "EX-2025-006",
        aadhaarNumber: "5544-3322-1100",
        economicCategory: "BPL",
        status: "active",
      },
    ];

    for (const s of studentsDiv1B) {
      await StudentModel.create({
        ...s,
        classId: class1._id,
        divisionId: div1B._id,
        admissionDate: new Date(),
      });
    }

    console.log("Seeded 6 active Student profiles across Divisions A and B");

    console.log("🎉 Database seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding database failed:", err);
    process.exit(1);
  }
};

run();
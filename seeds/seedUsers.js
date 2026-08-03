import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../models/user.model.js";
import ClassModel from "../models/class.model.js";
import DivisionModel from "../models/division.model.js";
import StudentModel from "../models/student.model.js";
import Attendance from "../models/attendance.model.js";

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

    // 2. Create Teachers
    const teacher1 = await User.create({
      name: "teacher",
      email: "teacher@slms.com",
      password: "123456",
      role: "teacher",
      isActive: true,
      status: "leave",
    });

    const teacher2 = await User.create({
      name: "___fib__in",
      email: "fibinkunnath@gmail.com",
      password: "123456",
      role: "teacher",
      isActive: true,
      status: "active",
    });

    const teacher3 = await User.create({
      name: "MAJID",
      email: "w@gmail.com",
      password: "123456",
      role: "teacher",
      isActive: true,
      status: "active",
    });
    console.log("Seeded 3 Teachers: teacher, ___fib__in, MAJID");

    // 3. Create Classes
    const class1 = await ClassModel.create({
      name: "Class 1",
      academicYear: "2025-2026",
      status: "active",
    });

    const class2 = await ClassModel.create({
      name: "2",
      academicYear: "2024-2025",
      status: "active",
    });
    console.log("Seeded Classes: Class 1, 2");

    // 4. Create Divisions
    // Class 1 - Div A (Assigned to teacher1)
    const div1A = await DivisionModel.create({
      name: "Div A",
      classId: class1._id,
      assignedTeacher: teacher1._id,
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

    // Class 2 - Div A (Assigned to teacher2)
    const div2A = await DivisionModel.create({
      name: "Div A",
      classId: class2._id,
      assignedTeacher: teacher2._id,
      capacity: 40,
      status: "active",
    });

    // Class 2 - Div B (Assigned to teacher2)
    const div2B = await DivisionModel.create({
      name: "Div B",
      classId: class2._id,
      assignedTeacher: teacher2._id,
      capacity: 35,
      status: "active",
    });
    console.log("Seeded Divisions: Class 1-A, Class 1-B, Class 2-A, Class 2-B");

    // 5. Seed Students for Class 1 - Div A (Assigned Teacher Classroom)
    const studentsDiv1A = [
      {
        admissionNumber: "ADM-2025-001",
        nameEnglish: "Aaron Vance",
        nameArabic: "هارون فانس",
        gender: "male",
        dateOfBirth: new Date("2019-03-12"),
        aadhaarNumber: "889911223344",
        economicCategory: "BPL",
        parentName: "John Vance",
        parentPhone: "9876543210",
        guardianRelation: "Father",
        address: "123 Street, City Alpha",
        status: "active",
      },
      {
        admissionNumber: "ADM-2025-002",
        nameEnglish: "Bella Thorne",
        nameArabic: "بيلا ثورن",
        gender: "female",
        dateOfBirth: new Date("2019-07-22"),
        aadhaarNumber: "776655443322",
        economicCategory: "APL",
        parentName: "Mary Thorne",
        parentPhone: "8765432109",
        guardianRelation: "Mother",
        address: "456 Avenue, City Beta",
        status: "active",
      },
      {
        admissionNumber: "ADM-2025-003",
        nameEnglish: "Charles Prince",
        nameArabic: "تشارلز برينس",
        gender: "male",
        dateOfBirth: new Date("2019-11-05"),
        aadhaarNumber: "443322115566",
        economicCategory: "APL",
        parentName: "William Prince",
        parentPhone: "7654321098",
        guardianRelation: "Father",
        address: "789 Boulevard, City Gamma",
        status: "active",
      },
      {
        admissionNumber: "ADM-2025-004",
        nameEnglish: "Diana Rose",
        nameArabic: "ديانا روز",
        gender: "female",
        dateOfBirth: new Date("2019-01-30"),
        aadhaarNumber: "112233445566",
        economicCategory: "BPL",
        parentName: "Helen Rose",
        parentPhone: "6543210987",
        guardianRelation: "Mother",
        address: "101 Road, City Delta",
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
        admissionNumber: "ADM-2025-005",
        nameEnglish: "Ethan Hunt",
        nameArabic: "إيثان هانت",
        gender: "male",
        dateOfBirth: new Date("2019-05-15"),
        aadhaarNumber: "998877665544",
        economicCategory: "APL",
        parentName: "Nathan Hunt",
        parentPhone: "9876543211",
        guardianRelation: "Father",
        address: "102 Court, City Epsilon",
        status: "active",
      },
      {
        admissionNumber: "ADM-2025-006",
        nameEnglish: "Fiona Gallagher",
        nameArabic: "فيونا غالاغر",
        gender: "female",
        dateOfBirth: new Date("2019-08-09"),
        aadhaarNumber: "554433221100",
        economicCategory: "BPL",
        parentName: "Frank Gallagher",
        parentPhone: "8765432112",
        guardianRelation: "Father",
        address: "103 Lane, City Zeta",
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

    // 6. Seed Attendance logs for the past 7 days
    const teacherId = teacher1._id;
    const classIdVal = class1._id;
    const divisionIdVal = div1A._id;
    const studentsListVal = await StudentModel.find({ divisionId: divisionIdVal }).lean();
    
    console.log(`Seeding attendance for ${studentsListVal.length} students...`);
    for (let i = 0; i < 7; i++) {
      const attendanceDate = new Date();
      attendanceDate.setDate(attendanceDate.getDate() - i);
      attendanceDate.setHours(0, 0, 0, 0);
      
      for (const student of studentsListVal) {
        // Randomly set status: present (85% chance), late (10%), absent (5%)
        const rand = Math.random();
        const status = rand < 0.85 ? "present" : rand < 0.95 ? "late" : "absent";
        const reason = status !== "present" ? "Not feeling well" : "";
        
        await Attendance.create({
          date: attendanceDate,
          classId: classIdVal,
          divisionId: divisionIdVal,
          studentId: student._id,
          status,
          reason,
          markedBy: teacherId
        });
      }
    }
    console.log("Seeded 7 days of attendance logs!");

    console.log("🎉 Database seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding database failed:", err);
    process.exit(1);
  }
};

run();
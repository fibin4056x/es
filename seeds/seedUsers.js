import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../models/user.model.js";

dotenv.config();

const run = async () => {
  try {
    // ============================================================
    // DATABASE CONNECTION
    // ============================================================

    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "slms_db",
    });

    console.log("Database:", mongoose.connection.name);
    console.log("Database connected.");

    // ============================================================
    // CLEAR EXISTING USERS
    // ============================================================

    await User.deleteMany({
      role: "principal",
    });

    console.log("Existing principal account cleared.");

    // ============================================================
    // CREATE PRINCIPAL
    // ============================================================

    const principal = await User.create({
      name: "Principal Admin",
      email: "admin@slms.com",
      password: "123456",
      role: "principal",

      isActive: true,
      isDeleted: false,

      status: "active",

      // Principal does NOT require teacher verification.
      emailVerified: true,
      firstLoginCompleted: true,

      profile: {
        gender: null,
        dob: null,
      },

      lastLogin: null,
      passwordChangedAt: null,
    });

    console.log("--------------------------------------------");
    console.log("Principal created successfully.");
    console.log("--------------------------------------------");
    console.log("ID:", principal._id.toString());
    console.log("Name:", principal.name);
    console.log("Email:", principal.email);
    console.log("Role:", principal.role);
    console.log("Status:", principal.status);
    console.log("--------------------------------------------");

    console.log("Production seed completed successfully.");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("--------------------------------------------");
    console.error("Database seeding failed.");
    console.error("--------------------------------------------");
    console.error(error);

    await mongoose.connection.close().catch(() => { });
    process.exit(1);
  }
};

run();
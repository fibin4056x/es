import mongoose from "mongoose";
import { ENV } from "./env.js";

export const connectDB = async () => {
  try {
   await mongoose.connect(ENV.MONGO_URI, {
  dbName: "slms_db",
});

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ DB connection failed:", error.message);
    process.exit(1);
  }
};
import app from "./app.js";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";
import { verifyEmailConnection } from "./services/email.service.js";

const PORT = ENV.PORT;
let server;

const startServer = async () => {
  try {
    // Connect MongoDB
    await connectDB();

    console.log("✅ Database connection ready");

    // Start Express server
    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT} (0.0.0.0)`);
    });

    // Verify Gmail SMTP asynchronously
    verifyEmailConnection()
      .then(() => console.log("📧 Email service ready"))
      .catch((err) => console.error("⚠️ Email service warning:", err.message));
  } catch (error) {
    console.error("❌ Server startup failed:");
    console.error(error.message);

    process.exit(1);
  }
};

const gracefulShutdown = (signal) => {
  console.log(`⚠️ Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log("🛑 HTTP server closed.");
      try {
        await mongoose.connection.close();
        console.log("🛑 Database connection closed.");
        process.exit(0);
      } catch (err) {
        console.error("❌ Error closing database connection:", err.message);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

startServer();
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";
import { verifyEmailConnection } from "./services/email.service.js";

const PORT = ENV.PORT;

const startServer = async () => {
  try {
    // Connect MongoDB
    await connectDB();

    console.log("✅ Database connection ready");

    // Verify Gmail SMTP
    await verifyEmailConnection();

    console.log("📧 Email service ready");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:");
    console.error(error.message);

    process.exit(1);
  }
};

startServer();
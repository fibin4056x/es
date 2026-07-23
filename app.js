import express from "express";
import cors from "cors";

import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { ENV } from "./config/env.js";

const app = express();

/* =========================
   CORS
========================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  
  ENV.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {

      if (!origin) {
        return callback(null, true);
      }

      // Allow frontend origins
      if (
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      // Block unknown origins
      return callback(
        new Error("CORS blocked")
      );
    },

    credentials: true,
  })
);

/* =========================
   BODY PARSER
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.json({
    message: "SLMS API running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
  });
});

/* =========================
   API ROUTES
========================= */

app.use("/api", routes);

/* =========================
   ERROR HANDLER
========================= */

app.use(errorHandler);

export default app;
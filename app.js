import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";

import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { ENV } from "./config/env.js";

const app = express();

/* ============================================================
   TRUST PROXY
============================================================ */

if (ENV.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

/* ============================================================
   SECURITY
============================================================ */

app.use(helmet());
app.use(cookieParser());
app.use(mongoSanitize());

/* ============================================================
   CORS
============================================================ */

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ENV.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as server-to-server/health-check requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked"));
    },

    credentials: true,
  })
);

/* ============================================================
   BODY PARSERS
============================================================ */

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

/* ============================================================
   HEALTH CHECK
============================================================ */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SLMS API running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    time: new Date().toISOString(),
  });
});

/* ============================================================
   API ROUTES
============================================================ */

app.use("/api", routes);

/* ============================================================
   ERROR HANDLER
============================================================ */

app.use(errorHandler);

export default app;
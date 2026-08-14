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

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(cookieParser());

/* ============================================================
   CORS
============================================================ */

const rawOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://es1-beta.vercel.app",
  ENV.CLIENT_ORIGIN,
].filter(Boolean);

const allowedOrigins = rawOrigins
  .flatMap((origin) => String(origin).split(","))
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server / health-check requests
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
  })
);

/* ============================================================
   BODY PARSERS
============================================================ */

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

/* ============================================================
   MONGO SANITIZATION
============================================================ */

app.use((req, res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body);
  }

  if (req.params) {
    mongoSanitize.sanitize(req.params);
  }

  if (req.query) {
    mongoSanitize.sanitize(req.query);
  }

  next();
});

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
   404 HANDLER
============================================================ */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */

app.use(errorHandler);

export default app;
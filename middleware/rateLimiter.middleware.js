import ApiError from "../utils/ApiError.js";

/* ==================================================
   IN-MEMORY RATE LIMITER
================================================== */

const memoryStore = new Map();

// Periodic cleanup of expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = "Too many requests. Please try again later.",
} = {}) => {
  return (req, res, next) => {
    const effectiveMax = process.env.NODE_ENV === "production" ? max : Math.max(max, 100);
    const ip = req.ip || req.headers["x-forwarded-for"] || "global";
    const key = `${req.baseUrl}${req.path}_${ip}`;
    const now = Date.now();

    let record = memoryStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      memoryStore.set(key, record);
      return next();
    }

    record.count += 1;

    if (record.count > effectiveMax) {
      const waitMinutes = Math.ceil((record.resetTime - now) / (60 * 1000));
      return next(
        new ApiError(
          429,
          `${message} Please try again in ${waitMinutes} minute(s).`
        )
      );
    }

    next();
  };
};

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts
  message: "Too many authentication attempts.",
});

export const otpRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Max 5 OTP requests/verifications
  message: "Too many verification code requests.",
});

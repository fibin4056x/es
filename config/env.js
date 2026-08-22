import dotenv from "dotenv";

dotenv.config();

// ============================================================
// ENVIRONMENT HELPERS
// ============================================================

const getEnv = (name) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value;
};

const getOptionalEnv = (
  name,
  fallback = undefined
) => {
  const value = process.env[name]?.trim();

  return value || fallback;
};

const getNumberEnv = (
  name,
  fallback
) => {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `${name} must be a valid number.`
    );
  }

  return parsed;
};

// ============================================================
// NODE ENVIRONMENT
// ============================================================

const NODE_ENV = getOptionalEnv(
  "NODE_ENV",
  "development"
);

const VALID_ENVIRONMENTS = Object.freeze([
  "development",
  "test",
  "production",
]);

if (!VALID_ENVIRONMENTS.includes(NODE_ENV)) {
  throw new Error(
    `Invalid NODE_ENV: ${NODE_ENV}. ` +
      "Use development, test, or production."
  );
}

const IS_PRODUCTION =
  NODE_ENV === "production";

const IS_DEVELOPMENT =
  NODE_ENV === "development";

const IS_TEST =
  NODE_ENV === "test";

// ============================================================
// SERVER
// ============================================================

const PORT = getNumberEnv(
  "PORT",
  5000
);

if (PORT < 1 || PORT > 65535) {
  throw new Error(
    "PORT must be between 1 and 65535."
  );
}

// ============================================================
// DATABASE
// ============================================================

const MONGO_URI = getEnv(
  "MONGO_URI"
);

// ============================================================
// JWT SECRETS
// ============================================================
//
// ACCESS  → short-lived API authentication
// REFRESH → long-lived session renewal
// SETUP   → teacher first-login setup
// RESET   → password reset
//
// Never use the same secret for all four token types.
// ============================================================

const JWT_ACCESS_SECRET = getEnv(
  "JWT_ACCESS_SECRET"
);

const JWT_REFRESH_SECRET = getEnv(
  "JWT_REFRESH_SECRET"
);

const JWT_SETUP_SECRET = getEnv(
  "JWT_SETUP_SECRET"
);

const JWT_RESET_SECRET = getEnv(
  "JWT_RESET_SECRET"
);

// ============================================================
// JWT SECRET VALIDATION
// ============================================================

const JWT_SECRETS = Object.freeze([
  {
    name: "JWT_ACCESS_SECRET",
    value: JWT_ACCESS_SECRET,
  },
  {
    name: "JWT_REFRESH_SECRET",
    value: JWT_REFRESH_SECRET,
  },
  {
    name: "JWT_SETUP_SECRET",
    value: JWT_SETUP_SECRET,
  },
  {
    name: "JWT_RESET_SECRET",
    value: JWT_RESET_SECRET,
  },
]);

for (const secret of JWT_SECRETS) {
  if (secret.value.length < 32) {
    throw new Error(
      `${secret.name} must be at least 32 characters long.`
    );
  }
}

// ============================================================
// JWT EXPIRATION VALIDATION
// ============================================================

const validateExpiration = (
  name,
  value
) => {
  const normalized =
    String(value).trim();

  if (
    !/^\d+\s*(s|m|h|d)$/.test(
      normalized
    )
  ) {
    throw new Error(
      `${name} has an invalid expiration format. ` +
        "Examples: 30s, 15m, 1h, 7d."
    );
  }

  return normalized;
};

// ============================================================
// JWT EXPIRATION
// ============================================================

const JWT_ACCESS_EXPIRES_IN =
  validateExpiration(
    "JWT_ACCESS_EXPIRES_IN",
    getOptionalEnv(
      "JWT_ACCESS_EXPIRES_IN",
      "15m"
    )
  );

const JWT_REFRESH_EXPIRES_IN =
  validateExpiration(
    "JWT_REFRESH_EXPIRES_IN",
    getOptionalEnv(
      "JWT_REFRESH_EXPIRES_IN",
      "7d"
    )
  );

const JWT_SETUP_EXPIRES_IN =
  validateExpiration(
    "JWT_SETUP_EXPIRES_IN",
    getOptionalEnv(
      "JWT_SETUP_EXPIRES_IN",
      "15m"
    )
  );

const JWT_RESET_EXPIRES_IN =
  validateExpiration(
    "JWT_RESET_EXPIRES_IN",
    getOptionalEnv(
      "JWT_RESET_EXPIRES_IN",
      "15m"
    )
  );

// ============================================================
// JWT ISSUER / AUDIENCE
// ============================================================

const JWT_ISSUER =
  getOptionalEnv(
    "JWT_ISSUER",
    "slms-api"
  );

const JWT_AUDIENCE =
  getOptionalEnv(
    "JWT_AUDIENCE",
    "slms-client"
  );

// ============================================================
// CLIENT / CORS
// ============================================================

const CLIENT_ORIGIN =
  getEnv("CLIENT_ORIGIN");

if (IS_PRODUCTION) {
  if (
    !CLIENT_ORIGIN.startsWith(
      "https://"
    )
  ) {
    throw new Error(
      "CLIENT_ORIGIN must use HTTPS in production."
    );
  }
}

// ============================================================
// EMAIL / RESEND
// ============================================================

const RESEND_API_KEY =
  getEnv("RESEND_API_KEY");

const EMAIL_FROM =
  getEnv("EMAIL_FROM");

// ============================================================
// OTP SECURITY
// ============================================================

const OTP_SECRET =
  getEnv("OTP_SECRET");

if (OTP_SECRET.length < 32) {
  throw new Error(
    "OTP_SECRET must be at least 32 characters long."
  );
}

// ============================================================
// CLOUDINARY
// ============================================================

const CLOUDINARY_CLOUD_NAME =
  getOptionalEnv(
    "CLOUDINARY_CLOUD_NAME"
  );

const CLOUDINARY_API_KEY =
  getOptionalEnv(
    "CLOUDINARY_API_KEY"
  );

const CLOUDINARY_API_SECRET =
  getOptionalEnv(
    "CLOUDINARY_API_SECRET"
  );

const cloudinaryConfig = [
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
];

const hasSomeCloudinaryConfig =
  cloudinaryConfig.some(Boolean);

const hasAllCloudinaryConfig =
  cloudinaryConfig.every(Boolean);

if (
  hasSomeCloudinaryConfig &&
  !hasAllCloudinaryConfig
) {
  throw new Error(
    "Cloudinary configuration is incomplete. " +
      "Provide CLOUDINARY_CLOUD_NAME, " +
      "CLOUDINARY_API_KEY and " +
      "CLOUDINARY_API_SECRET."
  );
}

// ============================================================
// COOKIE CONFIGURATION
// ============================================================

const COOKIE_DOMAIN =
  getOptionalEnv(
    "COOKIE_DOMAIN"
  );

const IS_CROSS_ORIGIN_HTTPS =
  IS_PRODUCTION ||
  (typeof CLIENT_ORIGIN === "string" && CLIENT_ORIGIN.startsWith("https://")) ||
  Boolean(process.env.RENDER || process.env.VERCEL);

const COOKIE_SAME_SITE =
  getOptionalEnv(
    "COOKIE_SAME_SITE",
    IS_CROSS_ORIGIN_HTTPS
      ? "none"
      : "lax"
  ).toLowerCase();

const VALID_SAME_SITE =
  Object.freeze([
    "strict",
    "lax",
    "none",
  ]);

if (
  !VALID_SAME_SITE.includes(
    COOKIE_SAME_SITE
  )
) {
  throw new Error(
    "COOKIE_SAME_SITE must be strict, lax, or none."
  );
}

if (
  IS_CROSS_ORIGIN_HTTPS &&
  COOKIE_SAME_SITE === "none" &&
  !CLIENT_ORIGIN.startsWith(
    "https://"
  )
) {
  throw new Error(
    "COOKIE_SAME_SITE=none requires HTTPS."
  );
}

// ============================================================
// COOKIE SECURITY
// ============================================================

const COOKIE_SECURE =
  getOptionalEnv(
    "COOKIE_SECURE",
    IS_CROSS_ORIGIN_HTTPS
      ? "true"
      : "false"
  ) === "true";

const COOKIE_HTTP_ONLY =
  getOptionalEnv(
    "COOKIE_HTTP_ONLY",
    "true"
  ) === "true";

if (
  IS_CROSS_ORIGIN_HTTPS &&
  !COOKIE_SECURE
) {
  throw new Error(
    "COOKIE_SECURE must be true in production."
  );
}

if (!COOKIE_HTTP_ONLY) {
  throw new Error(
    "COOKIE_HTTP_ONLY must remain true."
  );
}

// ============================================================
// COOKIE MAX AGE
// ============================================================

const REFRESH_COOKIE_MAX_AGE =
  7 * 24 * 60 * 60 * 1000;

const ACCESS_COOKIE_MAX_AGE =
  15 * 60 * 1000;

// ============================================================
// PROXY
// ============================================================

const TRUST_PROXY =
  getOptionalEnv(
    "TRUST_PROXY",
    IS_CROSS_ORIGIN_HTTPS
      ? "true"
      : "false"
  ) === "true";

// ============================================================
// PASSWORD HASHING
// ============================================================

const BCRYPT_SALT_ROUNDS =
  getNumberEnv(
    "BCRYPT_SALT_ROUNDS",
    12
  );

if (
  BCRYPT_SALT_ROUNDS < 10 ||
  BCRYPT_SALT_ROUNDS > 14
) {
  throw new Error(
    "BCRYPT_SALT_ROUNDS must be between 10 and 14."
  );
}

// ============================================================
// FINAL CONFIGURATION
// ============================================================

export const ENV = Object.freeze({
  // ----------------------------------------------------------
  // SERVER
  // ----------------------------------------------------------

  NODE_ENV,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  IS_TEST,

  PORT,
  TRUST_PROXY,

  // ----------------------------------------------------------
  // DATABASE
  // ----------------------------------------------------------

  MONGO_URI,

  // ----------------------------------------------------------
  // JWT
  // ----------------------------------------------------------

  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_SETUP_SECRET,
  JWT_RESET_SECRET,

  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  JWT_SETUP_EXPIRES_IN,
  JWT_RESET_EXPIRES_IN,

  JWT_ISSUER,
  JWT_AUDIENCE,

  // ----------------------------------------------------------
  // CLIENT
  // ----------------------------------------------------------

  CLIENT_ORIGIN,

  // ----------------------------------------------------------
  // EMAIL / RESEND
  // ----------------------------------------------------------

  RESEND_API_KEY,
  EMAIL_FROM,

  // ----------------------------------------------------------
  // OTP
  // ----------------------------------------------------------

  OTP_SECRET,

  // ----------------------------------------------------------
  // CLOUDINARY
  // ----------------------------------------------------------

  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,

  // ----------------------------------------------------------
  // COOKIES
  // ----------------------------------------------------------

  COOKIE_DOMAIN,
  COOKIE_SAME_SITE,
  COOKIE_SECURE,
  COOKIE_HTTP_ONLY,
  REFRESH_COOKIE_MAX_AGE,
  ACCESS_COOKIE_MAX_AGE,

  // ----------------------------------------------------------
  // SECURITY
  // ----------------------------------------------------------

  BCRYPT_SALT_ROUNDS,
});
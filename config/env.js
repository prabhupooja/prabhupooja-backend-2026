const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Determine active environment (default: development)
const nodeEnv = process.env.NODE_ENV || "development";
const rootDir = path.resolve(__dirname, "..");

// Environment files priority order (highest to lowest):
// 1. .env.local (personal local overrides)
// 2. .env.[NODE_ENV] (e.g. .env.development or .env.production)
// 3. .env (standard environment file)
const envFiles = [
  path.join(rootDir, ".env.local"),
  path.join(rootDir, `.env.${nodeEnv}`),
  path.join(rootDir, ".env"),
];

let loadedAny = false;
envFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file, override: false });
    loadedAny = true;
  }
});

// Final fallback if no file matched, try default dotenv
if (!loadedAny) {
  dotenv.config();
}

// Config object with safe fallbacks for both local and production
const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 3002,
  HOST: process.env.HOST || "0.0.0.0",

  // URLs
  BACKEND_URL: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3002}`,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : "*",

  // Database (Supports both DbX and DB_X naming conventions)
  DB: {
    host: process.env.DbHost || process.env.DB_HOST || "localhost",
    user: process.env.DbUser || process.env.DB_USER || "root",
    password: process.env.DbPassword !== undefined ? process.env.DbPassword : (process.env.DB_PASSWORD || ""),
    database: process.env.DbName || process.env.DB_NAME || "prabhupooja",
    port: parseInt(process.env.DbPort || process.env.DB_PORT, 10) || 3306,
  },

  // JWT & Security
  JWT_SECRET: process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || "PrabhuPooja@123",
  SESSION_SECRET: process.env.SESSION_SECRET || "PrabhuPoojaSessionSecret",

  // Google OAuth
  GOOGLE: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3002}`}/auth/google/callback`,
    mobileClientId: process.env.GOOGLE_MOBILE_CLIENT_ID || "",
  },

  // AWS S3
  AWS: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.AWS_REGION || "ap-south-1",
    bucketName: process.env.S3_BUCKET_NAME || "prabhupooja1",
  },

  // Redis
  REDIS: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

// Friendly diagnostic log on boot (sanitized, no secrets exposed)
console.log(`\n======================================================`);
console.log(`🚀 [ENV] Environment: ${config.NODE_ENV.toUpperCase()}`);
console.log(`🌐 [ENV] Backend URL: ${config.BACKEND_URL}`);
console.log(`🖥️  [ENV] Frontend URL: ${config.FRONTEND_URL}`);
console.log(`🗄️  [ENV] Database: ${config.DB.user}@${config.DB.host}:${config.DB.port}/${config.DB.database}`);
console.log(`======================================================\n`);

module.exports = config;

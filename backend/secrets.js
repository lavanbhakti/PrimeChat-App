/**
 * PrimeChat Configuration Module
 * 
 * Centralizes all environment variable access into a single exported
 * configuration object. Each service (MongoDB, JWT, AWS S3, Gemini AI,
 * Email) has its own set of credentials loaded from .env.
 * 
 * @module AppConfig
 */

const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

/** MongoDB connection URI */
const MONGO_URI = process.env.MONGO_URI;

/** Secret key used for signing JWT authentication tokens */
const JWT_SECRET = process.env.JWT_SECRET;

/** Google Gemini AI credentials for the chatbot feature */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/** SMTP credentials for sending OTP verification emails */
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

/** AWS S3 credentials for file/image upload storage */
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET = process.env.AWS_SECRET;

module.exports = {
  MONGO_URI,
  JWT_SECRET,
  AWS_ACCESS_KEY,
  AWS_SECRET,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  EMAIL,
  PASSWORD,
  AWS_BUCKET_NAME,
};

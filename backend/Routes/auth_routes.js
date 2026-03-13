/**
 * PrimeChat Authentication Routes
 * 
 * Defines HTTP endpoints for user registration, login,
 * session validation, and OTP-based email verification.
 * 
 * @module AuthRoutes
 */

const express = require("express");
const router = express.Router();

const {
  handleUserRegistration,
  handleUserLogin,
  validateSession,
  dispatchLoginOtp,
  dispatchSignupOtp,
  confirmSignupOtp,
} = require("../Controllers/auth_controller.js");

// POST /auth/register — Create a new user account
router.post("/register", handleUserRegistration);

// POST /auth/login — Authenticate with email+password or email+OTP
router.post("/login", handleUserLogin);

// GET /auth/me — Validate current session and return user profile
router.get("/me", validateSession);

// POST /auth/getotp — Send login OTP to user's email
router.post("/getotp", dispatchLoginOtp);

// POST /auth/signup-otp — Send signup verification OTP
router.post("/signup-otp", dispatchSignupOtp);

// POST /auth/verify-signup-otp — Verify signup OTP without consuming it
router.post("/verify-signup-otp", confirmSignupOtp);

module.exports = router;

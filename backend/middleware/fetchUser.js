/**
 * PrimeChat Authentication Middleware
 * 
 * Validates the JWT token from the 'auth-token' header on protected routes.
 * On success, attaches the decoded user payload to req.user and calls next().
 * On failure, returns 401 Unauthorized.
 * 
 * @module AuthMiddleware
 */

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../secrets.js");

/**
 * Express middleware that authenticates incoming requests by verifying
 * the JWT token provided in the 'auth-token' request header.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware
 */
const authenticateRequest = (req, res, next) => {
  const authToken = req.header("auth-token");

  if (!authToken) {
    console.log("Authentication failed: no token provided");
    return res
      .status(401)
      .json({ error: "Access denied. Please provide a valid auth token." });
  }

  try {
    const decodedPayload = jwt.verify(authToken, JWT_SECRET);
    req.user = decodedPayload.user;
    next();
  } catch (verificationError) {
    console.error("Token verification failed:", verificationError.message);
    return res
      .status(401)
      .json({ error: "Invalid or expired token. Please re-authenticate." });
  }
};

module.exports = authenticateRequest;

/**
 * PrimeChat Server - Main Entry Point
 * 
 * Bootstraps the Express application with CORS, body parsing,
 * route mounting, HTTP server creation, and WebSocket initialization.
 * 
 * @module PrimeChatServer
 * @author Lavan Bhakti
 */

const express = require("express");
const initializeDatabase = require("./db.js");
const cors = require("cors");
const http = require("http");
const dotenv = require("dotenv");

dotenv.config();

const SERVER_PORT = process.env.PORT || 5500;
const { bootstrapWebSocket } = require("./socket/index.js");

const app = express();

/**
 * Builds CORS configuration based on environment settings.
 * Supports wildcard or comma-separated origin list for deployment flexibility.
 */
function buildCorsConfig() {
  const allowedOrigins = process.env.CORS_ORIGIN || "*";
  if (allowedOrigins === "*") {
    return cors();
  }
  return cors({
    origin: allowedOrigins.split(",").map((origin) => origin.trim()),
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  });
}

// Apply middleware stack
app.use(buildCorsConfig());
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

// Health check endpoint for monitoring and deployment verification
app.get("/", (_req, res) => {
  res.send("PrimeChat API is running");
});

// Mount feature-specific route modules
app.use("/auth", require("./Routes/auth_routes.js"));
app.use("/user", require("./Routes/userRoutes.js"));
app.use("/message", require("./Routes/message_routes.js"));
app.use("/conversation", require("./Routes/conversation_routes.js"));
app.use("/codepad", require("./Routes/codepad_routes.js"));

/**
 * Creates the HTTP server and starts listening.
 * Database connection is established after the server is ready.
 */
const httpServer = http.createServer(app);

// Attach Socket.IO to the HTTP server for real-time communication
bootstrapWebSocket(httpServer);

httpServer.listen(SERVER_PORT, "0.0.0.0", () => {
  console.log(`🚀 PrimeChat server started on port ${SERVER_PORT}`);
  initializeDatabase();
});

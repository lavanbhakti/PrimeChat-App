/**
 * PrimeChat WebSocket Initialization
 * 
 * Creates and configures the Socket.IO server instance,
 * attaching it to the HTTP server with appropriate CORS settings.
 * Delegates connection handling to the event handler module.
 * 
 * @module WebSocketInit
 */

const { Server } = require("socket.io");
const registerSocketHandlers = require("./handlers");

let socketServer;

/**
 * Initializes the Socket.IO server on the given HTTP server.
 * Configures CORS based on environment variables and registers
 * event handlers for each new client connection.
 * 
 * @param {import('http').Server} httpServer - The HTTP server to attach to
 * @returns {Server} The configured Socket.IO server instance
 */
const bootstrapWebSocket = (httpServer) => {
  const allowedOrigins = process.env.CORS_ORIGIN || "*";

  const corsSettings =
    allowedOrigins === "*"
      ? { origin: "*", methods: ["GET", "POST"] }
      : {
          origin: allowedOrigins.split(",").map((o) => o.trim()),
          methods: ["GET", "POST"],
          credentials: true,
        };

  socketServer = new Server(httpServer, { cors: corsSettings });
  console.log("🔌 PrimeChat WebSocket server initialized");

  socketServer.on("connection", (clientSocket) => {
    console.log(`New WebSocket connection: ${clientSocket.id}`);
    registerSocketHandlers(socketServer, clientSocket);
  });

  return socketServer;
};

module.exports = { bootstrapWebSocket };

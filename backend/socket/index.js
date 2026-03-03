const { Server } = require("socket.io");
const registerHandlers = require("./handlers");

let io;

const initSocket = (server) => {
  const corsOrigin = process.env.CORS_ORIGIN || "*";
  const corsConfig = corsOrigin === "*"
    ? { origin: "*", methods: ["GET", "POST"] }
    : { origin: corsOrigin.split(",").map(o => o.trim()), methods: ["GET", "POST"], credentials: true };
  io = new Server(server, {
    cors: corsConfig,
  });
  console.log("Socket.io initialized");

  io.on("connection", (socket) => {
    console.log(`New connection: ${socket.id}`);
    registerHandlers(io, socket);
  });

  return io;
};

module.exports = { initSocket };

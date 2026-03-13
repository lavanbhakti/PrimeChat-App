/**
 * PrimeChat Conversation Routes
 * 
 * Defines HTTP endpoints for conversation lifecycle management:
 * creating threads, listing conversations, fetching details,
 * deleting conversations, and leaving groups.
 * 
 * @module ConversationRoutes
 */

const express = require("express");
const router = express.Router();

const {
  initiateConversation,
  fetchConversationById,
  retrieveUserConversations,
  removeConversation,
  exitGroupConversation,
} = require("../Controllers/conversation_controller.js");

const authenticateRequest = require("../middleware/fetchUser.js");

// POST /conversation/ — Create a new 1-to-1 or group conversation
router.post("/", authenticateRequest, initiateConversation);

// GET /conversation/:id — Fetch a specific conversation by ID
router.get("/:id", authenticateRequest, fetchConversationById);

// GET /conversation/ — List all conversations for the authenticated user
router.get("/", authenticateRequest, retrieveUserConversations);

// DELETE /conversation/:id — Delete a conversation
router.delete("/:id", authenticateRequest, removeConversation);

// POST /conversation/:id/leave — Leave a group conversation
router.post("/:id/leave", authenticateRequest, exitGroupConversation);

module.exports = router;

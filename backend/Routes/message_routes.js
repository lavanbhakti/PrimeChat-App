/**
 * PrimeChat Message Routes
 * 
 * Defines HTTP endpoints for message operations:
 * fetching conversation messages, generating S3 upload URLs,
 * and soft-deleting messages.
 * 
 * @module MessageRoutes
 */

const express = require("express");
const router = express.Router();

const {
  fetchConversationMessages,
  markMessageAsDeleted,
  generateFileUploadUrl,
} = require("../Controllers/message_controller.js");

const authenticateRequest = require("../middleware/fetchUser.js");

// GET /message/presigned-url — Generate S3 presigned URL for file upload
router.get("/presigned-url", authenticateRequest, generateFileUploadUrl);

// GET /message/:id/:userid — Fetch all messages in a conversation
router.get("/:id/:userid", authenticateRequest, fetchConversationMessages);

// POST /message/delete — Soft-delete a message for specified users
router.post("/delete", authenticateRequest, markMessageAsDeleted);

module.exports = router;

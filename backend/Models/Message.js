/**
 * PrimeChat Message Schema
 * 
 * Stores individual chat messages within a conversation thread.
 * Supports text-only, image-only, or combined text+image messages.
 * Tracks read receipts, soft-deletion, reactions, and reply chains.
 * 
 * @module MessageModel
 */

const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    /** Reference to the parent conversation this message belongs to */
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    /** Reference to the user who authored this message */
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /** Text content of the message (required if no image is attached) */
    text: {
      type: String,
      required: function () {
        return !this.imageUrl;
      },
    },

    /** URL to an attached image stored in S3 (required if no text content) */
    imageUrl: {
      type: String,
      required: function () {
        return !this.text;
      },
    },

    /** Emoji reaction applied to this message */
    reaction: {
      type: String,
      default: "",
    },

    /** Read receipt tracking - records which users have seen this message */
    seenBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        seenAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /** Soft-deletion: list of users who have removed this message from their view */
    deletedFrom: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    /** Reference to the original message if this is a reply */
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "Message",
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", chatMessageSchema);
module.exports = Message;

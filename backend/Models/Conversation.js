/**
 * PrimeChat Conversation (Chat Thread) Schema
 * 
 * Represents both 1-to-1 direct messages and group conversations.
 * Tracks members, the latest message preview, group metadata,
 * and per-user unread message counts.
 * 
 * @module ConversationModel
 */

const mongoose = require("mongoose");

const chatThreadSchema = new mongoose.Schema(
  {
    /** Array of user references participating in this conversation */
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    /** Preview text of the most recent message for chat list display */
    latestmessage: {
      type: String,
      default: "",
    },

    /** Distinguishes group conversations from direct 1-to-1 chats */
    isGroup: {
      type: Boolean,
      default: false,
    },

    /** Group display name (required only for group conversations) */
    name: {
      type: String,
      required: function () {
        return this.isGroup;
      },
    },

    /** Group avatar image URL (auto-generated from group name if not set) */
    profilePic: {
      type: String,
      default: function () {
        if (this.isGroup && this.name) {
          return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=random&bold=true&size=200`;
        }
        return null;
      },
    },

    /** Per-member unread message counters for badge display */
    unreadCounts: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        count: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Conversation = mongoose.model("Conversation", chatThreadSchema);
module.exports = Conversation;

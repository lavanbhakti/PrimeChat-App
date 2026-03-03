const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    latestmessage: {
      type: String,
      default: "",
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      required: function () {
        return this.isGroup;
      },
    },
    profilePic: {
      type: String,
      default: function() {
        // Generate a default group image with the group name
        if (this.isGroup && this.name) {
          return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=random&bold=true&size=200`;
        }
        return null;
      }
    },
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

const Conversation = mongoose.model("Conversation", ConversationSchema);
module.exports = Conversation;

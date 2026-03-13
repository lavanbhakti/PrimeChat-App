/**
 * PrimeChat WebSocket Event Handlers
 * 
 * Registers all real-time communication event handlers for each
 * connected client. Manages user presence, chat room membership,
 * message dispatch (direct + group + AI bot), typing indicators,
 * message deletion, and group lifecycle events.
 * 
 * @module SocketHandlers
 */

const Conversation = require("../Models/Conversation.js");
const User = require("../Models/User.js");
const {
  generateAiChatReply,
  processDirectMessage,
  processGroupMessage,
  handleMessageRemoval,
} = require("../Controllers/message_controller.js");

/**
 * Identifies which conversation members are currently connected
 * to a specific chat room by cross-referencing personal and room sockets.
 * 
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * @param {Array} membersList - Populated members array from conversation
 * @param {string} roomId - The conversation/room ID to check
 * @returns {string[]} Array of member IDs currently in the room
 */
function getActiveRoomMembers(io, membersList, roomId) {
  const activeMemberIds = [];
  const chatRoom = io.sockets.adapter.rooms.get(roomId);

  for (const member of membersList) {
    const personalRoom = io.sockets.adapter.rooms.get(member._id.toString());
    if (personalRoom && chatRoom) {
      const memberSocketId = Array.from(personalRoom)[0];
      if (chatRoom.has(memberSocketId)) {
        activeMemberIds.push(member._id.toString());
      }
    }
  }

  return activeMemberIds;
}

/**
 * Checks if a specific user is currently viewing a chat room.
 * 
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * @param {string} userId - The user ID to check
 * @param {string} roomId - The conversation room ID
 * @returns {boolean} True if the user is in the room
 */
function isUserInChatRoom(io, userId, roomId) {
  const personalRoom = io.sockets.adapter.rooms.get(userId.toString());
  if (!personalRoom) return false;

  const userSocketId = Array.from(personalRoom)[0];
  const chatRoom = io.sockets.adapter.rooms.get(roomId);
  return chatRoom ? chatRoom.has(userSocketId) : false;
}

/**
 * Registers all WebSocket event handlers for a connected client.
 * 
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * @param {import('socket.io').Socket} clientSocket - The connected client socket
 */
module.exports = (io, clientSocket) => {
  let connectedUserId = null;

  // ──────────── User Setup & Presence ────────────

  /**
   * Handles initial user setup — joins personal room,
   * sets online status, and notifies active conversations.
   */
  clientSocket.on("setup", async (userId) => {
    connectedUserId = userId;
    clientSocket.join(userId);
    console.log("User connected to personal room:", userId);
    clientSocket.emit("user setup", userId);

    // Mark user as online in the database
    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Notify all active conversation rooms that this user is online
    const userConversations = await Conversation.find({
      members: { $in: [userId] },
    });

    userConversations.forEach((conversation) => {
      const roomSockets = io.sockets.adapter.rooms.get(conversation.id);
      if (roomSockets) {
        io.to(conversation.id).emit("receiver-online", {});
      }
    });
  });

  // ──────────── Chat Room Management ────────────

  /**
   * Handles joining a chat room — resets unread counter
   * and notifies other room members.
   */
  clientSocket.on("join-chat", async (data) => {
    const { roomId, userId } = data;
    console.log("User joining chat room:", roomId);

    try {
      const conversationThread = await Conversation.findById(roomId);

      if (!conversationThread) {
        console.log("Chat room not found:", roomId);
        clientSocket.emit("conversation-not-found", { roomId });
        return;
      }

      clientSocket.join(roomId);

      // Reset this user's unread counter for this conversation
      if (conversationThread.unreadCounts && Array.isArray(conversationThread.unreadCounts)) {
        conversationThread.unreadCounts = conversationThread.unreadCounts.map((counter) => {
          if (counter.userId == userId) {
            counter.count = 0;
          }
          return counter;
        });
        await conversationThread.save({ timestamps: false });
      }

      io.to(roomId).emit("user-joined-room", userId);
    } catch (joinError) {
      console.error("Error joining chat room:", joinError);
      clientSocket.emit("join-chat-error", { roomId, error: joinError.message });
    }
  });

  /** Handles leaving a chat room */
  clientSocket.on("leave-chat", (roomId) => {
    clientSocket.leave(roomId);
  });

  // ──────────── Message Dispatch ────────────

  /**
   * Processes outgoing messages — routes to AI bot handler,
   * group message handler, or direct message handler based on context.
   */
  const onMessageDispatch = async (messagePayload) => {
    console.log("Processing outgoing message");

    const { conversationId, senderId, text, imageUrl } = messagePayload;
    let isAiBotConversation = false;

    try {
      const conversationThread = await Conversation.findById(conversationId).populate("members");

      if (!conversationThread) {
        console.log("Conversation not found:", conversationId);
        clientSocket.emit("conversation-not-found", { conversationId });
        return;
      }

      // ── AI Chatbot Detection & Handling ──
      conversationThread.members.forEach(async (member) => {
        if (member._id != senderId && member.email.endsWith("bot")) {
          isAiBotConversation = true;

          // Show typing indicator while AI generates response
          io.to(conversationId).emit("typing", { typer: member._id.toString() });

          // Immediately echo the user's message to the chat UI
          const userMessagePreview = {
            id_: Date.now().toString(),
            conversationId,
            senderId,
            text,
            seenBy: [{ user: member._id.toString(), seenAt: new Date() }],
            imageUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          io.to(conversationId).emit("receive-message", userMessagePreview);

          // Generate and send AI response
          const aiReply = await generateAiChatReply(text, senderId, conversationId);

          if (aiReply === -1) return;

          io.to(conversationId).emit("receive-message", aiReply);
          io.to(conversationId).emit("stop-typing", { typer: member._id.toString() });
        }
      });

      if (isAiBotConversation) return;

      // ── Group Message Handling ──
      if (conversationThread.isGroup) {
        const membersInRoom = getActiveRoomMembers(io, conversationThread.members, conversationId);

        const savedGroupMessage = await processGroupMessage({
          text,
          imageUrl,
          senderId,
          conversationId,
          membersInRoom,
        });

        io.to(conversationId).emit("receive-message", savedGroupMessage);

        // Send notification to members NOT currently in the room
        for (const member of conversationThread.members) {
          const memberId = member._id.toString();
          if (memberId !== senderId && !membersInRoom.includes(memberId)) {
            io.to(memberId).emit("new-message-notification", savedGroupMessage);
          }
        }
        return;
      }

      // ── Direct (1-to-1) Message Handling ──
      const recipientMember = conversationThread.members.find(
        (member) => member._id != senderId
      );

      if (!recipientMember) {
        console.log("Recipient not found in conversation");
        return;
      }

      const recipientId = recipientMember._id;
      const isRecipientViewing = isUserInChatRoom(io, recipientId, conversationId);

      const savedDirectMessage = await processDirectMessage({
        text,
        imageUrl,
        senderId,
        conversationId,
        receiverId: recipientId,
        isReceiverInsideChatRoom: isRecipientViewing,
      });

      io.to(conversationId).emit("receive-message", savedDirectMessage);

      // Send notification if recipient is not viewing this conversation
      if (!isRecipientViewing) {
        console.log("Sending notification to:", recipientId.toString());
        io.to(recipientId.toString()).emit("new-message-notification", savedDirectMessage);
      }
    } catch (dispatchError) {
      console.error("Message dispatch error:", dispatchError);
      clientSocket.emit("send-message-error", { error: dispatchError.message });
    }
  };

  clientSocket.on("send-message", onMessageDispatch);

  // ──────────── Message Deletion ────────────

  const onMessageRemoval = async (deletionPayload) => {
    try {
      const { messageId, deleteFrom, conversationId } = deletionPayload;
      const wasDeleted = await handleMessageRemoval({ messageId, deleteFrom });

      // Only broadcast deletion if it was a "delete for everyone" action
      if (wasDeleted && deleteFrom.length > 1) {
        io.to(conversationId).emit("message-deleted", deletionPayload);
      }
    } catch (deleteError) {
      console.error("Message deletion error:", deleteError);
    }
  };

  clientSocket.on("delete-message", onMessageRemoval);

  // ──────────── Typing Indicators ────────────

  clientSocket.on("typing", (typingData) => {
    io.to(typingData.conversationId).emit("typing", typingData);
  });

  clientSocket.on("stop-typing", (typingData) => {
    io.to(typingData.conversationId).emit("stop-typing", typingData);
  });

  // ──────────── Group Lifecycle Events ────────────

  clientSocket.on("group-deleted", (groupData) => {
    const { groupId, members } = groupData;
    members.forEach((memberId) => {
      io.to(memberId.toString()).emit("group-deleted-notification", { groupId });
    });
  });

  // ──────────── Disconnection Handling ────────────

  clientSocket.on("disconnect", async () => {
    console.log("User disconnected:", connectedUserId, clientSocket.id);

    try {
      if (connectedUserId) {
        // Update presence status in database
        await User.findByIdAndUpdate(connectedUserId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        // Notify active conversation rooms that this user went offline
        const userConversations = await Conversation.find({
          members: { $in: [connectedUserId] },
        });

        userConversations.forEach((conversation) => {
          const roomSockets = io.sockets.adapter.rooms.get(conversation.id);
          if (roomSockets) {
            io.to(conversation.id).emit("receiver-offline", {});
          }
        });
      }
    } catch (disconnectError) {
      console.error("Disconnect handling error:", disconnectError);
    }
  });
};

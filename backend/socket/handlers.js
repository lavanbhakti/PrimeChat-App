const Conversation = require("../Models/Conversation.js");
const User = require("../Models/User.js");
const {
  getAiResponse,
  sendMessageHandler,
  deleteMessageHandler,
} = require("../Controllers/message_controller.js");

module.exports = (io, socket) => {
  let currentUserId = null;

  // Setup user in a room
  socket.on("setup", async (id) => {
    currentUserId = id;
    socket.join(id);
    console.log("User joined personal room", id);
    socket.emit("user setup", id);

    // change isOnline to true
    await User.findByIdAndUpdate(id, { isOnline: true });

    const conversations = await Conversation.find({
      members: { $in: [id] },
    });

    conversations.forEach((conversation) => {
      const sock = io.sockets.adapter.rooms.get(conversation.id);
      if (sock) {
        console.log("Other user is online is sent to: ", id);
        io.to(conversation.id).emit("receiver-online", {});
      }
    });
  });

  // Join chat room
  socket.on("join-chat", async (data) => {
    const { roomId, userId } = data;

    console.log("User joined chat room", roomId);
    
    try {
      const conv = await Conversation.findById(roomId);
      
      // Check if conversation exists
      if (!conv) {
        console.log("Conversation not found:", roomId);
        socket.emit("conversation-not-found", { roomId });
        return;
      }

      socket.join(roomId);

      // set joined user unread to 0
      if (conv.unreadCounts && Array.isArray(conv.unreadCounts)) {
        conv.unreadCounts = conv.unreadCounts.map((unread) => {
          if (unread.userId == userId) {
            unread.count = 0;
          }
          return unread;
        });
        await conv.save({ timestamps: false });
      }

      io.to(roomId).emit("user-joined-room", userId);
    } catch (error) {
      console.error("Error joining chat room:", error);
      socket.emit("join-chat-error", { roomId, error: error.message });
    }
  });

  // Leave chat room
  socket.on("leave-chat", (room) => {
    socket.leave(room);
  });

  const handleSendMessage = async (data) => {
    console.log("Received message: ");

    var isSentToBot = false;

    const { conversationId, senderId, text, imageUrl } = data;
    
    try {
      const conversation = await Conversation.findById(conversationId).populate(
        "members"
      );

      // Check if conversation exists
      if (!conversation) {
        console.log("Conversation not found:", conversationId);
        socket.emit("conversation-not-found", { conversationId });
        return;
      }

      // processing for AI chatbot
      conversation.members.forEach(async (member) => {
        if (member._id != senderId && member.email.endsWith("bot")) {
          // this member is a bot
          isSentToBot = true;
          // send typing event
          io.to(conversationId).emit("typing", { typer: member._id.toString() });
          // generating AI response

          const mockUserMessage = {
            id_: Date.now().toString(),
            conversationId: conversationId,
            senderId: senderId,
            text: text,
            seenBy: [
              {
                user: member._id.toString(),
                seenAt: new Date(),
              },
            ],
            imageUrl: imageUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          io.to(conversationId).emit("receive-message", mockUserMessage);

          const responseMessage = await getAiResponse(
            text,
            senderId,
            conversationId
          );

          if (responseMessage == -1) {
            return;
          }

          io.to(conversationId).emit("receive-message", responseMessage);
          io.to(conversationId).emit("stop-typing", {
            typer: member._id.toString(),
          });
        }
      });

      if (isSentToBot) {
        return;
      }

      // processing for personal chat
      const receiverId = conversation.members.find(
        (member) => member._id != senderId
      )?._id;

      if (!receiverId) {
        console.log("Receiver not found in conversation");
        return;
      }

      const receiverPersonalRoom = io.sockets.adapter.rooms.get(
        receiverId.toString()
      );

      let isReceiverInsideChatRoom = false;

      if (receiverPersonalRoom) {
        const receiverSid = Array.from(receiverPersonalRoom)[0];
        const chatRoom = io.sockets.adapter.rooms.get(conversationId);
        isReceiverInsideChatRoom = chatRoom ? chatRoom.has(receiverSid) : false;
      }

      const message = await sendMessageHandler({
        text,
        imageUrl,
        senderId,
        conversationId,
        receiverId,
        isReceiverInsideChatRoom,
      });

      io.to(conversationId).emit("receive-message", message);

      // sending notification to receiver
      if (!isReceiverInsideChatRoom) {
        console.log("Emitting new message to: ", receiverId.toString());
        io.to(receiverId.toString()).emit("new-message-notification", message);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("send-message-error", { error: error.message });
    }
  };

  // Send message
  socket.on("send-message", handleSendMessage);

  const handleDeleteMessage = async (data) => {
    try {
      const { messageId, deleteFrom, conversationId } = data;
      const deleted = await deleteMessageHandler({ messageId, deleteFrom });
      if (deleted && deleteFrom.length > 1) {
        io.to(conversationId).emit("message-deleted", data);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  // Delete message
  socket.on("delete-message", handleDeleteMessage);

  // Typing indicator
  socket.on("typing", (data) => {
    io.to(data.conversationId).emit("typing", data);
  });

  // Stop typing indicator
  socket.on("stop-typing", (data) => {
    io.to(data.conversationId).emit("stop-typing", data);
  });

  // Handle group deletion
  socket.on("group-deleted", (data) => {
    const { groupId, members } = data;
    // Notify all members that the group was deleted
    members.forEach((memberId) => {
      io.to(memberId.toString()).emit("group-deleted-notification", { groupId });
    });
  });

  // Disconnect
  socket.on("disconnect", async () => {
    console.log("A user disconnected", currentUserId, socket.id);
    try {
      if (currentUserId) {
        await User.findByIdAndUpdate(currentUserId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        const conversations = await Conversation.find({
          members: { $in: [currentUserId] },
        });

        conversations.forEach((conversation) => {
          const sock = io.sockets.adapter.rooms.get(conversation.id);
          if (sock) {
            console.log("Other user is offline is sent to: ", currentUserId);
            io.to(conversation.id).emit("receiver-offline", {});
          }
        });
      }
    } catch (error) {
      console.error("Error updating user status on disconnect:", error);
    }
  });
};

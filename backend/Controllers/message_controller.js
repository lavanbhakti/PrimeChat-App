/**
 * PrimeChat Message Controller
 * 
 * Handles all message-related operations: fetching conversation history,
 * message deletion, S3 presigned URL generation for file uploads,
 * Gemini AI chatbot responses, and message creation for both
 * direct and group conversations.
 * 
 * @module MessageController
 */

const Message = require("../Models/Message.js");
const Conversation = require("../Models/Conversation.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config({ path: "./.env" });

const {
  AWS_BUCKET_NAME,
  AWS_SECRET,
  AWS_ACCESS_KEY,
  GEMINI_MODEL,
} = require("../secrets.js");
const { S3Client } = require("@aws-sdk/client-s3");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");

/** Initialize the Gemini AI client for chatbot functionality */
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });

/** Allowed MIME types for file uploads via S3 presigned URLs */
const PERMITTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
];

/**
 * Creates a configured AWS S3 client instance.
 * @returns {S3Client} Configured S3 client
 */
function createS3Instance() {
  return new S3Client({
    credentials: {
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET,
    },
    region: process.env.AWS_REGION || "eu-north-1",
  });
}

/**
 * GET /message/:id/:userid
 * Fetches all messages in a conversation, excluding those soft-deleted
 * by the requesting user. Also marks all messages as seen by the user.
 */
const fetchConversationMessages = async (req, res) => {
  try {
    const conversationMessages = await Message.find({
      conversationId: req.params.id,
      deletedFrom: { $ne: req.user.id },
    });

    // Mark each message as read by the current user
    conversationMessages.forEach(async (msg) => {
      const alreadySeen = msg.seenBy.some(
        (entry) => entry.user == req.user.id
      );
      if (!alreadySeen) {
        msg.seenBy.push({ user: req.user.id });
      }
      await msg.save();
    });

    return res.json(conversationMessages);
  } catch (fetchError) {
    console.error("Message fetch error:", fetchError.message);
    return res.status(500).send("Internal Server Error");
  }
};

/**
 * POST /message/delete
 * Soft-deletes a message for specified users by adding their IDs
 * to the message's deletedby array.
 */
const markMessageAsDeleted = async (req, res) => {
  const targetMessageId = req.body.messageid;
  const affectedUserIds = req.body.userids;

  try {
    const targetMessage = await Message.findById(targetMessageId);

    affectedUserIds.forEach(async (userId) => {
      if (!targetMessage.deletedby.includes(userId)) {
        targetMessage.deletedby.push(userId);
      }
    });

    await targetMessage.save();
    return res.status(200).send("Message deleted successfully");
  } catch (deleteError) {
    console.log("Message deletion error:", deleteError.message);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

/**
 * GET /message/presigned-url
 * Generates a presigned S3 POST URL for secure client-side file uploads.
 * Validates file type against permitted MIME types and enforces 5MB size limit.
 */
const generateFileUploadUrl = async (req, res) => {
  const fileName = req.query.filename;
  const fileType = req.query.filetype;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: "Filename and filetype are required" });
  }

  if (!PERMITTED_FILE_TYPES.includes(fileType)) {
    return res.status(400).json({ error: "Unsupported file type" });
  }

  const uploaderId = req.user.id;
  const s3 = createS3Instance();

  try {
    const uploadKey = `primechat/${uploaderId}/${Math.random()}/${fileName}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: AWS_BUCKET_NAME,
      Key: uploadKey,
      Conditions: [["content-length-range", 0, 5 * 1024 * 1024]],
      Fields: { success_action_status: "201" },
      Expires: 15 * 60,
    });

    return res.status(200).json({ url, fields });
  } catch (s3Error) {
    return res.status(500).json({ error: s3Error.message });
  }
};

/**
 * Generates an AI chatbot response using Google Gemini.
 * Loads the last 20 messages as conversation context, sends the
 * user's prompt, and stores both the user message and bot reply.
 * 
 * @param {string} userPrompt - The user's message text
 * @param {string} senderId - ID of the user who sent the message
 * @param {string} conversationId - ID of the bot conversation
 * @returns {object|number} The saved bot message document, or -1 on empty response
 */
const generateAiChatReply = async (userPrompt, senderId, conversationId) => {
  const chatThread = await Conversation.findById(conversationId);
  const botUserId = chatThread.members.find((member) => member != senderId);

  // Build conversation history from recent messages
  const recentMessages = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(20);

  const chatHistory = recentMessages
    .map((msg) => ({
      role: msg.senderId == senderId ? "user" : "model",
      parts: msg.text,
    }))
    .reverse();

  try {
    const chatSession = aiModel.startChat({
      history: chatHistory,
      generationConfig: { maxOutputTokens: 2000 },
    });

    const aiResult = await chatSession.sendMessage(userPrompt);
    const aiResponse = aiResult.response;
    let replyText = aiResponse.text();

    if (replyText.length < 1) {
      replyText = "That was too long — try asking something shorter!";
      return -1;
    }

    // Persist the user's original message
    await Message.create({
      conversationId,
      senderId,
      text: userPrompt,
      seenBy: [{ user: botUserId, seenAt: new Date() }],
    });

    // Persist the bot's reply
    const botReplyMessage = await Message.create({
      conversationId,
      senderId: botUserId,
      text: replyText,
    });

    chatThread.latestmessage = replyText;
    await chatThread.save();

    return botReplyMessage;
  } catch (aiError) {
    console.log("AI response generation error:", aiError.message);
    return "An error occurred while generating the AI response";
  }
};

/**
 * Processes and stores a direct (1-to-1) message.
 * Handles read receipt logic based on whether the receiver is
 * currently viewing the conversation.
 * 
 * @param {object} messageData - Message payload from the socket event
 * @returns {object} The saved message document
 */
const processDirectMessage = async (messageData) => {
  const {
    text,
    imageUrl,
    senderId,
    conversationId,
    receiverId,
    isReceiverInsideChatRoom,
  } = messageData;

  const conversationThread = await Conversation.findById(conversationId);
  const previewText = text || (imageUrl ? "📷 Image" : "");

  if (!isReceiverInsideChatRoom) {
    // Receiver is not viewing this chat — create unread message
    const savedMessage = await Message.create({
      conversationId,
      senderId,
      text: text || undefined,
      imageUrl: imageUrl || undefined,
      seenBy: [],
    });

    conversationThread.latestmessage = previewText;
    conversationThread.unreadCounts.map((counter) => {
      if (counter.userId.toString() == receiverId.toString()) {
        counter.count += 1;
      }
    });
    await conversationThread.save();
    return savedMessage;
  } else {
    // Receiver is actively viewing — mark as immediately seen
    const savedMessage = await Message.create({
      conversationId,
      senderId,
      text: text || undefined,
      imageUrl: imageUrl || undefined,
      seenBy: [{ user: receiverId, seenAt: new Date() }],
    });

    conversationThread.latestmessage = previewText;
    await conversationThread.save();
    return savedMessage;
  }
};

/**
 * Processes and stores a group message.
 * Builds read receipts from members currently in the chat room
 * and increments unread counters for absent members.
 * 
 * @param {object} messageData - Message payload including membersInRoom
 * @returns {object} The saved message document
 */
const processGroupMessage = async (messageData) => {
  const { text, imageUrl, senderId, conversationId, membersInRoom } = messageData;
  const conversationThread = await Conversation.findById(conversationId);
  const previewText = text || (imageUrl ? "📷 Image" : "");

  // Build seen-by list from members currently viewing the conversation
  const readReceipts = membersInRoom
    .filter((id) => id !== senderId)
    .map((id) => ({ user: id, seenAt: new Date() }));

  const savedMessage = await Message.create({
    conversationId,
    senderId,
    text: text || undefined,
    imageUrl: imageUrl || undefined,
    seenBy: readReceipts,
  });

  conversationThread.latestmessage = previewText;

  // Increment unread count for members NOT currently in the chat room
  conversationThread.unreadCounts.map((counter) => {
    const memberId = counter.userId.toString();
    if (memberId !== senderId && !membersInRoom.includes(memberId)) {
      counter.count += 1;
    }
  });

  await conversationThread.save();
  return savedMessage;
};

/**
 * Handles soft-deletion of a message for specified users.
 * Used by the socket event handler for real-time deletion.
 * 
 * @param {object} data - Contains messageId and deleteFrom user IDs
 * @returns {boolean} Success status
 */
const handleMessageRemoval = async (data) => {
  const { messageId, deleteFrom } = data;
  const targetMessage = await Message.findById(messageId);

  if (!targetMessage) return false;

  try {
    deleteFrom.forEach(async (userId) => {
      if (!targetMessage.deletedFrom.includes(userId)) {
        targetMessage.deletedFrom.push(userId);
      }
    });
    await targetMessage.save();
    return true;
  } catch (removalError) {
    console.log("Message removal error:", removalError.message);
    return false;
  }
};

module.exports = {
  fetchConversationMessages,
  generateFileUploadUrl,
  generateAiChatReply,
  markMessageAsDeleted,
  processDirectMessage,
  processGroupMessage,
  handleMessageRemoval,
};

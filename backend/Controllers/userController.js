const {
  AWS_BUCKET_NAME,
  AWS_SECRET,
  AWS_ACCESS_KEY,
} = require("../secrets.js");
const { S3Client } = require("@aws-sdk/client-s3");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
const User = require("../Models/User.js");
const Conversation = require("../Models/Conversation.js");

// Get presigned URL for uploading images (chat images, profile pics, group pics)
const getPresignedUrl = async (req, res) => {
  const filename = req.query.filename;
  const filetype = req.query.filetype;
  const uploadType = req.query.type || 'chat'; // 'chat', 'profile', 'group'

  if (!filename || !filetype) {
    return res
      .status(400)
      .json({ error: "Filename and filetype are required" });
  }

  if (!filetype.startsWith("image/")) {
    return res.status(400).json({ error: "Invalid file type. Only images are allowed" });
  }

  const userId = req.user.id;
  const s3Client = new S3Client({
    credentials: {
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET,
    },
    region: process.env.AWS_REGION || "eu-north-1",
  });

  try {
    // Create different folder structure based on upload type
    let keyPath;
    switch(uploadType) {
      case 'profile':
        keyPath = `primechat/profiles/${userId}/${Date.now()}_${filename}`;
        break;
      case 'group':
        keyPath = `primechat/groups/${Date.now()}_${filename}`;
        break;
      case 'chat':
      default:
        keyPath = `primechat/chats/${userId}/${Date.now()}_${filename}`;
        break;
    }

    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: AWS_BUCKET_NAME,
      Key: keyPath,
      Conditions: [
        ["content-length-range", 0, 10 * 1024 * 1024], // Max 10MB
        ["starts-with", "$Content-Type", "image/"]
      ],
      Fields: {
        success_action_status: "201",
        "Content-Type": filetype
      },
      Expires: 15 * 60, // 15 minutes
    });

    return res.status(200).json({ url, fields, key: keyPath });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Update user profile picture
const updateProfilePicture = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user.id;

    if (!profilePic) {
      return res.status(400).json({ error: "Profile picture URL is required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { profilePic },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "Profile picture updated successfully",
      user
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update group profile picture
const updateGroupPicture = async (req, res) => {
  try {
    const { conversationId, profilePic } = req.body;
    const userId = req.user.id;

    if (!conversationId || !profilePic) {
      return res.status(400).json({ 
        error: "Conversation ID and profile picture URL are required" 
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!conversation.isGroup) {
      return res.status(400).json({ error: "This is not a group conversation" });
    }

    // Check if user is a member of the group
    if (!conversation.members.includes(userId)) {
      return res.status(403).json({ 
        error: "You are not authorized to update this group" 
      });
    }

    conversation.profilePic = profilePic;
    await conversation.save();

    const updatedConversation = await Conversation.findById(conversationId)
      .populate("members", "-password");

    res.status(200).json({
      message: "Group picture updated successfully",
      conversation: updatedConversation
    });
  } catch (error) {
    console.error("Error updating group picture:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get online status
const getOnlineStatus = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ isOnline: user.isOnline });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { 
  getPresignedUrl, 
  getOnlineStatus,
  updateProfilePicture,
  updateGroupPicture
};

/**
 * PrimeChat User Management Controller
 * 
 * Handles user-related operations: S3 presigned URL generation for
 * image uploads (chat, profile, group), profile picture updates,
 * group picture updates, and online presence status queries.
 * 
 * @module UserController
 */

const {
  AWS_BUCKET_NAME,
  AWS_SECRET,
  AWS_ACCESS_KEY,
} = require("../secrets.js");
const { S3Client } = require("@aws-sdk/client-s3");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
const User = require("../Models/User.js");
const Conversation = require("../Models/Conversation.js");

/**
 * Creates a configured AWS S3 client for image upload operations.
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
 * Determines the S3 storage path based on upload type.
 * @param {string} uploadCategory - One of 'chat', 'profile', or 'group'
 * @param {string} userId - The uploader's ID
 * @param {string} fileName - Original filename
 * @returns {string} The S3 object key path
 */
function resolveUploadPath(uploadCategory, userId, fileName) {
  const timestamp = Date.now();
  switch (uploadCategory) {
    case "profile":
      return `primechat/profiles/${userId}/${timestamp}_${fileName}`;
    case "group":
      return `primechat/groups/${timestamp}_${fileName}`;
    case "chat":
    default:
      return `primechat/chats/${userId}/${timestamp}_${fileName}`;
  }
}

/**
 * GET /user/presigned-url
 * Generates a presigned S3 POST URL for secure client-side image uploads.
 * Supports chat images, profile pictures, and group avatars.
 */
const generateUploadUrl = async (req, res) => {
  const fileName = req.query.filename;
  const fileType = req.query.filetype;
  const uploadCategory = req.query.type || "chat";

  if (!fileName || !fileType) {
    return res.status(400).json({ error: "Filename and filetype are required" });
  }

  if (!fileType.startsWith("image/")) {
    return res.status(400).json({ error: "Only image files are permitted" });
  }

  const uploaderId = req.user.id;
  const s3 = createS3Instance();
  const objectKey = resolveUploadPath(uploadCategory, uploaderId, fileName);

  try {
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: AWS_BUCKET_NAME,
      Key: objectKey,
      Conditions: [
        ["content-length-range", 0, 10 * 1024 * 1024],
        ["starts-with", "$Content-Type", "image/"],
      ],
      Fields: {
        success_action_status: "201",
        "Content-Type": fileType,
      },
      Expires: 15 * 60,
    });

    return res.status(200).json({ url, fields, key: objectKey });
  } catch (s3Error) {
    console.error("Presigned URL generation error:", s3Error);
    return res.status(500).json({ error: s3Error.message });
  }
};

/**
 * PUT /user/update-profile-picture
 * Updates the authenticated user's profile avatar URL.
 */
const changeUserAvatar = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user.id;

    if (!profilePic) {
      return res.status(400).json({ error: "Profile picture URL is required" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "Profile picture updated successfully",
      user: updatedUser,
    });
  } catch (updateError) {
    console.error("Avatar update error:", updateError);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * PUT /user/update-group-picture
 * Updates a group conversation's avatar image.
 * Only group members are authorized to change the group picture.
 */
const changeGroupAvatar = async (req, res) => {
  try {
    const { conversationId, profilePic } = req.body;
    const requestingUserId = req.user.id;

    if (!conversationId || !profilePic) {
      return res.status(400).json({
        error: "Conversation ID and profile picture URL are required",
      });
    }

    const groupThread = await Conversation.findById(conversationId);

    if (!groupThread) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!groupThread.isGroup) {
      return res.status(400).json({ error: "This is not a group conversation" });
    }

    if (!groupThread.members.includes(requestingUserId)) {
      return res.status(403).json({ error: "You are not authorized to update this group" });
    }

    groupThread.profilePic = profilePic;
    await groupThread.save();

    const refreshedThread = await Conversation.findById(conversationId)
      .populate("members", "-password");

    return res.status(200).json({
      message: "Group picture updated successfully",
      conversation: refreshedThread,
    });
  } catch (updateError) {
    console.error("Group avatar update error:", updateError);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET /user/online-status/:id
 * Returns the real-time online presence status of a user.
 */
const checkUserPresence = async (req, res) => {
  const targetUserId = req.params.id;

  try {
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ isOnline: targetUser.isOnline });
  } catch (queryError) {
    console.log("Presence check error:", queryError);
    return res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  generateUploadUrl,
  checkUserPresence,
  changeUserAvatar,
  changeGroupAvatar,
};

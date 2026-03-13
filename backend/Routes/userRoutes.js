/**
 * PrimeChat User Management Routes
 * 
 * Defines HTTP endpoints for user-related operations:
 * online status, contact discovery, profile updates,
 * image uploads, and avatar management.
 * 
 * @module UserRoutes
 */

const express = require("express");
const router = express.Router();
const authenticateRequest = require("../middleware/fetchUser.js");

const {
  generateUploadUrl,
  checkUserPresence,
  changeUserAvatar,
  changeGroupAvatar,
} = require("../Controllers/userController.js");

const {
  getNonFriendsList,
  fetchAllRegisteredUsers,
  updateUserProfile,
} = require("../Controllers/auth_controller.js");

// GET /user/online-status/:id — Check if a user is currently online
router.get("/online-status/:id", authenticateRequest, checkUserPresence);

// GET /user/non-friends — List users not yet connected with current user
router.get("/non-friends", authenticateRequest, getNonFriendsList);

// GET /user/all-users — List all registered users (for group creation)
router.get("/all-users", authenticateRequest, fetchAllRegisteredUsers);

// PUT /user/update — Update user profile (name, about, password)
router.put("/update", authenticateRequest, updateUserProfile);

// GET /user/presigned-url — Generate S3 upload URL for images
router.get("/presigned-url", authenticateRequest, generateUploadUrl);

// PUT /user/update-profile-picture — Change user's avatar
router.put("/update-profile-picture", authenticateRequest, changeUserAvatar);

// PUT /user/update-group-picture — Change group's avatar
router.put("/update-group-picture", authenticateRequest, changeGroupAvatar);

module.exports = router;

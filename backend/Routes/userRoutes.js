const express = require("express");
const router = express.Router();
const fetchuser = require("../middleware/fetchUser.js");
const {
  getPresignedUrl,
  getOnlineStatus,
  updateProfilePicture,
  updateGroupPicture,
} = require("../Controllers/userController.js");
const {
  getNonFriendsList,
  getAllUsers,
  updateprofile,
} = require("../Controllers/auth_controller.js");

router.get("/online-status/:id", fetchuser, getOnlineStatus);
router.get("/non-friends", fetchuser, getNonFriendsList);
router.get("/all-users", fetchuser, getAllUsers);
router.put("/update", fetchuser, updateprofile);
router.get("/presigned-url", fetchuser, getPresignedUrl);
router.put("/update-profile-picture", fetchuser, updateProfilePicture);
router.put("/update-group-picture", fetchuser, updateGroupPicture);

module.exports = router;

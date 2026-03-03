const express = require("express");
const router = express.Router();
const {
  register,
  login,
  authUser,
  sendotp,
  sendSignupOtp,
  verifySignupOtp,
} = require("../Controllers/auth_controller.js");

router.post("/register", register);
router.post("/login", login);
router.get("/me", authUser);
router.post("/getotp", sendotp);
router.post("/signup-otp", sendSignupOtp);
router.post("/verify-signup-otp", verifySignupOtp);
module.exports = router;

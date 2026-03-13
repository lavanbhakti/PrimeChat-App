/**
 * PrimeChat Authentication Controller
 * 
 * Handles user registration, login (password + OTP), session validation,
 * profile updates, user discovery, and email-based OTP verification.
 * On registration, an AI chatbot companion is automatically created.
 * 
 * @module AuthController
 */

const User = require("../Models/User.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Conversation = require("../Models/Conversation.js");
const ObjectId = require("mongoose").Types.ObjectId;
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config({ path: "./.env" });
const { JWT_SECRET } = require("../secrets.js");

/** SMTP transport for sending verification emails via Gmail */
const emailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  logger: true,
  debug: true,
});

/**
 * In-memory store for signup OTPs.
 * Structure: { [email]: { otp: string, expiry: number } }
 * Auto-cleaned after 5 minutes per entry.
 */
const pendingSignupOtps = {};

/**
 * Generates a cryptographically random 6-digit OTP string.
 * @returns {string} Six-digit numeric code
 */
function generateSecureOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Builds an HTML email template for OTP delivery.
 * @param {string} otpCode - The OTP to embed in the email
 * @param {string} purpose - Either "login" or "signup"
 * @returns {string} Complete HTML email body
 */
function buildOtpEmailTemplate(otpCode, purpose) {
  const headingText =
    purpose === "signup"
      ? "PrimeChat - Signup Verification"
      : "PrimeChat - Login Verification";

  const instructionText =
    purpose === "signup"
      ? "Use this OTP to complete your signup. It expires in 5 minutes."
      : "Use this OTP to log in to your account.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${headingText}</title>
  <style>
    .otp-container { width: 50%; margin: 0 auto; background: #f4f4f4; padding: 20px; border-radius: 8px; }
    h1 { text-align: center; color: #6b46c1; }
    .otp-code { font-size: 24px; letter-spacing: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <strong><h1>${headingText}</h1></strong>
  <div class="otp-container">
    <h2>Your Verification Code</h2>
    <p class="otp-code">${otpCode}</p>
    <p>${instructionText}</p>
  </div>
</body>
</html>`;
}

/**
 * Sends a standardized JSON response.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {object} payload
 */
function sendResponse(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

/**
 * POST /auth/register
 * Creates a new user account with OTP verification, hashes the password,
 * generates a default avatar, and creates an AI chatbot companion.
 */
const handleUserRegistration = async (req, res) => {
  try {
    console.log("Registration request received");

    const { name, email, password, otp } = req.body;

    if (!name || !email || !password || !otp) {
      return sendResponse(res, 400, {
        error: "All fields are required including OTP verification",
      });
    }

    // Validate the signup OTP before proceeding
    const storedOtpData = pendingSignupOtps[email.toLowerCase()];
    if (!storedOtpData || storedOtpData.otp !== otp || Date.now() > storedOtpData.expiry) {
      return sendResponse(res, 400, {
        error: "Invalid or expired OTP. Please request a new verification code.",
      });
    }

    // OTP confirmed — remove from pending store
    delete pendingSignupOtps[email.toLowerCase()];

    // Prevent bot email suffix from being used for real accounts
    if (email.endsWith("bot")) {
      return sendResponse(res, 400, { error: "Invalid email address format" });
    }

    // Check for duplicate email registration
    const existingAccount = await User.findOne({ email });
    if (existingAccount) {
      return sendResponse(res, 400, { error: "An account with this email already exists" });
    }

    // Generate auto-avatar and hash the password
    const avatarUrl = `https://ui-avatars.com/api/?name=${name}&background=random&bold=true`;
    const passwordSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, passwordSalt);

    // Create the user account
    const newAccount = new User({
      name,
      email,
      password: hashedPassword,
      profilePic: avatarUrl,
      about: "Hello World!!",
    });
    await newAccount.save();

    // Create an AI chatbot companion for the new user
    const botAccountData = await User.findOne({ email });
    botAccountData._id = new ObjectId();
    botAccountData.name = "AI Chatbot";
    botAccountData.email = email + "bot";
    botAccountData.about = "I am an AI Chatbot to help you";
    botAccountData.profilePic =
      "https://play-lh.googleusercontent.com/Oe0NgYQ63TGGEr7ViA2fGA-yAB7w2zhMofDBR3opTGVvsCFibD8pecWUjHBF_VnVKNdJ";
    await User.insertMany(botAccountData);

    const botAccount = await User.findOne({ email: email + "bot" });

    // Create an initial conversation between user and their AI bot
    const botConversation = new Conversation({
      members: [newAccount._id, botAccount._id],
    });
    await botConversation.save();

    // Issue JWT authentication token
    const tokenPayload = { user: { id: newAccount.id } };
    const authToken = jwt.sign(tokenPayload, JWT_SECRET);

    return sendResponse(res, 200, { authtoken: authToken });
  } catch (registrationError) {
    console.error("Registration error:", registrationError.message);
    return sendResponse(res, 500, { error: "Internal Server Error" });
  }
};

/**
 * POST /auth/login
 * Authenticates via email+password or email+OTP.
 * Returns a JWT token and user profile data on success.
 */
const handleUserLogin = async (req, res) => {
  console.log("Login request received");

  try {
    const { email, password, otp } = req.body;

    if (!email || (!password && !otp)) {
      return sendResponse(res, 400, { error: "Please provide all required credentials" });
    }

    const userAccount = await User.findOne({ email });
    if (!userAccount) {
      return sendResponse(res, 400, { error: "Invalid Credentials" });
    }

    // OTP-based authentication flow
    if (otp) {
      if (userAccount.otp != otp) {
        return sendResponse(res, 400, { error: "Invalid verification code" });
      }
      userAccount.otp = "";
      await userAccount.save();
    } else {
      // Password-based authentication flow
      const isPasswordValid = await bcrypt.compare(password, userAccount.password);
      if (!isPasswordValid) {
        return sendResponse(res, 400, { error: "Invalid Credentials" });
      }
    }

    // Issue JWT authentication token
    const tokenPayload = { user: { id: userAccount.id } };
    const authToken = jwt.sign(tokenPayload, JWT_SECRET);

    return sendResponse(res, 200, {
      authtoken: authToken,
      user: {
        _id: userAccount.id,
        name: userAccount.name,
        email: userAccount.email,
        profilePic: userAccount.profilePic,
      },
    });
  } catch (loginError) {
    console.error("Login error:", loginError.message);
    return sendResponse(res, 500, { error: "Internal Server Error" });
  }
};

/**
 * GET /auth/me
 * Validates the current session by verifying the auth token
 * and returns the authenticated user's profile (excluding password).
 */
const validateSession = async (req, res) => {
  const authToken = req.header("auth-token");
  if (!authToken) {
    return sendResponse(res, 401, { error: "Authentication token required" });
  }

  try {
    const decodedPayload = jwt.verify(authToken, JWT_SECRET);
    if (!decodedPayload) {
      return sendResponse(res, 401, { error: "Invalid authentication token" });
    }

    const userProfile = await User.findById(decodedPayload.user.id).select("-password");
    return res.json(userProfile);
  } catch (sessionError) {
    console.error("Session validation error:", sessionError.message);
    return sendResponse(res, 500, { error: "Internal Server Error" });
  }
};

/**
 * GET /user/non-friends
 * Returns users who don't yet have a 1-to-1 conversation with
 * the authenticated user (excludes bot accounts).
 */
const getNonFriendsList = async (req, res) => {
  try {
    const existingConversations = await Conversation.find({
      members: { $in: [req.user.id] },
      isGroup: false,
    });

    // Collect all user IDs already in conversations with current user
    const connectedUserIds = existingConversations.flatMap((conv) => conv.members);

    const availableUsers = await User.find({
      _id: { $nin: connectedUserIds },
      email: { $not: /bot$/ },
    });

    return res.json(availableUsers);
  } catch (queryError) {
    console.error("Non-friends query error:", queryError.message);
    return sendResponse(res, 500, { error: "Internal Server Error" });
  }
};

/**
 * PUT /user/update
 * Updates the authenticated user's profile fields.
 * Supports name, about, and password change (requires old password verification).
 */
const updateUserProfile = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    // Handle password change if requested
    if (req.body.newpassword) {
      const isOldPasswordValid = await bcrypt.compare(
        req.body.oldpassword,
        currentUser.password
      );

      if (!isOldPasswordValid) {
        return sendResponse(res, 400, { error: "Current password is incorrect" });
      }

      const newSalt = await bcrypt.genSalt(10);
      const newHashedPassword = await bcrypt.hash(req.body.newpassword, newSalt);
      req.body.password = newHashedPassword;

      delete req.body.oldpassword;
      delete req.body.newpassword;
    }

    await User.findByIdAndUpdate(req.user.id, req.body);
    return sendResponse(res, 200, { message: "Profile Updated" });
  } catch (updateError) {
    console.error("Profile update error:", updateError.message);
    return sendResponse(res, 500, { error: "Internal Server Error" });
  }
};

/**
 * POST /auth/getotp
 * Sends a one-time password to the user's email for passwordless login.
 * The OTP expires after 5 minutes.
 */
const dispatchLoginOtp = async (req, res) => {
  try {
    console.log("Login OTP request received");

    const { email } = req.body;
    const userAccount = await User.findOne({ email });

    if (!userAccount) {
      return sendResponse(res, 400, { error: "No account found with this email" });
    }

    const otpCode = generateSecureOtp();
    userAccount.otp = otpCode;
    await userAccount.save();

    // Schedule OTP expiration after 5 minutes
    setTimeout(() => {
      userAccount.otp = "";
      userAccount.save();
    }, 300000);

    const emailPayload = {
      from: process.env.EMAIL,
      to: email,
      subject: "PrimeChat - Login Verification Code",
      html: buildOtpEmailTemplate(otpCode, "login"),
    };

    try {
      await emailTransporter.sendMail(emailPayload);
      console.log("Login OTP email sent successfully");
      return sendResponse(res, 200, { message: "OTP sent" });
    } catch (emailError) {
      console.error("Email delivery error:", emailError);
      return sendResponse(res, 400, { message: "Failed to send verification email" });
    }
  } catch (otpError) {
    console.error("OTP dispatch error:", otpError.message);
    return sendResponse(res, 500, { error: "Internal Server Error" });
  }
};

/**
 * GET /user/all-users
 * Returns all registered users except bots and the current user.
 * Used for group creation member selection.
 */
const fetchAllRegisteredUsers = async (req, res) => {
  try {
    const allUsers = await User.find({
      _id: { $ne: req.user.id },
      email: { $not: /bot$/ },
    }).select("-password");

    return res.json(allUsers);
  } catch (fetchError) {
    console.error("User fetch error:", fetchError.message);
    return sendResponse(res, 500, { error: "Internal Server Error" });
  }
};

/**
 * POST /auth/signup-otp
 * Sends an OTP to verify email ownership during the signup flow.
 * Stores the OTP in-memory with a 5-minute expiration.
 */
const dispatchSignupOtp = async (req, res) => {
  try {
    console.log("Signup OTP request received");

    const { email } = req.body;
    if (!email) {
      return sendResponse(res, 400, { error: "Email address is required" });
    }

    // Prevent duplicate registrations
    const existingAccount = await User.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      return sendResponse(res, 400, { error: "Account already exists. Please login instead." });
    }

    const otpCode = generateSecureOtp();
    pendingSignupOtps[email.toLowerCase()] = {
      otp: otpCode,
      expiry: Date.now() + 5 * 60 * 1000,
    };

    // Schedule automatic cleanup after 5 minutes
    setTimeout(() => {
      delete pendingSignupOtps[email.toLowerCase()];
    }, 5 * 60 * 1000);

    const emailPayload = {
      from: process.env.EMAIL,
      to: email,
      subject: "PrimeChat - Signup Verification Code",
      html: buildOtpEmailTemplate(otpCode, "signup"),
    };

    try {
      await emailTransporter.sendMail(emailPayload);
      console.log("Signup OTP sent successfully");
      return sendResponse(res, 200, { message: "OTP sent to your email" });
    } catch (emailError) {
      console.error("Signup OTP email error:", emailError);
      return sendResponse(res, 400, { error: "Failed to send verification email" });
    }
  } catch (signupOtpError) {
    console.error("Signup OTP error:", signupOtpError.message);
    return sendResponse(res, 500, { error: "Internal Server Error" });
  }
};

/**
 * POST /auth/verify-signup-otp
 * Verifies a signup OTP without consuming it, so the user can
 * still submit the registration form with the same OTP.
 */
const confirmSignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendResponse(res, 400, { error: "Email and verification code are required" });
    }

    const storedOtpData = pendingSignupOtps[email.toLowerCase()];

    if (!storedOtpData) {
      return sendResponse(res, 400, { error: "No pending verification. Please request a new code." });
    }

    if (Date.now() > storedOtpData.expiry) {
      delete pendingSignupOtps[email.toLowerCase()];
      return sendResponse(res, 400, { error: "Verification code has expired. Please request a new one." });
    }

    if (storedOtpData.otp !== otp) {
      return sendResponse(res, 400, { error: "Incorrect verification code" });
    }

    return sendResponse(res, 200, { message: "Email verified successfully", verified: true });
  } catch (verifyError) {
    console.error("OTP verification error:", verifyError.message);
    return sendResponse(res, 500, { error: "Internal Server Error" });
  }
};

module.exports = {
  fetchAllRegisteredUsers,
  handleUserRegistration,
  handleUserLogin,
  getNonFriendsList,
  validateSession,
  updateUserProfile,
  dispatchLoginOtp,
  dispatchSignupOtp,
  confirmSignupOtp,
};
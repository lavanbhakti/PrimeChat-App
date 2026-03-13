/**
 * PrimeChat User Account Schema
 * 
 * Defines the MongoDB document structure for registered users.
 * Each user has authentication credentials, profile information,
 * and online presence tracking fields.
 * 
 * @module UserModel
 */

const mongoose = require("mongoose");

const userAccountSchema = new mongoose.Schema(
  {
    /** Display name shown in chat UI and profile */
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    /** Short bio text visible on the user's profile */
    about: {
      type: String,
      default: "",
    },
    /** Unique email used for login and OTP verification */
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    /** Bcrypt-hashed password for secure credential storage */
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    /** URL to the user's avatar image (uses auto-generated avatar by default) */
    profilePic: {
      type: String,
      default:
        "https://ui-avatars.com/api/?name=PrimeChat&background=random&bold=true",
    },
    /** Temporary one-time password for email-based login */
    otp: {
      type: String,
      default: "",
    },
    /** Real-time presence flag updated via WebSocket connect/disconnect */
    isOnline: {
      type: Boolean,
      default: false,
    },
    /** Timestamp of the user's most recent disconnection */
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userAccountSchema);
module.exports = User;

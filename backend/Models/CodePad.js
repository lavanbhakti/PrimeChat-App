/**
 * PrimeChat Encrypted Note Schema (DevWorkspace)
 * 
 * Stores AES-256-CBC encrypted note content for the DevWorkspace feature.
 * Notes are identified by a SHA-256 hash of the user's secret key,
 * ensuring the server never sees the actual secret or plaintext content.
 * 
 * @module EncryptedNoteModel
 */

const mongoose = require("mongoose");

const encryptedNoteSchema = new mongoose.Schema(
  {
    /** SHA-256 hash of the user's secret key (used for document lookup) */
    noteId: { type: String, unique: true, index: true },

    /** AES-256-CBC encrypted content in hex encoding */
    ciphertext: String,

    /** Initialization vector used during encryption (hex-encoded) */
    iv: String,

    /** Last modification timestamp for the note content */
    updatedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("CodePad", encryptedNoteSchema);

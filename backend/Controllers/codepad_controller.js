/**
 * PrimeChat DevWorkspace (CodePad) Controller
 * 
 * Manages encrypted notes for the DevWorkspace feature.
 * Notes are stored encrypted using AES-256-CBC, identified by a
 * SHA-256 hash of the user's secret key. The server never sees
 * the plaintext key or content — true zero-knowledge encryption.
 * 
 * @module CodePadController
 */

const CodePad = require("../Models/CodePad");
const {
  encipherContent,
  decipherContent,
  generateNoteIdentifier,
} = require("../utils/encrypt");

/**
 * POST /codepad/open
 * Opens an encrypted note using the provided secret key.
 * If no note exists for this key, creates an empty note entry.
 * Otherwise, decrypts and returns the stored content.
 */
const loadEncryptedNote = async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: "Secret key is required" });
    }

    const documentId = generateNoteIdentifier(key);
    let noteDocument = await CodePad.findOne({ noteId: documentId });

    // First-time access: create an empty note placeholder
    if (!noteDocument) {
      noteDocument = new CodePad({ noteId: documentId, ciphertext: "", iv: "" });
      await noteDocument.save();
      return res.json({ text: "" });
    }

    // Empty note with no content yet
    if (!noteDocument.ciphertext) {
      return res.json({ text: "" });
    }

    // Decrypt and return the note content
    const decryptedContent = decipherContent(noteDocument.ciphertext, noteDocument.iv, key);
    return res.json({ text: decryptedContent });
  } catch (loadError) {
    console.error("Note load error:", loadError);
    return res.status(500).json({ error: "Failed to load note" });
  }
};

/**
 * POST /codepad/save
 * Encrypts and persists the note content using the provided secret key.
 * Uses upsert to create the document if it doesn't exist.
 */
const persistEncryptedNote = async (req, res) => {
  try {
    const { key, text } = req.body;

    if (!key) {
      return res.status(400).json({ error: "Secret key is required" });
    }

    const documentId = generateNoteIdentifier(key);
    const { iv, ciphertext } = encipherContent(text || "", key);

    await CodePad.findOneAndUpdate(
      { noteId: documentId },
      { ciphertext, iv, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return res.json({ ok: true });
  } catch (saveError) {
    console.error("Note save error:", saveError);
    return res.status(500).json({ error: "Failed to save note" });
  }
};

/**
 * POST /codepad/delete
 * Permanently removes an encrypted note from the database.
 * The note is identified by the hash of the provided secret key.
 */
const destroyEncryptedNote = async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: "Secret key is required" });
    }

    const documentId = generateNoteIdentifier(key);
    await CodePad.findOneAndDelete({ noteId: documentId });

    return res.json({ ok: true });
  } catch (deleteError) {
    console.error("Note deletion error:", deleteError);
    return res.status(500).json({ error: "Failed to delete note" });
  }
};

module.exports = {
  loadEncryptedNote,
  persistEncryptedNote,
  destroyEncryptedNote,
};

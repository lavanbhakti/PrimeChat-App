/**
 * PrimeChat DevWorkspace (CodePad) Routes
 * 
 * Defines HTTP endpoints for the encrypted notes feature:
 * loading, saving, and deleting encrypted notes.
 * 
 * @module CodePadRoutes
 */

const express = require("express");
const router = express.Router();

const {
  loadEncryptedNote,
  persistEncryptedNote,
  destroyEncryptedNote,
} = require("../Controllers/codepad_controller.js");

// POST /codepad/open — Load or create an encrypted note
router.post("/open", loadEncryptedNote);

// POST /codepad/save — Save encrypted note content
router.post("/save", persistEncryptedNote);

// POST /codepad/delete — Delete an encrypted note
router.post("/delete", destroyEncryptedNote);

module.exports = router;

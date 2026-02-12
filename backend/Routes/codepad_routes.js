const express = require("express");
const router = express.Router();
const {
  openEditor,
  saveEditor,
  deleteEditor,
} = require("../Controllers/codepad_controller.js");

router.post("/open", openEditor);
router.post("/save", saveEditor);
router.post("/delete", deleteEditor);
module.exports = router;

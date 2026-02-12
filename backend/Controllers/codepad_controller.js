const express = require("express");
const router = express.Router();
const CodePad = require("../Models/CodePad");
const {
  encryptWithSecret,
  decryptWithSecret,
  hashKey,
} = require("../utils/encrypt");

const openEditor = async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: "Missing secret key" });

    const noteId = hashKey(key);
    let doc = await CodePad.findOne({ noteId });

    if (!doc) {
      doc = new CodePad({ noteId, ciphertext: "", iv: "" });
      await doc.save();
      return res.json({ text: "" });
    }

    if (!doc.ciphertext) return res.json({ text: "" });
    const text = decryptWithSecret(doc.ciphertext, doc.iv, key);
    res.json({ text });
  } catch (err) {
    console.error("open error", err);
    res.status(500).json({ error: "Server error" });
  }
};

const saveEditor = async (req, res) => {
  try {
    const { key, text } = req.body;
    console.log(req.body);
    if (!key) return res.status(400).json({ error: "Missing key" });
    const noteId = hashKey(key);
    console.log(`noteId: ${noteId}`);
    const { iv, ciphertext } = encryptWithSecret(text || "", key);
    console.log(`iv: ${iv}, ciphertext: ${ciphertext}`);
    await CodePad.findOneAndUpdate(
      { noteId },
      { ciphertext, iv, updatedAt: new Date() },
      { upsert: true, new: true },
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("save error", err);
    res.status(500).json({ error: "Server error" });
  }
};

const deleteEditor = async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: "Missing key" });
    const noteId = hashKey(key);
    await CodePad.findOneAndDelete({ noteId });
    res.json({ ok: true });
  } catch (err) {
    console.error("delete error", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  openEditor,
  saveEditor,
  deleteEditor,
};

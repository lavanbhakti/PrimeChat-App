const mongoose = require("mongoose");
const codePadSchema = new mongoose.Schema(
  {
    noteId: { type: String, unique: true, index: true },
    ciphertext: String,
    iv: String,
    updatedAt: Date,
  },
  { timestamps: true },
);
module.exports = mongoose.model("CodePad", codePadSchema);

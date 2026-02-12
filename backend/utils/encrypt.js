const crypto = require("crypto");
function deriveKeyFromSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest();
}
function encryptWithSecret(plainText, secret) {
  const key = deriveKeyFromSecret(secret);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { iv: iv.toString("hex"), ciphertext: encrypted };
}
function decryptWithSecret(ciphertext, ivHex, secret) {
  const key = deriveKeyFromSecret(secret);
  const iv = Buffer.from(ivHex, "hex");
  const decipher = require("crypto").createDecipheriv("aes-256-cbc", key, iv);
  let dec = decipher.update(ciphertext, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}
function hashKey(secret) {
  return require("crypto").createHash("sha256").update(secret).digest("hex");
}
module.exports = { encryptWithSecret, decryptWithSecret, hashKey };

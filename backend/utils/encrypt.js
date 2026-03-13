/**
 * PrimeChat Encryption Utilities
 * 
 * Provides AES-256-CBC encryption/decryption for the DevWorkspace
 * encrypted notes feature. Each note is encrypted with a user-provided
 * secret key, ensuring zero-knowledge storage on the server.
 * 
 * Algorithm: AES-256-CBC with SHA-256 key derivation
 * IV: Random 16 bytes per encryption operation
 * 
 * @module EncryptionUtils
 */

const crypto = require("crypto");

/**
 * Derives a 256-bit encryption key from a plaintext secret
 * using SHA-256 hashing. This ensures consistent key length
 * regardless of the input secret length.
 * 
 * @param {string} secret - The user-provided secret passphrase
 * @returns {Buffer} 32-byte encryption key
 */
function computeEncryptionKey(secret) {
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts plaintext content using AES-256-CBC with a derived key.
 * Generates a random IV for each operation to ensure unique ciphertexts.
 * 
 * @param {string} plainText - Content to encrypt
 * @param {string} secret - Secret passphrase for key derivation
 * @returns {{ iv: string, ciphertext: string }} Hex-encoded IV and ciphertext
 */
function encipherContent(plainText, secret) {
  const derivedKey = computeEncryptionKey(secret);
  const initVector = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", derivedKey, initVector);

  let encryptedData = cipher.update(plainText, "utf8", "hex");
  encryptedData += cipher.final("hex");

  return {
    iv: initVector.toString("hex"),
    ciphertext: encryptedData,
  };
}

/**
 * Decrypts AES-256-CBC encrypted content back to plaintext
 * using the same secret that was used for encryption.
 * 
 * @param {string} ciphertext - Hex-encoded encrypted content
 * @param {string} ivHex - Hex-encoded initialization vector
 * @param {string} secret - Secret passphrase for key derivation
 * @returns {string} Decrypted plaintext content
 */
function decipherContent(ciphertext, ivHex, secret) {
  const derivedKey = computeEncryptionKey(secret);
  const initVector = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", derivedKey, initVector);

  let decryptedData = decipher.update(ciphertext, "hex", "utf8");
  decryptedData += decipher.final("utf8");

  return decryptedData;
}

/**
 * Generates a SHA-256 hash of the secret key to use as a unique
 * document identifier in the database. This allows note lookup
 * without storing the actual secret.
 * 
 * @param {string} secret - The user-provided secret passphrase
 * @returns {string} Hex-encoded SHA-256 hash
 */
function generateNoteIdentifier(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

module.exports = { encipherContent, decipherContent, generateNoteIdentifier };

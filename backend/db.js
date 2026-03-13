/**
 * PrimeChat Database Connection Module
 * 
 * Establishes a persistent connection to MongoDB using Mongoose.
 * Uses the MONGO_URI environment variable for the connection string.
 * 
 * @module DatabaseConnection
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: "./.env" });

/** Database name used for all PrimeChat collections */
const DB_NAME = "primechat-db";

/**
 * Initializes the MongoDB connection with configured options.
 * Logs the connected host on success or terminates the process on failure.
 */
const initializeDatabase = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      dbName: DB_NAME,
    });

    console.log(`✅ PrimeChat DB connected: ${connection.connection.host}`);
  } catch (connectionError) {
    console.error(`❌ Database connection failed: ${connectionError.message}`);
    process.exit(1);
  }
};

module.exports = initializeDatabase;

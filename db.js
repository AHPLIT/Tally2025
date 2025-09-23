// db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const DBSOURCE = path.join(__dirname, "tally.db");

// Ensure the current directory is writable
try {
  fs.accessSync(__dirname, fs.constants.W_OK);
} catch (err) {
  console.error("Directory not writable:", __dirname);
  process.exit(1);
}

// Open or create the database
const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    console.error("Could not connect to database:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Connected to SQLite DB");

    // Create the tallies table if it doesn't exist
    db.run(
      `CREATE TABLE IF NOT EXISTS tallies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department TEXT,
        qType TEXT,
        referral INTEGER,
        notes TEXT,
        feedback TEXT,
        timestamp TEXT
      )`,
      (err) => {
        if (err) {
          console.error("Table creation error:", err.message);
        } else {
          console.log("✅ Table 'tallies' ready");
        }
      }
    );
  }
});

module.exports = db;

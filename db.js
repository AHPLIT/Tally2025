const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DBSOURCE = path.join(__dirname, "tally.db");

const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    console.error("Could not connect to database", err);
  } else {
    console.log("Connected to SQLite DB");

    db.run(
      `CREATE TABLE IF NOT EXISTS tallies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department TEXT,
        qType TEXT,
        referral INTEGER,
        notes TEXT,
        timestamp TEXT
      )`,
      (err) => {
        if (err) {
          console.error("Table creation error", err);
        } else {
          console.log("Table ready");
        }
      }
    );
  }
});

module.exports = db;

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
    // create the menus table if it doesn't exist
    db.run(
      `CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department TEXT,
      item_name TEXT
      )`,
      (err) => {
        if (err) {
          console.error("Table creation error (menus):", err.message);
        } else {
          console.log("Table 'menus' ready!");

          // seed default value only if table is empty
          db.get("SELECT COUNT(*) AS count FROM menus", (err, row) => {
            if (err) {
              console.error("Menu count check error:", err.message);
              return;
            }

            if (row.count == 0) {
              console.log("Seeding default department menu options...");
              const defaultMenus = [
                ["Adult Services", "Research"],
                ["Adult Services", "Patron Accounts"],
                ["Adult Services", "Reading Challenges/Beanstack"],
                ["Adult Services", "Programs"],
                ["Adult Services", "Room Bookings"],
                ["Adult Services", "Collections"],
                ["Adult Services", "Technology"],
                ["Adult Services", "Other"],

                ["Youth Services", "Collections"],
                ["Youth Services", "Programs"],
                ["Youth Services", "Reading Challenges/Beanstack"],
                ["Youth Services", "Scavenger Hunts"],
                ["Youth Services", "Patron Accounts"],
                ["Youth Services", "Technology"],
                ["Youth Services", "Other"],

                ["Circulation", "Patron Accounts"],
                ["Circulation", "Fees"],
                ["Circulation", "Lockers/Self Checks"],
                ["Circulation", "Programs"],
                ["Circulation", "Collections"],
                ["Circulation", "Technology"],
                ["Circulation", "Other"],

                ["IT Department", "Printer/Scanner"],
                ["IT Department", "Personal Device Help"],
                ["IT Department", "Library Computer"],
                ["IT Department", "Library Digital Services"],
                [("IT Department", "Room Bookings")],
                ["IT Department", "1-on-1"],
                ["IT Department", "Other"],
              ];

              const stmt = db.prepare("INSERT INTO menus (department, item_name) VALUES (?, ?)");
              defaultMenus.forEach(([deprecate, item]) => stmt.run(deprecate, item));
              stmt.finalize(() => console.log("Default menus seeded successfully"));
            } else {
              console.log(`Menus table already has ${row.count} entries`);
            }
          })
        }
      }
    )


  }
});

module.exports = db;

const express = require("express");
const path = require("path");
const db = require("./db"); // your DB module
const ExcelJS = require("exceljs");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to format ISO date string to MM/DD/YYYY
function formatDateISOToMMDDYYYY(isoString) {
  const d = new Date(isoString);
  const mm = String(d.getMonth() + 1).padStart(2, "0"); // Months start at 0
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

app.get("/", (req, res) => {
  console.log("Serving index.html");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, "public")));

// API route: Add new tally
app.post("/api/tally", (req, res) => {
  const { department, qType, referral, notes, timestamp } = req.body;

  if (!department || !qType || !timestamp) {
    return res.json({ success: false, error: "Missing required fields" });
  }

  const sql = `INSERT INTO tallies (department, qType, referral, notes, timestamp)
               VALUES (?, ?, ?, ?, ?)`;
  const params = [department, qType, referral ? 1 : 0, notes || "", timestamp];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("DB insert error:", err);
      return res.json({ success: false, error: err.message });
    }
    res.json({ success: true, id: this.lastID });
  });
});

// API route: Get tally reports (with optional filters)
app.get("/api/tally", (req, res) => {
  let { start, end, department } = req.query;

  let sql = "SELECT * FROM tallies WHERE 1=1";
  const params = [];

  if (start) {
    sql += " AND timestamp >= ?";
    params.push(start);
  }
  if (end) {
    sql += " AND timestamp <= ?";
    params.push(end);
  }
  if (department && department.toLowerCase() !== "all") {
    sql += " AND department = ?";
    params.push(department);
  }

  sql += " ORDER BY timestamp DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("DB select error:", err);
      return res.json({ success: false, error: err.message });
    }

    // Format timestamps before sending response
    const formattedRows = rows.map((row) => ({
      ...row,
      timestamp: formatDateISOToMMDDYYYY(row.timestamp),
    }));

    res.json(formattedRows);
  });
});

// API route: Export report to Excel
app.get("/api/tally/export", async (req, res) => {
  let { start, end, department } = req.query;

  let sql = "SELECT * FROM tallies WHERE 1=1";
  const params = [];

  if (start) {
    sql += " AND timestamp >= ?";
    params.push(start);
  }
  if (end) {
    sql += " AND timestamp <= ?";
    params.push(end);
  }
  if (department && department.toLowerCase() !== "all") {
    sql += " AND department = ?";
    params.push(department);
  }

  sql += " ORDER BY timestamp DESC";

  try {
    db.all(sql, params, async (err, rows) => {
      if (err) {
        console.error("Export query error:", err);
        return res.status(500).send("Database error");
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Tally Report");

      worksheet.columns = [
        { header: "Department", key: "department", width: 20 },
        { header: "Interaction Type", key: "qType", width: 20 },
        { header: "Referral", key: "referral", width: 10 },
        { header: "Notes", key: "notes", width: 30 },
        { header: "Timestamp", key: "timestamp", width: 25 },
      ];

      rows.forEach((row) => {
        worksheet.addRow({
          department: row.department,
          qType: row.qType,
          referral: row.referral ? "Yes" : "No",
          notes: row.notes,
          // Format timestamp for Excel export too
          timestamp: formatDateISOToMMDDYYYY(row.timestamp),
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=tally_report.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    });
  } catch (err) {
    console.error("Excel export failed:", err);
    res.status(500).send("Failed to export report");
  }
});

// Keep Node event loop alive explicitly
setInterval(() => {}, 1000 * 60);

app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});

process.on("exit", (code) => {
  console.log(`Process exit event with code: ${code}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// server.js
const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Add new tally
app.post("/api/tally", (req, res) => {
  const { department, qType, referral, notes, feedback, timestamp } = req.body;

  if (!department || !qType || !timestamp) {
    return res.json({ success: false, error: "Missing required fields" });
  }

  const sql = `INSERT INTO tallies (department, qType, referral, notes, feedback, timestamp)
               VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [
    department,
    qType,
    referral ? 1 : 0,
    notes || "",
    feedback || "",
    timestamp,
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("DB insert error:", err.message);
      return res.json({ success: false, error: err.message });
    }
    res.json({ success: true, id: this.lastID });
  });
});

// Get tallies
app.get("/api/tally", (req, res) => {
  const { start, end, department } = req.query;
  let sql = "SELECT * FROM tallies WHERE 1=1";
  const params = [];

  if (start) {
    sql += " AND date(timestamp) >= date(?)";
    params.push(start);
  }
  if (end) {
    sql += " AND date(timestamp) <= date(?)";
    params.push(end);
  }
  if (department && department.toLowerCase() !== "all") {
    sql += " AND department = ?";
    params.push(department);
  }

  sql += " ORDER BY timestamp DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("DB select error:", err.message);
      return res.json({ success: false, error: err.message });
    }

    const formatted = rows.map((row) => {
      const d = new Date(row.timestamp);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = d.getFullYear();
      return { ...row, timestamp: `${mm}/${dd}/${yyyy}` };
    });

    res.json(formatted);
  });
});

// Export tallies to CSV
app.get("/api/tally/export", (req, res) => {
  const { start, end, department } = req.query;
  let sql = "SELECT * FROM tallies WHERE 1=1";
  const params = [];

  if (start) {
    sql += " AND date(timestamp) >= date(?)";
    params.push(start);
  }
  if (end) {
    sql += " AND date(timestamp) <= date(?)";
    params.push(end);
  }
  if (department && department.toLowerCase() !== "all") {
    sql += " AND department = ?";
    params.push(department);
  }

  sql += " ORDER BY timestamp DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("DB export error:", err.message);
      return res.status(500).send("Error generating export");
    }

    const header = [
      "ID",
      "Department",
      "Interaction Type",
      "Referral",
      "Notes",
      "Feedback",
      "Timestamp",
    ].join(",");
    const dataRows = rows.map(
      (r) =>
        `${r.id},${r.department},${r.qType},${r.referral ? "Yes" : "No"},"${
          r.notes
        }","${r.feedback}",${r.timestamp}`
    );

    const totalLabel =
      department && department.toLowerCase() !== "all"
        ? `Total for ${department}`
        : "Grand Total";

    const csv = [
      header,
      ...dataRows,
      `${totalLabel},${rows.length} interactions`,
    ].join("\r\n");

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=tally_report.csv"
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.send(csv);
  });
});

// Get feedback (optional)
app.get("/api/feedback", (req, res) => {
  const sql =
    "SELECT feedback, timestamp FROM tallies WHERE feedback != '' ORDER BY timestamp DESC";
  db.all(sql, [], (err, rows) => {
    if (err) return res.json([]);
    const formatted = rows.map((row) => {
      const d = new Date(row.timestamp);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = d.getFullYear();
      return { feedback: row.feedback, timestamp: `${mm}/${dd}/${yyyy}` };
    });
    res.json(formatted);
  });
});

// Start server
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);

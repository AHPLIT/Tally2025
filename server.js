const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ➤ Add new tally entry
app.post("/api/tally", (req, res) => {
  const { department, qType, referral, notes, feedback } = req.body;
  if (!department || !qType)
    return res.json({ success: false, error: "Missing required fields" });

  // Store timestamp in ISO format
  const timestamp = new Date().toISOString().replace("T", " ").replace("Z", "");

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
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// ➤ Get tallies (with optional date & department filters)
app.get("/api/tally", (req, res) => {
  const { start, end, department } = req.query;
  let sql = "SELECT * FROM tallies WHERE 1=1";
  const params = [];

  if (start) {
    sql += " AND timestamp >= ?";
    params.push(start + " 00:00:00");
  }
  if (end) {
    sql += " AND timestamp <= ?";
    params.push(end + " 23:59:59");
  }
  if (department && department.toLowerCase() !== "all") {
    sql += " AND department = ?";
    params.push(department);
  }

  sql += " ORDER BY timestamp DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.json({ success: false, error: err.message });

    const formatted = rows.map((row) => ({
      ...row,
      timestamp: new Date(row.timestamp).toLocaleDateString("en-US"),
    }));

    res.json(formatted);
  });
});

// ➤ Get feedback (with same filters as interactions)
app.get("/api/feedback", (req, res) => {
  const { start, end, department } = req.query;
  let sql = "SELECT feedback, timestamp, department FROM tallies WHERE 1=1";
  const params = [];

  if (start) {
    sql += " AND timestamp >= ?";
    params.push(start + " 00:00:00");
  }
  if (end) {
    sql += " AND timestamp <= ?";
    params.push(end + " 23:59:59");
  }
  if (department && department.toLowerCase() !== "all") {
    sql += " AND department = ?";
    params.push(department);
  }

  sql += " ORDER BY timestamp DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.json([]);
    const formatted = rows.map((row) => ({
      feedback: row.feedback,
      timestamp: new Date(row.timestamp).toLocaleDateString("en-US"),
    }));
    res.json(formatted);
  });
});

// ➤ Get interaction types
app.get("/api/types/:department", (req, res) => {
  db.all(
    "SELECT item_name FROM menus WHERE department = ? ORDER BY item_name ASC",
    [req.params.department],
    (err, rows) => {
      if (err) return res.json([]);
      res.json(rows.map((r) => r.item_name));
    }
  );
});

// ➤ Export CSV
app.get("/api/tally/export", (req, res) => {
  const { start, end, department } = req.query;
  let sql = "SELECT * FROM tallies WHERE 1=1";
  const params = [];

  if (start) {
    sql += " AND timestamp >= ?";
    params.push(start + " 00:00:00");
  }
  if (end) {
    sql += " AND timestamp <= ?";
    params.push(end + " 23:59:59");
  }
  if (department && department.toLowerCase() !== "all") {
    sql += " AND department = ?";
    params.push(department);
  }

  sql += " ORDER BY timestamp DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).send("Error generating export");

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
    const csv = [header, ...dataRows, `Total interactions,${rows.length}`].join(
      "\r\n"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=tally_report.csv"
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.send(csv);
  });
});

app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);

// =================================================
// Adore Hair – server.js (ES MODULE FIX)
// =================================================

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// __dirname replacement for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================
// MIDDLEWARE
// ============================
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ============================
// SIMPLE DB (เดิม)
// ============================
const DB_PATH = path.join(__dirname, "data.json");

function readDB() {
  if (!fs.existsSync(DB_PATH)) return { bookings: [] };
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ============================
// LOGIN
// ============================
app.post("/api/login", (req, res) => {
  const { pin } = req.body;
  if (pin === "1234") return res.sendStatus(200);
  res.sendStatus(401);
});

// ============================
// GET BOOKINGS
// ============================
app.get("/api/bookings", (req, res) => {
  const { date } = req.query;
  const db = readDB();
  const result = db.bookings.filter(b => b.date === date);
  res.json(result);
});

// ============================
// ADD BOOKING
// ============================
app.post("/api/bookings", (req, res) => {
  const db = readDB();
  const booking = { id: Date.now(), ...req.body };
  db.bookings.push(booking);
  writeDB(db);
  res.json(booking);
});

// ============================
// UPDATE BOOKING
// ============================
app.put("/api/bookings/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  db.bookings = db.bookings.map(b =>
    b.id === id ? { ...b, ...req.body } : b
  );
  writeDB(db);
  res.sendStatus(200);
});

// ============================
// DELETE BOOKING
// ============================
app.delete("/api/bookings/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  db.bookings = db.bookings.filter(b => b.id !== id);
  writeDB(db);
  res.sendStatus(200);
});

// ============================
// SPA FALLBACK
// ============================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============================
// START SERVER
// ============================
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

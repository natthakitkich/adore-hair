import express from "express";
import session from "express-session";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const PIN = process.env.ADORE_PIN || "1234";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "adore-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: "lax" }
  })
);

// ====== PERSIST (JSON FILE) ======
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "bookings.json");

function ensureDBFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ id: 1, bookings: [] }, null, 2));
  }
}
function readDB() {
  ensureDBFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const db = JSON.parse(raw);
    return {
      id: Number(db.id || 1),
      bookings: Array.isArray(db.bookings) ? db.bookings : []
    };
  } catch {
    return { id: 1, bookings: [] };
  }
}
function writeDB(db) {
  ensureDBFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// ====== TIMES (13:00–22:00, every hour) ======
const TIMES = [];
for (let h = 13; h <= 22; h++) TIMES.push(`${String(h).padStart(2, "0")}:00`);

// ====== AUTH ======
app.get("/api/me", (req, res) => {
  if (req.session.auth) return res.json({ ok: true });
  res.status(401).json({ error: "unauthorized" });
});

app.post("/api/login", (req, res) => {
  const pin = String(req.body?.pin ?? "");
  if (pin === String(PIN)) {
    req.session.auth = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "wrong pin" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

function guard(req, res, next) {
  if (!req.session.auth) return res.status(401).json({ error: "unauthorized" });
  next();
}

// ====== META (no guard so time dropdown always loads) ======
app.get("/api/meta", (req, res) => {
  res.json({ times: TIMES });
});

// ====== SUMMARY BY DATE ======
app.get("/api/summary", guard, (req, res) => {
  const date = String(req.query.date || "");
  const db = readDB();
  const list = db.bookings
    .filter(b => b.date === date)
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));

  res.json({
    counts: {
      male: list.filter(b => b.category === "male").length,
      female: list.filter(b => b.category === "female").length,
      total: list.length
    },
    detail: list
  });
});

// ====== MONTH SUMMARY (for monthly table) ======
app.get("/api/month", guard, (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month); // 1-12
  if (!year || !month || month < 1 || month > 12) {
    return res.status(400).json({ error: "bad year/month" });
  }

  const mm = String(month).padStart(2, "0");
  const prefix = `${year}-${mm}-`;

  const db = readDB();

  // per day summary: { [YYYY-MM-DD]: { male, female, total } }
  const byDate = {};

  for (const b of db.bookings) {
    if (typeof b.date !== "string") continue;
    if (!b.date.startsWith(prefix)) continue;

    if (!byDate[b.date]) byDate[b.date] = { male: 0, female: 0, total: 0 };
    if (b.category === "male") byDate[b.date].male += 1;
    else byDate[b.date].female += 1;
    byDate[b.date].total += 1;
  }

  // return sorted list
  const list = Object.entries(byDate)
    .map(([date, counts]) => ({ date, counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({ year, month, list });
});

// ====== CREATE BOOKING (no duplicate for same date+time+category) ======
app.post("/api/bookings", guard, (req, res) => {
  const payload = req.body || {};
  const date = String(payload.date || "");
  const category = payload.category === "female" ? "female" : "male";
  const time = String(payload.time || "");
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const service = String(payload.service || "").trim();
  const note = String(payload.note || "").trim();

  if (!date || !time || !name || !phone || !service) {
    return res.status(400).json({ error: "missing fields" });
  }
  if (!TIMES.includes(time)) {
    return res.status(400).json({ error: "invalid time" });
  }

  const db = readDB();
  const dup = db.bookings.find(b => b.date === date && b.time === time && b.category === category);
  if (dup) return res.status(409).json({ error: "time already booked for this category" });

  const newBooking = { id: db.id++, date, category, time, name, phone, service, note };
  db.bookings.push(newBooking);
  writeDB(db);

  res.json({ ok: true, booking: newBooking });
});

// ====== UPDATE BOOKING ======
app.put("/api/bookings/:id", guard, (req, res) => {
  const bookingId = Number(req.params.id);
  const payload = req.body || {};

  const date = String(payload.date || "");
  const category = payload.category === "female" ? "female" : "male";
  const time = String(payload.time || "");
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const service = String(payload.service || "").trim();
  const note = String(payload.note || "").trim();

  if (!bookingId) return res.status(400).json({ error: "bad id" });
  if (!date || !time || !name || !phone || !service) return res.status(400).json({ error: "missing fields" });
  if (!TIMES.includes(time)) return res.status(400).json({ error: "invalid time" });

  const db = readDB();
  const idx = db.bookings.findIndex(b => b.id === bookingId);
  if (idx < 0) return res.status(404).json({ error: "not found" });

  const dup = db.bookings.find(b =>
    b.id !== bookingId &&
    b.date === date &&
    b.time === time &&
    b.category === category
  );
  if (dup) return res.status(409).json({ error: "time already booked for this category" });

  db.bookings[idx] = { id: bookingId, date, category, time, name, phone, service, note };
  writeDB(db);

  res.json({ ok: true, booking: db.bookings[idx] });
});

// ====== DELETE BOOKING ======
app.delete("/api/bookings/:id", guard, (req, res) => {
  const bookingId = Number(req.params.id);
  const db = readDB();
  const before = db.bookings.length;

  db.bookings = db.bookings.filter(b => b.id !== bookingId);
  if (db.bookings.length === before) return res.status(404).json({ error: "not found" });

  writeDB(db);
  res.json({ ok: true });
});

// ====== STATIC ======
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log("Server running on port", PORT));

import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

const PIN = process.env.ADORE_PIN || "1234";
const SESSION_SECRET = process.env.SESSION_SECRET || "adore-secret";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    }
  })
);

function guard(req, res, next) {
  if (!req.session?.auth) return res.status(401).json({ error: "unauthorized" });
  next();
}

// ====== TIME OPTIONS (13:00 - 22:00 every 1 hour) ======
const TIMES = [];
for (let h = 13; h <= 22; h++) TIMES.push(`${String(h).padStart(2, "0")}:00`);

// ====== IN-MEMORY DATA ======
let bookings = []; // { id, date, category, time, name, phone, service, note, createdAt }
let nextId = 1;

// ====== AUTH API ======
app.get("/api/me", (req, res) => {
  if (req.session?.auth) return res.json({ ok: true });
  res.status(401).json({ error: "unauthorized" });
});

app.post("/api/login", (req, res) => {
  const pin = String(req.body?.pin ?? "");
  if (pin === PIN) {
    req.session.auth = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "wrong pin" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ====== APP API (requires auth) ======
app.get("/api/meta", guard, (req, res) => {
  res.json({ times: TIMES });
});

app.get("/api/summary", guard, (req, res) => {
  const date = String(req.query?.date ?? "");
  const list = bookings
    .filter(b => b.date === date)
    .sort((a, b) => (a.time > b.time ? 1 : -1));

  res.json({
    counts: {
      male: list.filter(b => b.category === "male").length,
      female: list.filter(b => b.category === "female").length,
      total: list.length
    },
    detail: list
  });
});

// Create booking (NO duplicate time within SAME category+date)
app.post("/api/bookings", guard, (req, res) => {
  const date = String(req.body?.date ?? "");
  const category = String(req.body?.category ?? "");
  const time = String(req.body?.time ?? "");
  const name = String(req.body?.name ?? "").trim();
  const phone = String(req.body?.phone ?? "").trim();
  const service = String(req.body?.service ?? "").trim();
  const note = String(req.body?.note ?? "").trim();

  if (!date || !category || !time || !name || !phone || !service) {
    return res.status(400).json({ error: "กรอกข้อมูลให้ครบ" });
  }
  if (!["male", "female"].includes(category)) {
    return res.status(400).json({ error: "ประเภทไม่ถูกต้อง" });
  }
  if (!TIMES.includes(time)) {
    return res.status(400).json({ error: "เวลาไม่ถูกต้อง" });
  }

  const exists = bookings.some(b => b.date === date && b.category === category && b.time === time);
  if (exists) {
    return res.status(409).json({ error: "เวลานี้ถูกจองแล้ว (ประเภทเดียวกัน)" });
  }

  const item = {
    id: nextId++,
    date,
    category,
    time,
    name,
    phone,
    service,
    note,
    createdAt: new Date().toISOString()
  };
  bookings.push(item);
  res.json({ ok: true, booking: item });
});

// Edit booking (still enforce same rule)
app.put("/api/bookings/:id", guard, (req, res) => {
  const id = Number(req.params.id);
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  const date = String(req.body?.date ?? bookings[idx].date);
  const category = String(req.body?.category ?? bookings[idx].category);
  const time = String(req.body?.time ?? bookings[idx].time);
  const name = String(req.body?.name ?? bookings[idx].name).trim();
  const phone = String(req.body?.phone ?? bookings[idx].phone).trim();
  const service = String(req.body?.service ?? bookings[idx].service).trim();
  const note = String(req.body?.note ?? bookings[idx].note ?? "").trim();

  if (!date || !category || !time || !name || !phone || !service) {
    return res.status(400).json({ error: "กรอกข้อมูลให้ครบ" });
  }
  if (!["male", "female"].includes(category)) {
    return res.status(400).json({ error: "ประเภทไม่ถูกต้อง" });
  }
  if (!TIMES.includes(time)) {
    return res.status(400).json({ error: "เวลาไม่ถูกต้อง" });
  }

  const exists = bookings.some(b => b.id !== id && b.date === date && b.category === category && b.time === time);
  if (exists) {
    return res.status(409).json({ error: "เวลานี้ถูกจองแล้ว (ประเภทเดียวกัน)" });
  }

  bookings[idx] = { ...bookings[idx], date, category, time, name, phone, service, note };
  res.json({ ok: true, booking: bookings[idx] });
});

app.delete("/api/bookings/:id", guard, (req, res) => {
  const id = Number(req.params.id);
  const before = bookings.length;
  bookings = bookings.filter(b => b.id !== id);
  if (bookings.length === before) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// ====== STATIC ======
app.use(express.static(path.join(__dirname, "public")));

// Always serve app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

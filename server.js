import express from "express";
import session from "express-session";
import path from "path";
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
    saveUninitialized: false
  })
);

// ===== AUTH =====
app.get("/api/me", (req, res) => {
  if (req.session.auth) return res.json({ ok: true });
  res.status(401).json({ error: "unauthorized" });
});

app.post("/api/login", (req, res) => {
  if (req.body.pin === PIN) {
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

// ===== DATA =====
// in-memory (รีสตาร์ทเซิร์ฟเวอร์ข้อมูลจะหาย — ถ้าต้องการถาวรค่อยเพิ่ม DB ทีหลัง)
let bookings = [];
let nextId = 1;

// ===== TIME SLOTS (hourly 13:00..22:00 incl) =====
const TIMES = [];
for (let h = 13; h <= 22; h++) TIMES.push(`${String(h).padStart(2, "0")}:00`);

// ===== HELPERS =====
function isValidCategory(cat) {
  return cat === "male" || cat === "female";
}
function isValidDate(date) {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
}
function isValidTime(time) {
  return TIMES.includes(time);
}
function normalizePayload(body) {
  return {
    date: String(body.date || ""),
    category: String(body.category || ""),
    time: String(body.time || ""),
    name: String(body.name || "").trim(),
    phone: String(body.phone || "").trim(),
    service: String(body.service || "").trim(),
    note: String(body.note || "").trim()
  };
}
function findConflict({ date, category, time }, ignoreId = null) {
  return bookings.find(
    (b) =>
      b.date === date &&
      b.category === category &&
      b.time === time &&
      (ignoreId == null || b.id !== ignoreId)
  );
}

// ===== API =====
app.get("/api/meta", guard, (req, res) => {
  res.json({ times: TIMES });
});

app.get("/api/summary", guard, (req, res) => {
  const date = String(req.query.date || "");
  const list = bookings
    .filter((b) => b.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));

  res.json({
    counts: {
      male: list.filter((b) => b.category === "male").length,
      female: list.filter((b) => b.category === "female").length,
      total: list.length
    },
    detail: list
  });
});

app.post("/api/bookings", guard, (req, res) => {
  const payload = normalizePayload(req.body);

  if (!isValidDate(payload.date)) return res.status(400).json({ error: "invalid date" });
  if (!isValidCategory(payload.category)) return res.status(400).json({ error: "invalid category" });
  if (!isValidTime(payload.time)) return res.status(400).json({ error: "invalid time" });
  if (!payload.name) return res.status(400).json({ error: "กรุณากรอกชื่อลูกค้า" });

  // ✅ กันจองซ้ำเฉพาะ "ประเภทเดียวกัน"
  const conflict = findConflict(payload);
  if (conflict) return res.status(409).json({ error: "ช่วงเวลานี้ถูกจองแล้ว (ประเภทเดียวกัน)" });

  const row = { id: nextId++, ...payload };
  bookings.push(row);
  res.json({ ok: true, booking: row });
});

app.put("/api/bookings/:id", guard, (req, res) => {
  const id = Number(req.params.id);
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx < 0) return res.status(404).json({ error: "not found" });

  const payload = normalizePayload(req.body);

  if (!isValidDate(payload.date)) return res.status(400).json({ error: "invalid date" });
  if (!isValidCategory(payload.category)) return res.status(400).json({ error: "invalid category" });
  if (!isValidTime(payload.time)) return res.status(400).json({ error: "invalid time" });
  if (!payload.name) return res.status(400).json({ error: "กรุณากรอกชื่อลูกค้า" });

  const conflict = findConflict(payload, id);
  if (conflict) return res.status(409).json({ error: "ช่วงเวลานี้ถูกจองแล้ว (ประเภทเดียวกัน)" });

  bookings[idx] = { id, ...payload };
  res.json({ ok: true, booking: bookings[idx] });
});

app.delete("/api/bookings/:id", guard, (req, res) => {
  const id = Number(req.params.id);
  bookings = bookings.filter((b) => b.id !== id);
  res.json({ ok: true });
});

// ===== STATIC =====
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import cookieSession from "cookie-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const ADORE_PIN = process.env.ADORE_PIN || "1234";
const SESSION_SECRET = process.env.SESSION_SECRET || "change_this_secret_in_production";

const TIMES = ["13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00"];
const CATEGORIES = ["male", "female"];

const db = new Database(process.env.SQLITE_PATH || "adore_queue.db");
db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    time TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT "",
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking
  ON bookings(date, category, time);

  CREATE INDEX IF NOT EXISTS idx_date ON bookings(date);
`);

app.set("trust proxy", 1);
app.use(express.json({ limit: "256kb" }));

app.use(cookieSession({
  name: "adore_session",
  keys: [SESSION_SECRET],
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production"
}));

app.use(express.static(path.join(__dirname, "public"), { maxAge: "1h" }));

function isValidDate(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function isValidCategory(c) { return CATEGORIES.includes(c); }
function isValidTime(t) { return TIMES.includes(t); }
function sanitizePhone(p) { return String(p || "").trim().replace(/\s+/g, ""); }
function requireAuth(req, res, next) {
  if (req.session?.auth === true) return next();
  return res.status(401).json({ error: "unauthorized" });
}

app.use("/api", (req, res, next) => {
  const openPaths = ["/login", "/me", "/logout", "/meta"];
  if (openPaths.includes(req.path)) return next();
  return requireAuth(req, res, next);
});

app.get("/api/meta", (req, res) => {
  res.json({
    brand: "Adore hair",
    open: "13:00",
    close: "22:00",
    times: TIMES,
    categories: { male: "ตัดผมผู้ชาย", female: "ทำผมผู้หญิง" }
  });
});

app.get("/api/me", (req, res) => {
  if (req.session?.auth === true) return res.json({ ok: true });
  res.status(401).json({ error: "unauthorized" });
});

app.post("/api/login", (req, res) => {
  const pin = String(req.body?.pin || "").trim();
  if (pin && pin === ADORE_PIN) {
    req.session.auth = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "PIN ไม่ถูกต้อง" });
});

app.post("/api/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.post("/api/bookings", (req, res) => {
  const { date, category, time, name, phone, service, note } = req.body || {};

  if (!isValidDate(date)) return res.status(400).json({ error: "date ต้องเป็น YYYY-MM-DD" });
  if (!isValidCategory(category)) return res.status(400).json({ error: "category ต้องเป็น male หรือ female" });
  if (!isValidTime(time)) return res.status(400).json({ error: "time ต้องเป็น 13:00–22:00 เท่านั้น" });

  const nm = String(name || "").trim();
  const ph = sanitizePhone(phone);
  const sv = String(service || "").trim();
  const nt = String(note || "").trim();

  if (nm.length < 2) return res.status(400).json({ error: "กรุณากรอกชื่อผู้จอง" });
  if (ph.length < 8) return res.status(400).json({ error: "กรุณากรอกเบอร์โทรให้ถูกต้อง" });
  if (sv.length < 2) return res.status(400).json({ error: "กรุณาระบุทำอะไร (service)" });

  try {
    const info = db.prepare(`
      INSERT INTO bookings(date, category, time, name, phone, service, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(date, category, time, nm, ph, sv, nt);

    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    if (String(e?.message || "").includes("UNIQUE")) {
      return res.status(409).json({ error: "เวลานี้ในประเภทนี้ถูกจองแล้ว (วันเดียวกันห้ามซ้ำ)" });
    }
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/bookings/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "id ไม่ถูกต้อง" });

  const { date, category, time, name, phone, service, note } = req.body || {};

  if (!isValidDate(date)) return res.status(400).json({ error: "date ต้องเป็น YYYY-MM-DD" });
  if (!isValidCategory(category)) return res.status(400).json({ error: "category ต้องเป็น male หรือ female" });
  if (!isValidTime(time)) return res.status(400).json({ error: "time ต้องเป็น 13:00–22:00 เท่านั้น" });

  const nm = String(name || "").trim();
  const ph = sanitizePhone(phone);
  const sv = String(service || "").trim();
  const nt = String(note || "").trim();

  if (nm.length < 2) return res.status(400).json({ error: "กรุณากรอกชื่อผู้จอง" });
  if (ph.length < 8) return res.status(400).json({ error: "กรุณากรอกเบอร์โทรให้ถูกต้อง" });
  if (sv.length < 2) return res.status(400).json({ error: "กรุณาระบุทำอะไร (service)" });

  const exists = db.prepare(`SELECT id FROM bookings WHERE id = ?`).get(id);
  if (!exists) return res.status(404).json({ error: "ไม่พบรายการนี้" });

  try {
    db.prepare(`
      UPDATE bookings
      SET date = ?, category = ?, time = ?, name = ?, phone = ?, service = ?, note = ?
      WHERE id = ?
    `).run(date, category, time, nm, ph, sv, nt, id);

    res.json({ ok: true });
  } catch (e) {
    if (String(e?.message || "").includes("UNIQUE")) {
      return res.status(409).json({ error: "เวลานี้ในประเภทนี้ถูกจองแล้ว (วันเดียวกันห้ามซ้ำ)" });
    }
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/bookings/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "id ไม่ถูกต้อง" });
  const info = db.prepare(`DELETE FROM bookings WHERE id = ?`).run(id);
  if (info.changes === 0) return res.status(404).json({ error: "ไม่พบรายการนี้" });
  res.json({ ok: true });
});

app.get("/api/summary", (req, res) => {
  const date = req.query.date;
  if (!isValidDate(date)) return res.status(400).json({ error: "date ต้องเป็น YYYY-MM-DD" });

  const countsRows = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM bookings
    WHERE date = ?
    GROUP BY category
  `).all(date);

  const detail = db.prepare(`
    SELECT id, time, category, name, phone, service, note
    FROM bookings
    WHERE date = ?
    ORDER BY time ASC, category ASC, created_at ASC
  `).all(date);

  const counts = { male: 0, female: 0, total: 0 };
  for (const r of countsRows) {
    counts[r.category] = r.count;
    counts.total += r.count;
  }

  res.json({ date, counts, detail });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Adore hair queue running on http://localhost:${PORT}`);
});

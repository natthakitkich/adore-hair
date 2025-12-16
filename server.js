import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const PIN = process.env.ADORE_PIN || "1234";

// ไทย = UTC+7 (ใช้แก้เวลาเพี้ยนใน iPhone Calendar)
const TZ_OFFSET_HOURS = 7;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "adore-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
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

// ===== DATA (in-memory) =====
// หมายเหตุ: ถ้ารีสตาร์ทเซิร์ฟเวอร์ข้อมูลจะหาย (ถ้าจะให้ถาวรต้องต่อ DB เช่น Supabase)
let bookings = [];
let id = 1;

// ===== TIMES (every 1 hour 13:00 - 22:00) =====
const TIMES = [];
for (let h = 13; h <= 22; h++) TIMES.push(`${String(h).padStart(2, "0")}:00`);

// ===== HELPERS =====
function pad2(n) {
  return String(n).padStart(2, "0");
}

function escapeICS(text = "") {
  return String(text)
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

// แปลง "YYYY-MM-DD" + "HH:MM" (เวลาไทย) -> UTC Z สำหรับ ICS
function toUtcZFromThai(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);

  const utc = new Date(Date.UTC(y, m - 1, d, hh - TZ_OFFSET_HOURS, mm, 0));
  const YYYY = utc.getUTCFullYear();
  const MM = pad2(utc.getUTCMonth() + 1);
  const DD = pad2(utc.getUTCDate());
  const H = pad2(utc.getUTCHours());
  const M = pad2(utc.getUTCMinutes());
  const S = pad2(utc.getUTCSeconds());
  return `${YYYY}${MM}${DD}T${H}${M}${S}Z`;
}

function addHoursToThaiTimeStr(timeStr, hoursToAdd) {
  const h = Number(timeStr.slice(0, 2));
  const nh = h + hoursToAdd;
  // ใช้งานจริงร้านปิด 22:00 ดังนั้นจบในวันเดียวพอ
  return `${pad2(nh)}:00`;
}

// ===== API =====
app.get("/api/meta", guard, (req, res) => {
  res.json({ times: TIMES });
});

app.get("/api/summary", guard, (req, res) => {
  const date = String(req.query.date || "");
  const list = bookings
    .filter((b) => b.date === date)
    .sort((a, b) => (a.time > b.time ? 1 : -1));

  res.json({
    counts: {
      male: list.filter((b) => b.category === "male").length,
      female: list.filter((b) => b.category === "female").length,
      total: list.length
    },
    detail: list
  });
});

// เดือนที่มีคิว -> ส่งกลับ list ของวันที่แบบ YYYY-MM-DD
app.get("/api/month", guard, (req, res) => {
  const month = String(req.query.month || ""); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "bad month" });

  const days = new Set();
  for (const b of bookings) {
    if (String(b.date || "").startsWith(month + "-")) days.add(b.date);
  }
  res.json({ days: Array.from(days).sort() });
});

// Create booking
app.post("/api/bookings", guard, (req, res) => {
  const payload = req.body || {};

  const date = String(payload.date || "");
  const category = String(payload.category || "");
  const time = String(payload.time || "");
  const name = String(payload.name || "").trim();

  const phone = String(payload.phone || "").trim();     // optional
  const service = String(payload.service || "").trim(); // optional
  const note = String(payload.note || "").trim();       // optional

  if (!date || !category || !time) return res.status(400).json({ error: "missing required fields" });
  if (!["male", "female"].includes(category)) return res.status(400).json({ error: "bad category" });
  if (!TIMES.includes(time)) return res.status(400).json({ error: "bad time" });
  if (!name) return res.status(400).json({ error: "กรุณากรอกชื่อลูกค้า" });

  const dup = bookings.find((b) => b.date === date && b.category === category && b.time === time);
  if (dup) return res.status(409).json({ error: "เวลานี้ถูกจองแล้ว (ประเภทเดียวกัน)" });

  const booking = { id: id++, date, category, time, name, phone, service, note };
  bookings.push(booking);

  res.json({ ok: true, booking });
});

// Update booking
app.put("/api/bookings/:id", guard, (req, res) => {
  const bid = Number(req.params.id);
  const idx = bookings.findIndex((b) => b.id === bid);
  if (idx < 0) return res.status(404).json({ error: "not found" });

  const payload = req.body || {};

  const date = String(payload.date || "");
  const category = String(payload.category || "");
  const time = String(payload.time || "");
  const name = String(payload.name || "").trim();

  const phone = String(payload.phone || "").trim();
  const service = String(payload.service || "").trim();
  const note = String(payload.note || "").trim();

  if (!date || !category || !time) return res.status(400).json({ error: "missing required fields" });
  if (!["male", "female"].includes(category)) return res.status(400).json({ error: "bad category" });
  if (!TIMES.includes(time)) return res.status(400).json({ error: "bad time" });
  if (!name) return res.status(400).json({ error: "กรุณากรอกชื่อลูกค้า" });

  const dup = bookings.find((b) => b.id !== bid && b.date === date && b.category === category && b.time === time);
  if (dup) return res.status(409).json({ error: "เวลานี้ถูกจองแล้ว (ประเภทเดียวกัน)" });

  bookings[idx] = { id: bid, date, category, time, name, phone, service, note };
  res.json({ ok: true, booking: bookings[idx] });
});

// Delete booking
app.delete("/api/bookings/:id", guard, (req, res) => {
  const bid = Number(req.params.id);
  bookings = bookings.filter((b) => b.id !== bid);
  res.json({ ok: true });
});

// ===== Calendar (.ics) =====
app.get("/api/calendar/:id", guard, (req, res) => {
  const bid = Number(req.params.id);
  const b = bookings.find((x) => x.id === bid);
  if (!b) return res.status(404).send("Not found");

  const startZ = toUtcZFromThai(b.date, b.time);
  const endThai = addHoursToThaiTimeStr(b.time, 1); // นัด 1 ชั่วโมง
  const endZ = toUtcZFromThai(b.date, endThai);

  const title = `${b.category === "male" ? "ตัดผมผู้ชาย" : "ทำผมผู้หญิง"} – Adore hair`;
  const descLines = [
    `ลูกค้า: ${b.name || "-"}`,
    `บริการ: ${b.service || "-"}`,
    `โทร: ${b.phone || "-"}`,
    `หมายเหตุ: ${b.note || "-"}`
  ];

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AdoreHair//Queue//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:adore-${b.id}@adore-hair`,
    `DTSTAMP:${toUtcZFromThai(b.date, "00:00")}`,
    `DTSTART:${startZ}`,
    `DTEND:${endZ}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(descLines.join("\n"))}`,
    "LOCATION:Adore hair",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="adore-queue-${b.id}.ics"`);
  res.send(ics);
});

// ===== STATIC =====
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log("Server running on port", PORT));

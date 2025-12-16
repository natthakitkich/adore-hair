import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const PIN = process.env.ADORE_PIN || "1234";

// ไทย = UTC+7 (เพื่อแก้ปัญหาเวลาเพี้ยนตอนทำ .ics)
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

// ====== AUTH ======
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

// ====== DATA (In-memory) ======
// ถ้าคุณต่อ Supabase แล้วค่อยสลับส่วนนี้ได้ (เดี๋ยวผมช่วยต่อให้ได้ต่อจากนี้)
let bookings = [];
let id = 1;

// ====== TIME OPTIONS (every 1 hour 13:00 - 22:00) ======
const TIMES = [];
for (let h = 13; h <= 22; h++) TIMES.push(`${String(h).padStart(2, "0")}:00`);

// ====== HELPERS ======
function pad2(n) {
  return String(n).padStart(2, "0");
}

// แปลง "YYYY-MM-DD" + "HH:MM" ที่เป็นเวลาไทย ให้กลายเป็น UTC (Z) สำหรับ ICS
function toUtcZFromThai(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);

  // เวลาไทย = UTC+7 => UTC = hh - 7
  const utc = new Date(Date.UTC(y, m - 1, d, hh - TZ_OFFSET_HOURS, mm, 0));
  const YYYY = utc.getUTCFullYear();
  const MM = pad2(utc.getUTCMonth() + 1);
  const DD = pad2(utc.getUTCDate());
  const H = pad2(utc.getUTCHours());
  const M = pad2(utc.getUTCMinutes());
  const S = pad2(utc.getUTCSeconds());
  return `${YYYY}${MM}${DD}T${H}${M}${S}Z`;
}

function escapeICS(text = "") {
  return String(text)
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

// ====== API ======
app.get("/api/meta", guard, (req, res) => {
  res.json({ times: TIMES });
});

app.get("/api/summary", guard, (req, res) => {
  const date = String(req.query.date || "");
  const list = bookings.filter((b) => b.date === date);

  res.json({
    counts: {
      male: list.filter((b) => b.category === "male").length,
      female: list.filter((b) => b.category === "female").length,
      total: list.length
    },
    detail: list
  });
});

// ใช้ทำ “ปฏิทินเลือกวัน” (เดือนปัจจุบัน) ให้รู้ว่าวันไหนมีคิวแล้ว
app.get("/api/month", guard, (req, res) => {
  const month = String(req.query.month || ""); // "YYYY-MM"
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "bad month" });

  const days = new Set();
  for (const b of bookings) {
    if (String(b.date || "").startsWith(month + "-")) days.add(b.date);
  }
  res.json({ days: Array.from(days).sort() });
});

// จอง: ห้ามเวลาซ้ำใน “ประเภทเดียวกัน” แต่ชาย/หญิงซ้ำเวลาได้
app.post("/api/bookings", guard, (req, res) => {
  const payload = req.body || {};
  const date = String(payload.date || "");
  const category = String(payload.category || "");
  const time = String(payload.time || "");

  if (!date || !category || !time) {
    return res.status(400).json({ error: "missing required fields" });
  }
  if (!["male", "female"].includes(category)) {
    return res.status(400).json({ error: "bad category" });
  }
  if (!TIMES.includes(time)) {
    return res.status(400).json({ error: "bad time" });
  }

  const dup = bookings.find((b) => b.date === date && b.category === category && b.time === time);
  if (dup) return res.status(409).json({ error: "เวลานี้ถูกจองแล้ว (ประเภทเดียวกัน)" });

  const booking = {
    id: id++,
    date,
    category,
    time,
    name: String(payload.name || "").trim(),
    phone: String(payload.phone || "").trim(),     // optional
    service: String(payload.service || "").trim(), // optional
    note: String(payload.note || "").trim()
  };

  if (!booking.name) return res.status(400).json({ error: "กรุณากรอกชื่อลูกค้า" });

  bookings.push(booking);
  res.json({ ok: true, booking });
});

app.delete("/api/bookings/:id", guard, (req, res) => {
  const bid = Number(req.params.id);
  bookings = bookings.filter((b) => b.id !== bid);
  res.json({ ok: true });
});

// ====== Calendar (.ics) ======
app.get("/api/calendar/:id", guard, (req, res) => {
  const bid = Number(req.params.id);
  const b = bookings.find((x) => x.id === bid);
  if (!b) return res.status(404).send("Not found");

  const startZ = toUtcZFromThai(b.date, b.time);
  // นัด 1 ชม.
  const endZ = toUtcZFromThai(b.date, `${pad2(Number(b.time.slice(0, 2)) + 1)}:00`.replace("23:00", "22:00"));

  const title =
    (b.category === "male" ? "ตัดผมผู้ชาย" : "ทำผมผู้หญิง") + " – Adore hair";

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

// ====== STATIC ======
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log("Server running on port", PORT));

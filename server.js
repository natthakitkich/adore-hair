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

// ====== DATA ======
let bookings = [];
let id = 1;

// เวลาแบบทุก 1 ชั่วโมง: 13:00 - 22:00 (รวม 22:00)
const TIMES = [];
for (let h = 13; h <= 22; h++) TIMES.push(`${String(h).padStart(2, "0")}:00`);

// ===== Helpers =====
function pad2(n) { return String(n).padStart(2, "0"); }

// YYYY-MM-DD + "HH:MM" -> "YYYYMMDDTHHMM00"
function toIcsLocal(dateStr, timeStr) {
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  const [HH, MM] = timeStr.split(":").map(Number);
  return `${yyyy}${pad2(mm)}${pad2(dd)}T${pad2(HH)}${pad2(MM)}00`;
}

// เพิ่ม 60 นาที
function addMinutesToTime(timeStr, minsToAdd) {
  const [HH, MM] = timeStr.split(":").map(Number);
  let total = HH * 60 + MM + minsToAdd;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${pad2(nh)}:${pad2(nm)}`;
}

function escapeIcsText(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// ====== API ======
app.get("/api/meta", guard, (req, res) => {
  res.json({ times: TIMES });
});

app.get("/api/summary", guard, (req, res) => {
  const date = req.query.date;
  const list = bookings.filter(b => b.date === date);
  res.json({
    counts: {
      male: list.filter(b => b.category === "male").length,
      female: list.filter(b => b.category === "female").length,
      total: list.length
    },
    detail: list
  });
});

// กันจองซ้ำ “เวลาเดียวกัน + ประเภทเดียวกัน + วันเดียวกัน”
function isSlotTaken({ date, category, time }, ignoreId = null) {
  return bookings.some(b =>
    b.date === date &&
    b.category === category &&
    b.time === time &&
    (ignoreId == null || Number(b.id) !== Number(ignoreId))
  );
}

app.post("/api/bookings", guard, (req, res) => {
  const payload = req.body;

  if (!payload?.date || !payload?.category || !payload?.time) {
    return res.status(400).json({ error: "missing fields" });
  }
  if (!TIMES.includes(payload.time)) {
    return res.status(400).json({ error: "invalid time" });
  }
  if (!["male", "female"].includes(payload.category)) {
    return res.status(400).json({ error: "invalid category" });
  }
  if (isSlotTaken(payload)) {
    return res.status(409).json({ error: "slot already booked" });
  }

  const booking = { id: id++, ...payload };
  bookings.push(booking);
  res.json({ ok: true, booking });
});

app.put("/api/bookings/:id", guard, (req, res) => {
  const bid = Number(req.params.id);
  const idx = bookings.findIndex(b => Number(b.id) === bid);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  const payload = req.body;
  if (!payload?.date || !payload?.category || !payload?.time) {
    return res.status(400).json({ error: "missing fields" });
  }
  if (!TIMES.includes(payload.time)) {
    return res.status(400).json({ error: "invalid time" });
  }
  if (!["male", "female"].includes(payload.category)) {
    return res.status(400).json({ error: "invalid category" });
  }
  if (isSlotTaken(payload, bid)) {
    return res.status(409).json({ error: "slot already booked" });
  }

  bookings[idx] = { ...bookings[idx], ...payload };
  res.json({ ok: true, booking: bookings[idx] });
});

app.delete("/api/bookings/:id", guard, (req, res) => {
  bookings = bookings.filter(b => b.id != req.params.id);
  res.json({ ok: true });
});

// ====== Calendar (.ics) ======
app.get("/api/calendar/:id", guard, (req, res) => {
  const bid = Number(req.params.id);
  const b = bookings.find(x => Number(x.id) === bid);
  if (!b) return res.status(404).send("Not found");

  // ใช้ TZ Asia/Bangkok เพื่อไม่ให้เวลาเด้งไปกลางคืน
  const tz = "Asia/Bangkok";
  const dtStart = toIcsLocal(b.date, b.time);
  const dtEnd = toIcsLocal(b.date, addMinutesToTime(b.time, 60)); // 1 ชั่วโมง

  const title =
    (b.category === "male" ? "ตัดผมผู้ชาย" : "ทำผมผู้หญิง") + " – Adore hair";

  const desc =
    `ลูกค้า: ${b.name || "-"}\n` +
    `บริการ: ${b.service || "-"}\n` +
    `โทร: ${b.phone || "-"}\n` +
    `หมายเหตุ: ${b.note || "-"}`;

  const uid = `adore-${b.id}@adore-hair`;

  const ics =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Adore hair//Queue//TH
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VTIMEZONE
TZID:${tz}
BEGIN:STANDARD
TZOFFSETFROM:+0700
TZOFFSETTO:+0700
TZNAME:+07
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:${uid}
SUMMARY:${escapeIcsText(title)}
DESCRIPTION:${escapeIcsText(desc)}
DTSTART;TZID=${tz}:${dtStart}
DTEND;TZID=${tz}:${dtEnd}
END:VEVENT
END:VCALENDAR`;

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="adore-booking-${b.id}.ics"`);
  res.send(ics);
});

// ====== STATIC ======
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

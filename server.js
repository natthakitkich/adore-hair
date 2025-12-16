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
    saveUninitialized: false,
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

// ====== DATA (in-memory) ======
// ถ้าคุณย้ายไป Supabase แล้ว ส่วนนี้จะเปลี่ยนเป็น query DB แทน
let bookings = [];
let id = 1;

// ====== TIMES ======
// 13:00 ถึง 22:00 ทุก 1 ชั่วโมง (รวม 10 ตัวเลือก)
const TIMES = [];
for (let h = 13; h <= 22; h++) {
  TIMES.push(`${String(h).padStart(2, "0")}:00`);
}

// ====== API ======
app.get("/api/meta", guard, (req, res) => {
  res.json({ times: TIMES });
});

// summary ของวันนั้น
app.get("/api/summary", guard, (req, res) => {
  const date = req.query.date;
  const list = bookings.filter((b) => b.date === date);

  res.json({
    counts: {
      male: list.filter((b) => b.category === "male").length,
      female: list.filter((b) => b.category === "female").length,
      total: list.length,
    },
    detail: list,
  });
});

// ✅ ปฏิทินรายเดือน: ส่งกลับ "วันที่ที่มีคิวอย่างน้อย 1 รายการ"
app.get("/api/month", guard, (req, res) => {
  const ym = String(req.query.ym || ""); // "YYYY-MM"
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return res.status(400).json({ error: "bad ym (use YYYY-MM)" });
  }

  const daysSet = new Set();
  for (const b of bookings) {
    if (typeof b.date === "string" && b.date.startsWith(ym + "-")) {
      const dd = Number(b.date.slice(8, 10));
      if (!Number.isNaN(dd)) daysSet.add(dd);
    }
  }
  const days = [...daysSet].sort((a, b) => a - b);
  res.json({ ym, days });
});

// create booking
app.post("/api/bookings", guard, (req, res) => {
  const payload = req.body || {};
  const date = String(payload.date || "");
  const category = String(payload.category || "");
  const time = String(payload.time || "");
  const name = String(payload.name || "");
  const phone = String(payload.phone || ""); // ✅ optional
  const service = String(payload.service || "");
  const note = String(payload.note || "");

  if (!date || !category || !time || !name || !service) {
    return res.status(400).json({ error: "missing required fields" });
  }
  if (!TIMES.includes(time)) {
    return res.status(400).json({ error: "invalid time" });
  }
  if (!["male", "female"].includes(category)) {
    return res.status(400).json({ error: "invalid category" });
  }

  // กันจองซ้ำ "เวลาเดียวกัน + ประเภทเดียวกัน + วันเดียวกัน"
  const dup = bookings.find(
    (b) => b.date === date && b.category === category && b.time === time
  );
  if (dup) {
    return res.status(409).json({ error: "time already booked for this category" });
  }

  const booking = {
    id: id++,
    date,
    category,
    time,
    name,
    phone,
    service,
    note,
  };
  bookings.push(booking);
  res.json({ ok: true, booking });
});

// update booking
app.put("/api/bookings/:id", guard, (req, res) => {
  const bid = Number(req.params.id);
  const idx = bookings.findIndex((b) => Number(b.id) === bid);
  if (idx < 0) return res.status(404).json({ error: "not found" });

  const payload = req.body || {};
  const date = String(payload.date || "");
  const category = String(payload.category || "");
  const time = String(payload.time || "");
  const name = String(payload.name || "");
  const phone = String(payload.phone || "");
  const service = String(payload.service || "");
  const note = String(payload.note || "");

  if (!date || !category || !time || !name || !service) {
    return res.status(400).json({ error: "missing required fields" });
  }
  if (!TIMES.includes(time)) return res.status(400).json({ error: "invalid time" });
  if (!["male", "female"].includes(category)) {
    return res.status(400).json({ error: "invalid category" });
  }

  // กันชนกับคิวอื่น (ยกเว้นตัวเอง)
  const dup = bookings.find(
    (b) => Number(b.id) !== bid && b.date === date && b.category === category && b.time === time
  );
  if (dup) return res.status(409).json({ error: "time already booked for this category" });

  bookings[idx] = { id: bid, date, category, time, name, phone, service, note };
  res.json({ ok: true, booking: bookings[idx] });
});

// delete booking
app.delete("/api/bookings/:id", guard, (req, res) => {
  const bid = Number(req.params.id);
  bookings = bookings.filter((b) => Number(b.id) !== bid);
  res.json({ ok: true });
});

// ✅ กันหน้า iPhone error "Cannot GET /api/calendar/1"
// (ถ้าคุณยังไม่อยากใช้ calendar ตอนนี้ ปล่อยไว้เฉยๆได้)
app.get("/api/calendar/:id", guard, (req, res) => {
  return res.status(501).json({ error: "calendar not enabled yet" });
});

// ====== STATIC ======
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

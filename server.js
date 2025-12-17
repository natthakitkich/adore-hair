import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

const PIN = process.env.ADORE_PIN || "1234";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "adore-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: "lax" },
  })
);

// ====== AUTH ======
app.get("/api/me", (req, res) => {
  if (req.session.auth) return res.json({ ok: true });
  res.status(401).json({ error: "unauthorized" });
});

app.post("/api/login", (req, res) => {
  if (String(req.body?.pin ?? "") === String(PIN)) {
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

// ====== TIMES ======
const TIMES = [];
for (let h = 13; h <= 22; h++) TIMES.push(`${String(h).padStart(2, "0")}:00`);

// ====== HELPERS ======
function isValidDateYYYYMMDD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}
function isValidYM(s) {
  return /^\d{4}-\d{2}$/.test(String(s || ""));
}
function firstLastDayOfYM(ym) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const yyyy = (d) => d.getFullYear();
  const mm = (d) => String(d.getMonth() + 1).padStart(2, "0");
  const dd = (d) => String(d.getDate()).padStart(2, "0");
  return {
    start: `${yyyy(first)}-${mm(first)}-${dd(first)}`,
    end: `${yyyy(last)}-${mm(last)}-${dd(last)}`,
  };
}

// ✅ ทำให้ time เป็น HH:MM เสมอ (กัน "13:00:00")
function normTime(t) {
  const s = String(t ?? "").trim();
  if (!s) return "";
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function pad2(n) { return String(n).padStart(2, "0"); }
// local floating time for ICS (NO Z)
function toICSLocal(dateStr, timeStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const [hh, mm] = String(timeStr).split(":").map(Number);
  return `${y}${pad2(m)}${pad2(d)}T${pad2(hh)}${pad2(mm)}00`;
}
function addHoursLocal(dateStr, timeStr, addH) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const [hh, mm] = String(timeStr).split(":").map(Number);
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0); // local time
  dt.setHours(dt.getHours() + addH);
  const yy = dt.getFullYear();
  const mm2 = pad2(dt.getMonth() + 1);
  const dd2 = pad2(dt.getDate());
  const hh2 = pad2(dt.getHours());
  const mi2 = pad2(dt.getMinutes());
  return { date: `${yy}-${mm2}-${dd2}`, time: `${hh2}:${mi2}` };
}
function icsEscape(s) {
  return String(s ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

// ====== API ======
app.get("/api/meta", guard, (req, res) => {
  res.json({ times: TIMES });
});

// summary ของวันนั้น
app.get("/api/summary", guard, async (req, res) => {
  const date = String(req.query.date || "");
  if (!isValidDateYYYYMMDD(date)) return res.status(400).json({ error: "bad date" });

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("date", date)
    .order("time", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const listRaw = Array.isArray(data) ? data : [];
  // ✅ normalize time ก่อนส่งไปหน้าเว็บ
  const list = listRaw.map((b) => ({ ...b, time: normTime(b.time) }));

  res.json({
    counts: {
      male: list.filter((b) => b.category === "male").length,
      female: list.filter((b) => b.category === "female").length,
      total: list.length,
    },
    detail: list,
  });
});

// ปฏิทินรายเดือน: ส่งกลับ "วันที่ที่มีคิวอย่างน้อย 1 รายการ"
app.get("/api/month", guard, async (req, res) => {
  const ym = String(req.query.ym || "");
  if (!isValidYM(ym)) return res.status(400).json({ error: "bad ym (use YYYY-MM)" });

  const { start, end } = firstLastDayOfYM(ym);

  const { data, error } = await supabase
    .from("bookings")
    .select("date")
    .gte("date", start)
    .lte("date", end);

  if (error) return res.status(500).json({ error: error.message });

  const daysSet = new Set();
  for (const row of data || []) {
    const dd = Number(String(row.date).slice(8, 10));
    if (!Number.isNaN(dd)) daysSet.add(dd);
  }

  const days = [...daysSet].sort((a, b) => a - b);
  res.json({ ym, days });
});

// create booking
app.post("/api/bookings", guard, async (req, res) => {
  const payload = req.body || {};
  const date = String(payload.date || "");
  const category = payload.category === "female" ? "female" : "male";
  const time = normTime(payload.time);
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const service = String(payload.service || "").trim();
  const note = String(payload.note || "").trim();

  if (!isValidDateYYYYMMDD(date)) return res.status(400).json({ error: "bad date" });
  if (!TIMES.includes(time)) return res.status(400).json({ error: "invalid time" });
  if (!name) return res.status(400).json({ error: "missing required fields" });

  const { data, error } = await supabase
    .from("bookings")
    .insert([{ date, category, time, name, phone: phone || null, service: service || null, note: note || null }])
    .select("*")
    .single();

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return res.status(409).json({ error: "time already booked for this category" });
    }
    return res.status(500).json({ error: error.message });
  }

  // ✅ normalize time ตอนตอบกลับด้วย
  return res.json({ ok: true, booking: { ...data, time: normTime(data?.time) } });
});

// update booking
app.put("/api/bookings/:id", guard, async (req, res) => {
  const bid = Number(req.params.id);
  if (!bid) return res.status(400).json({ error: "bad id" });

  const payload = req.body || {};
  const date = String(payload.date || "");
  const category = payload.category === "female" ? "female" : "male";
  const time = normTime(payload.time);
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const service = String(payload.service || "").trim();
  const note = String(payload.note || "").trim();

  if (!isValidDateYYYYMMDD(date)) return res.status(400).json({ error: "bad date" });
  if (!TIMES.includes(time)) return res.status(400).json({ error: "invalid time" });
  if (!name) return res.status(400).json({ error: "missing required fields" });

  const { data, error } = await supabase
    .from("bookings")
    .update({ date, category, time, name, phone: phone || null, service: service || null, note: note || null })
    .eq("id", bid)
    .select("*")
    .single();

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return res.status(409).json({ error: "time already booked for this category" });
    }
    return res.status(500).json({ error: error.message });
  }

  if (!data) return res.status(404).json({ error: "not found" });
  res.json({ ok: true, booking: { ...data, time: normTime(data?.time) } });
});

// delete booking
app.delete("/api/bookings/:id", guard, async (req, res) => {
  const bid = Number(req.params.id);
  if (!bid) return res.status(400).json({ error: "bad id" });

  const { error } = await supabase.from("bookings").delete().eq("id", bid);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
});

// ====== CALENDAR (.ics) ======
app.get("/api/calendar/:id", guard, async (req, res) => {
  const bookingId = Number(req.params.id);
  if (!bookingId) return res.status(400).send("bad id");

  const { data: b, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error) return res.status(500).send(error.message);
  if (!b) return res.status(404).send("not found");

  const t = normTime(b.time);
  const dtStart = toICSLocal(b.date, t);
  const endObj = addHoursLocal(b.date, t, 1);
  const dtEnd = toICSLocal(endObj.date, endObj.time);

  const title = `Adore hair - ${b.category === "male" ? "ตัดผมผู้ชาย" : "ทำผมผู้หญิง"}`;
  const descLines = [
    `ชื่อ: ${b.name || "-"}`,
    `ประเภท: ${b.category === "male" ? "ผู้ชาย" : "ผู้หญิง"}`,
    `เวลา: ${b.date} ${t}`,
    `ทำอะไร: ${b.service || "-"}`,
    `โทร: ${b.phone || "-"}`,
    b.note ? `หมายเหตุ: ${b.note}` : "",
  ].filter(Boolean);

  const uid = `adore-${b.id}@adore-hair`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Adore hair//Queue//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStart}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(descLines.join("\n"))}`,
    "LOCATION:Adore hair",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="adore-booking-${b.id}.ics"`);
  res.send(ics);
});

// ====== STATIC ======
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

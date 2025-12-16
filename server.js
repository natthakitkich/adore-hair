import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// ===== CONFIG =====
const PIN = process.env.ADORE_PIN || "1234";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// ไทย = UTC+7 (แก้เวลา iPhone calendar เพี้ยน)
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

// dateStr YYYY-MM-DD + timeStr HH:MM (เวลาไทย) -> UTC Z สำหรับ ICS
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
  return `${pad2(h + hoursToAdd)}:00`;
}

// ===== API =====
app.get("/api/meta", guard, (req, res) => {
  res.json({ times: TIMES });
});

app.get("/api/summary", guard, async (req, res) => {
  try {
    const date = String(req.query.date || "");
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("date", date)
      .order("time", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const list = data || [];
    res.json({
      counts: {
        male: list.filter((b) => b.category === "male").length,
        female: list.filter((b) => b.category === "female").length,
        total: list.length
      },
      detail: list
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "server error" });
  }
});

// ส่งวันที่ในเดือนที่มีคิว: days = ["YYYY-MM-DD", ...]
app.get("/api/month", guard, async (req, res) => {
  try {
    const month = String(req.query.month || ""); // YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "bad month" });

    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const endDate = new Date(y, m, 0); // last day of month
    const end = `${month}-${pad2(endDate.getDate())}`;

    const { data, error } = await supabase
      .from("bookings")
      .select("date")
      .gte("date", start)
      .lte("date", end);

    if (error) return res.status(500).json({ error: error.message });

    const days = Array.from(new Set((data || []).map((x) => x.date)));
    days.sort();
    res.json({ days });
  } catch (e) {
    res.status(500).json({ error: e.message || "server error" });
  }
});

app.post("/api/bookings", guard, async (req, res) => {
  try {
    const payload = req.body || {};
    const booking = {
      date: String(payload.date || ""),
      category: String(payload.category || ""),
      time: String(payload.time || ""),
      name: String(payload.name || "").trim(),
      phone: String(payload.phone || "").trim(),
      service: String(payload.service || "").trim(),
      note: String(payload.note || "").trim()
    };

    if (!booking.date || !booking.category || !booking.time) {
      return res.status(400).json({ error: "missing required fields" });
    }
    if (!["male", "female"].includes(booking.category)) {
      return res.status(400).json({ error: "bad category" });
    }
    if (!TIMES.includes(booking.time)) {
      return res.status(400).json({ error: "bad time" });
    }
    if (!booking.name) {
      return res.status(400).json({ error: "กรุณากรอกชื่อลูกค้า" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert(booking)
      .select("*")
      .single();

    // ถ้าซ้ำ slot จะติด unique index
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return res.status(409).json({ error: "เวลานี้ถูกจองแล้ว (ประเภทเดียวกัน)" });
      }
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true, booking: data });
  } catch (e) {
    res.status(500).json({ error: e.message || "server error" });
  }
});

app.put("/api/bookings/:id", guard, async (req, res) => {
  try {
    const bid = Number(req.params.id);
    const payload = req.body || {};
    const booking = {
      date: String(payload.date || ""),
      category: String(payload.category || ""),
      time: String(payload.time || ""),
      name: String(payload.name || "").trim(),
      phone: String(payload.phone || "").trim(),
      service: String(payload.service || "").trim(),
      note: String(payload.note || "").trim()
    };

    if (!booking.date || !booking.category || !booking.time) {
      return res.status(400).json({ error: "missing required fields" });
    }
    if (!["male", "female"].includes(booking.category)) {
      return res.status(400).json({ error: "bad category" });
    }
    if (!TIMES.includes(booking.time)) {
      return res.status(400).json({ error: "bad time" });
    }
    if (!booking.name) {
      return res.status(400).json({ error: "กรุณากรอกชื่อลูกค้า" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(booking)
      .eq("id", bid)
      .select("*")
      .single();

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return res.status(409).json({ error: "เวลานี้ถูกจองแล้ว (ประเภทเดียวกัน)" });
      }
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true, booking: data });
  } catch (e) {
    res.status(500).json({ error: e.message || "server error" });
  }
});

app.delete("/api/bookings/:id", guard, async (req, res) => {
  try {
    const bid = Number(req.params.id);
    const { error } = await supabase.from("bookings").delete().eq("id", bid);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "server error" });
  }
});

app.get("/api/calendar/:id", guard, async (req, res) => {
  try {
    const bid = Number(req.params.id);
    const { data: b, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bid)
      .single();

    if (error || !b) return res.status(404).send("Not found");

    const startZ = toUtcZFromThai(b.date, b.time);
    const endThai = addHoursToThaiTimeStr(b.time, 1);
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
  } catch (e) {
    res.status(500).json({ error: e.message || "server error" });
  }
});

// ===== STATIC =====
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log("Server running on port", PORT));

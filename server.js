import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// ====== ENV ======
const PIN = process.env.ADORE_PIN || "1234";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ====== MIDDLEWARE ======
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
      secure: false
    }
  })
);

// ====== AUTH ======
app.get("/api/me", (req, res) => {
  if (req.session.auth) return res.json({ ok: true });
  res.status(401).json({ error: "unauthorized" });
});

app.post("/api/login", (req, res) => {
  if (req.body?.pin === PIN) {
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

// ====== TIMES: 13:00 - 22:00 ทุก 1 ชั่วโมง ======
const TIMES = [];
for (let h = 13; h <= 22; h++) {
  TIMES.push(`${String(h).padStart(2, "0")}:00`);
}

// ====== API ======
app.get("/api/meta", guard, (req, res) => {
  res.json({ times: TIMES });
});

app.get("/api/summary", guard, async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: "missing date" });

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("date", date)
      .order("time", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    const list = data || [];
    res.json({
      counts: {
        male: list.filter(b => b.category === "male").length,
        female: list.filter(b => b.category === "female").length,
        total: list.length
      },
      detail: list
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "server error" });
  }
});

app.post("/api/bookings", guard, async (req, res) => {
  try {
    const payload = req.body || {};
    const required = ["date", "category", "time", "name", "phone", "service"];
    for (const k of required) {
      if (!payload[k] || String(payload[k]).trim() === "") {
        return res.status(400).json({ error: `missing ${k}` });
      }
    }

    // กันเวลาไม่อยู่ใน TIMES
    if (!TIMES.includes(payload.time)) {
      return res.status(400).json({ error: "invalid time" });
    }
    if (!["male", "female"].includes(payload.category)) {
      return res.status(400).json({ error: "invalid category" });
    }

    const insertRow = {
      date: payload.date,
      category: payload.category,
      time: payload.time,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      service: payload.service.trim(),
      note: (payload.note || "").trim()
    };

    const { data, error } = await supabase
      .from("bookings")
      .insert(insertRow)
      .select("*")
      .single();

    // unique index ชน -> error code 23505 (Postgres)
    if (error) {
      if (String(error.code) === "23505") {
        return res.status(409).json({ error: "เวลานี้ถูกจองแล้ว (เฉพาะประเภทเดียวกัน)" });
      }
      throw error;
    }

    res.json({ ok: true, booking: data });
  } catch (e) {
    res.status(500).json({ error: e.message || "server error" });
  }
});

app.put("/api/bookings/:id", guard, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!bookingId) return res.status(400).json({ error: "invalid id" });

    const payload = req.body || {};
    const required = ["date", "category", "time", "name", "phone", "service"];
    for (const k of required) {
      if (!payload[k] || String(payload[k]).trim() === "") {
        return res.status(400).json({ error: `missing ${k}` });
      }
    }

    if (!TIMES.includes(payload.time)) return res.status(400).json({ error: "invalid time" });
    if (!["male", "female"].includes(payload.category)) return res.status(400).json({ error: "invalid category" });

    const updateRow = {
      date: payload.date,
      category: payload.category,
      time: payload.time,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      service: payload.service.trim(),
      note: (payload.note || "").trim()
    };

    const { data, error } = await supabase
      .from("bookings")
      .update(updateRow)
      .eq("id", bookingId)
      .select("*")
      .single();

    if (error) {
      if (String(error.code) === "23505") {
        return res.status(409).json({ error: "เวลานี้ถูกจองแล้ว (เฉพาะประเภทเดียวกัน)" });
      }
      throw error;
    }

    res.json({ ok: true, booking: data });
  } catch (e) {
    res.status(500).json({ error: e.message || "server error" });
  }
});

app.delete("/api/bookings/:id", guard, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!bookingId) return res.status(400).json({ error: "invalid id" });

    const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
    if (error) throw error;

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "server error" });
  }
});

// ====== iPhone Calendar (.ics) ======
// เปิด /api/calendar/:id แล้ว iOS จะขึ้นหน้า Add to Calendar
app.get("/api/calendar/:id", guard, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!bookingId) return res.status(400).send("invalid id");

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error || !data) return res.status(404).send("not found");

    // สร้างเวลาตามเวลาท้องถิ่น (Asia/Bangkok) แบบไม่เพี้ยน
    // ใช้รูปแบบ DTSTART;TZID=Asia/Bangkok:YYYYMMDDTHHMMSS
    const dateStr = data.date; // YYYY-MM-DD
    const timeStr = data.time; // HH:MM
    const [yyyy, mm, dd] = dateStr.split("-").map(Number);
    const [hh, min] = timeStr.split(":").map(Number);

    const yyyymmdd = `${yyyy}${String(mm).padStart(2, "0")}${String(dd).padStart(2, "0")}`;
    const hhmmss = `${String(hh).padStart(2, "0")}${String(min).padStart(2, "0")}00`;

    // นัด 1 ชั่วโมง
    const endHour = hh + 1;
    const end_hhmmss = `${String(endHour).padStart(2, "0")}${String(min).padStart(2, "0")}00`;

    const summary = `${data.category === "male" ? "ตัดผมผู้ชาย" : "ทำผมผู้หญิง"} – Adore hair`;
    const description =
      `ลูกค้า: ${data.name}\n` +
      `บริการ: ${data.service}\n` +
      `โทร: ${data.phone}\n` +
      `หมายเหตุ: ${data.note || "-"}`;

    const uid = `adore-${data.id}-${Date.now()}@adore-hair`;

    const ics =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Adore Hair//Queue//TH
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${yyyymmdd}T000000Z
DTSTART;TZID=Asia/Bangkok:${yyyymmdd}T${hhmmss}
DTEND;TZID=Asia/Bangkok:${yyyymmdd}T${end_hhmmss}
SUMMARY:${escapeICS(summary)}
DESCRIPTION:${escapeICS(description)}
END:VEVENT
END:VCALENDAR`;

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="adore-booking-${data.id}.ics"`);
    res.send(ics);
  } catch (e) {
    res.status(500).send(e.message || "server error");
  }
});

function escapeICS(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// ====== STATIC ======
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

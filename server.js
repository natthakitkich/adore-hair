import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// ===== ENV =====
const PIN = process.env.ADORE_PIN || "1234";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

app.set("trust proxy", 1);

// ===== Health =====
app.get("/health", (_, res) => res.send("OK"));

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ===== Middleware =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: "adore.sid",
    secret: process.env.SESSION_SECRET || "adore-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 12,
    },
  })
);

// ===== Auth =====
function guard(req, res, next) {
  if (!req.session.auth) return res.status(401).json({ error: "unauthorized" });
  next();
}

app.get("/api/me", (req, res) =>
  req.session.auth ? res.json({ ok: true }) : res.status(401).end()
);

app.post("/api/login", (req, res) => {
  if (String(req.body?.pin) === String(PIN)) {
    req.session.auth = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "wrong pin" });
});

app.post("/api/logout", (req, res) =>
  req.session.destroy(() => res.json({ ok: true }))
);

// ===== Times =====
const TIMES = [];
for (let h = 13; h <= 22; h++) TIMES.push(`${String(h).padStart(2, "0")}:00`);

const normTime = (t) => String(t || "").slice(0, 5);

// ===== Helpers =====
function stylistFromRow(b) {
  if (b.stylist) return b.stylist;
  return b.category === "male" ? "Bank" : "Sindy";
}

// ===== Meta =====
app.get("/api/meta", guard, (_, res) => res.json({ times: TIMES }));

// ===== Summary =====
app.get("/api/summary", guard, async (req, res) => {
  const date = String(req.query.date || "");
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("date", date)
    .order("time");

  if (error) return res.status(500).json({ error: error.message });

  const list = (data || []).map((b) => ({
    ...b,
    time: normTime(b.time),
    stylist: stylistFromRow(b),
    gender: b.gender || b.category,
  }));

  res.json({
    detail: list,
    counts: {
      bank: list.filter((b) => b.stylist === "Bank").length,
      sindy: list.filter((b) => b.stylist === "Sindy").length,
      total: list.length,
    },
  });
});

// ===== Month =====
app.get("/api/month", guard, async (req, res) => {
  const ym = String(req.query.ym || "");
  const [y, m] = ym.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = new Date(y, m, 0).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("bookings")
    .select("date")
    .gte("date", start)
    .lte("date", end);

  const days = [...new Set((data || []).map((r) => Number(r.date.slice(8))))];
  res.json({ ym, days });
});

// ===== Create booking =====
app.post("/api/bookings", guard, async (req, res) => {
  const { date, stylist, gender, time, name, phone, service } = req.body;

  if (!date || !stylist || !gender || !time || !name || !service)
    return res.status(400).json({ error: "missing fields" });

  // ตรวจชน: ช่างเดียวกัน + วันเดียวกัน + เวลาเดียวกัน
  const { data: existing } = await supabase
    .from("bookings")
    .select("*")
    .eq("date", date)
    .eq("time", time);

  if (
    (existing || []).some((b) => stylistFromRow(b) === stylist)
  ) {
    return res
      .status(409)
      .json({ error: "time already booked for this stylist" });
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert([
      {
        date,
        time,
        name,
        phone: phone || null,
        service,
        stylist,
        gender,
      },
    ])
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, booking: data });
});

// ===== Update booking =====
app.put("/api/bookings/:id", guard, async (req, res) => {
  const id = Number(req.params.id);
  const { date, stylist, gender, time, name, phone, service } = req.body;

  const { data: others } = await supabase
    .from("bookings")
    .select("*")
    .eq("date", date)
    .eq("time", time)
    .neq("id", id);

  if (
    (others || []).some((b) => stylistFromRow(b) === stylist)
  ) {
    return res
      .status(409)
      .json({ error: "time already booked for this stylist" });
  }

  const { error } = await supabase
    .from("bookings")
    .update({ date, stylist, gender, time, name, phone, service })
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ===== Delete =====
app.delete("/api/bookings/:id", guard, async (req, res) => {
  await supabase.from("bookings").delete().eq("id", req.params.id);
  res.json({ ok: true });
});

// ===== Calendar =====
app.get("/api/calendar/:id", guard, async (req, res) => {
  const { data: b } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (!b) return res.status(404).end();

  const t = normTime(b.time);
  const title = `Adore hair - ${stylistFromRow(b)}`;

  const ics = `
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${title}
DTSTART:${b.date.replaceAll("-", "")}T${t.replace(":", "")}00
DTEND:${b.date.replaceAll("-", "")}T${String(Number(t.slice(0, 2)) + 1).padStart(2, "0")}${t.slice(3)}00
END:VEVENT
END:VCALENDAR
`.trim();

  res.setHeader("Content-Type", "text/calendar");
  res.send(ics);
});

// ===== Static =====
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () =>
  console.log("Adore hair queue running on port", PORT)
);

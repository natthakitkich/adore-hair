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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env");
  process.exit(1);
}

app.set("trust proxy", 1);

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

app.get("/api/me", (req, res) => {
  req.session.auth ? res.json({ ok: true }) : res.status(401).json({ error: "unauthorized" });
});

app.post("/api/login", (req, res) => {
  if (String(req.body?.pin) === String(PIN)) {
    req.session.auth = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "wrong pin" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ===== Time slots =====
const TIMES = [];
for (let h = 13; h <= 22; h++) TIMES.push(`${String(h).padStart(2, "0")}:00`);

function normTime(t) {
  return String(t || "").slice(0, 5);
}

// ===== Meta =====
app.get("/api/meta", guard, (req, res) => {
  res.json({ times: TIMES });
});

// ===== Summary (รายวัน) =====
app.get("/api/summary", guard, async (req, res) => {
  const date = String(req.query.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "bad date" });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("date", date)
    .order("time");

  if (error) return res.status(500).json({ error: error.message });

  const list = (data || []).map((b) => ({
    ...b,
    time: normTime(b.time),
  }));

  const counts = { bank: 0, sindy: 0, assist: 0, total: list.length };
  list.forEach((b) => {
    if (counts[b.stylist] !== undefined) counts[b.stylist]++;
  });

  res.json({ counts, detail: list });
});

// ===== Calendar month =====
app.get("/api/month", guard, async (req, res) => {
  const ym = String(req.query.ym || "");
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return res.status(400).json({ error: "bad ym" });
  }

  const [y, m] = ym.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;

  const { data, error } = await supabase
    .from("bookings")
    .select("date")
    .gte("date", start)
    .lte("date", end);

  if (error) return res.status(500).json({ error: error.message });

  const days = [...new Set((data || []).map((r) => Number(String(r.date).slice(8, 10))))].sort(
    (a, b) => a - b
  );

  res.json({ ym, days });
});

// ===== Create booking =====
app.post("/api/bookings", guard, async (req, res) => {
  const { date, time, stylist, gender, name, phone, service } = req.body || {};

  if (!date || !time || !stylist || !gender || !name || !service) {
    return res.status(400).json({ error: "missing required fields" });
  }

  if (!TIMES.includes(normTime(time))) {
    return res.status(400).json({ error: "invalid time" });
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert([
      {
        date,
        time: normTime(time),
        stylist,
        gender,
        name: name.trim(),
        phone: phone?.trim() || null,
        service: service.trim(),
      },
    ])
    .select("*")
    .single();

  if (error) {
    if ((error.message || "").toLowerCase().includes("unique")) {
      return res.status(409).json({ error: "เวลานี้ช่างคนนี้มีคิวแล้ว" });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true, booking: { ...data, time: normTime(data.time) } });
});

// ===== Update booking =====
app.put("/api/bookings/:id", guard, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "bad id" });

  const { date, time, stylist, gender, name, phone, service } = req.body || {};

  const { data, error } = await supabase
    .from("bookings")
    .update({
      date,
      time: normTime(time),
      stylist,
      gender,
      name: name.trim(),
      phone: phone?.trim() || null,
      service: service.trim(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if ((error.message || "").toLowerCase().includes("unique")) {
      return res.status(409).json({ error: "เวลานี้ช่างคนนี้มีคิวแล้ว" });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true, booking: { ...data, time: normTime(data.time) } });
});

// ===== Delete booking =====
app.delete("/api/bookings/:id", guard, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "bad id" });

  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
});

// ===== Static =====
app.use(express.static(path.join(__dirname, "public")));

// ===== Start =====
app.listen(PORT, () => {
  console.log("Adore hair server running on", PORT);
});

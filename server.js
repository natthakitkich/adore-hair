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

app.set("trust proxy", 1);

app.get("/health", (_, res) => res.send("OK"));

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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

// ===== AUTH =====
app.get("/api/me", (req, res) => {
  if (req.session.auth) return res.json({ ok: true });
  res.status(401).json({ error: "unauthorized" });
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

function guard(req, res, next) {
  if (!req.session.auth) return res.status(401).json({ error: "unauthorized" });
  next();
}

// ===== TIMES =====
const TIMES = [];
for (let h = 13; h <= 22; h++) TIMES.push(`${String(h).padStart(2, "0")}:00`);

const STYLISTS = ["Bank", "Sindy"];

const mapOldStylist = (b) => {
  if (b.stylist) return b.stylist;
  return b.category === "female" ? "Sindy" : "Bank";
};

const mapOldGender = (b) => {
  if (b.gender) return b.gender;
  return b.category === "female" ? "female" : "male";
};

// ===== API =====
app.get("/api/meta", guard, (_, res) => {
  res.json({ times: TIMES, stylists: STYLISTS });
});

app.get("/api/summary", guard, async (req, res) => {
  const date = String(req.query.date || "");
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("date", date)
    .order("time", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const list = (data || []).map((b) => ({
    ...b,
    stylist: mapOldStylist(b),
    gender: mapOldGender(b),
    time: String(b.time).slice(0, 5),
  }));

  res.json({
    counts: {
      Bank: list.filter((b) => b.stylist === "Bank").length,
      Sindy: list.filter((b) => b.stylist === "Sindy").length,
      total: list.length,
    },
    detail: list,
  });
});

app.post("/api/bookings", guard, async (req, res) => {
  const { date, time, name, phone, service, stylist, gender } = req.body;

  if (!STYLISTS.includes(stylist))
    return res.status(400).json({ error: "bad stylist" });
  if (!["male", "female"].includes(gender))
    return res.status(400).json({ error: "bad gender" });
  if (!TIMES.includes(time))
    return res.status(400).json({ error: "bad time" });
  if (!name || !service)
    return res.status(400).json({ error: "missing fields" });

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

app.put("/api/bookings/:id", guard, async (req, res) => {
  const id = Number(req.params.id);
  const { date, time, name, phone, service, stylist, gender } = req.body;

  const { data, error } = await supabase
    .from("bookings")
    .update({ date, time, name, phone, service, stylist, gender })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, booking: data });
});

app.delete("/api/bookings/:id", guard, async (req, res) => {
  const id = Number(req.params.id);
  await supabase.from("bookings").delete().eq("id", id);
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});

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
  if (!req.session.auth) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// ====== DATA ======
let bookings = [];
let id = 1;

const TIMES = [];
for (let h = 13; h <= 21; h++) {
  TIMES.push(`${String(h).padStart(2, "0")}:00`);
  TIMES.push(`${String(h).padStart(2, "0")}:30`);
}
TIMES.push("22:00");

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

app.post("/api/bookings", guard, (req, res) => {
  bookings.push({ id: id++, ...req.body });
  res.json({ ok: true });
});

app.delete("/api/bookings/:id", guard, (req, res) => {
  bookings = bookings.filter(b => b.id != req.params.id);
  res.json({ ok: true });
});

// ====== STATIC ======
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

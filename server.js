import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const ADORE_PIN = process.env.ADORE_PIN || "2580";
const SESSION_SECRET = process.env.SESSION_SECRET || "adore-secret";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.static(path.join(__dirname, "public")));

app.post("/login", (req, res) => {
  const { pin } = req.body;
  if (pin === ADORE_PIN) {
    req.session.auth = true;
    return res.json({ success: true });
  }
  res.status(401).json({ success: false });
});

app.get("/me", (req, res) => {
  res.json({ auth: !!req.session.auth });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

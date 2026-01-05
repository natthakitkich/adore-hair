// ================================
// Adore Hair Studio – Server
// Latest + Recover Version
// ================================

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// Middleware
// ================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ================================
// Simple Auth (PIN เดิม)
// ================================
const OWNER_PIN = "1234"; // ใช้ค่าเดิมของคุณ

// ================================
// In-memory Database (โครงเดิม)
// ================================
// ❗ ห้ามเปลี่ยน key โดยไม่จำเป็น
let bookings = [
  {
    id: 1,
    date: "2025-12-28",
    time: "13:00",
    barber: "Bank",
    gender: "male",
    name: "เอิร์ท",
    service: "ตัดผมชาย",
    phone: "0936600933",
  },
  {
    id: 2,
    date: "2025-12-28",
    time: "18:00",
    barber: "Bank",
    gender: "male",
    name: "แทน",
    service: "ตัดผมชาย",
    phone: "06-3130-8483",
  },
];

// ================================
// Utils
// ================================
function generateId() {
  return Date.now();
}

// ================================
// Routes – Auth
// ================================
app.post("/api/login", (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ success: false });
  }

  if (pin === OWNER_PIN) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false });
});

// ================================
// Routes – Booking
// ================================

// ดึงคิวตามวัน
app.get("/api/bookings", (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.json([]);
  }

  const result = bookings
    .filter((b) => b.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));

  res.json(result);
});

// เพิ่มคิว
app.post("/api/bookings", (req, res) => {
  const booking = req.body;

  if (
    !booking.date ||
    !booking.time ||
    !booking.barber ||
    !booking.name
  ) {
    return res.status(400).json({ success: false });
  }

  const newBooking = {
    id: generateId(),
    date: booking.date,
    time: booking.time,
    barber: booking.barber,
    gender: booking.gender || "",
    name: booking.name,
    service: booking.service || "",
    phone: booking.phone || "",
  };

  bookings.push(newBooking);
  res.json({ success: true });
});

// แก้ไขคิว (เวลา + ช่าง ล็อกไว้)
app.put("/api/bookings/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = bookings.findIndex((b) => b.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false });
  }

  // ❗ ไม่ให้แก้ date / time / barber
  bookings[index] = {
    ...bookings[index],
    name: req.body.name,
    gender: req.body.gender,
    service: req.body.service,
    phone: req.body.phone,
  };

  res.json({ success: true });
});

// ลบคิว
app.delete("/api/bookings/:id", (req, res) => {
  const id = Number(req.params.id);
  bookings = bookings.filter((b) => b.id !== id);
  res.json({ success: true });
});

// ================================
// Fallback – Frontend
// ================================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================================
// Start Server
// ================================
app.listen(PORT, () => {
  console.log(`Adore Hair Server running on port ${PORT}`);
});

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

/* =========================
   BASIC SETUP
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* =========================
   SUPABASE CLIENT
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   CONSTANT (CUSTOMER)
========================= */
const OPEN_HOUR = 13;
const CLOSE_HOUR = 22;
const MAX_BOOK_DAYS = 30;
const CUSTOMER_STYLISTS = ['Bank', 'Sindy'];

/* =========================
   FRONTEND ROUTES
========================= */

// ลูกค้า
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/customer.html'));
});

// เจ้าของร้าน
app.get('/owner', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/owner.html'));
});

/* =========================
   OWNER API (เดิมทั้งหมด)
========================= */

// Get bookings by date
app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  let query = supabase
    .from('bookings')
    .select('*')
    .order('time', { ascending: true });

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data || []);
});

// Create booking (owner)
app.post('/bookings', async (req, res) => {
  const { date, time, stylist, name, gender, phone, service } = req.body;

  if (!date || !time || !stylist || !name || !gender) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data: exist } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('stylist', stylist);

  if (exist && exist.length > 0) {
    return res.status(409).json({ error: 'Slot already booked' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([{ date, time, stylist, name, gender, phone, service }])
    .select()
    .single();

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data);
});

// Update booking
app.put('/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, gender, service } = req.body;

  const { error } = await supabase
    .from('bookings')
    .update({ name, phone, gender, service })
    .eq('id', id);

  if (error) {
    return res.status(500).json(error);
  }

  res.json({ success: true });
});

// Delete booking
app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json(error);
  }

  res.json({ success: true });
});

/* =========================
   CUSTOMER PUBLIC API
========================= */

// 1️⃣ ดูเวลาว่าง (ลูกค้า)
app.get('/public/availability', async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Missing date' });
  }

  // จำกัดวันล่วงหน้า 30 วัน
  const today = new Date();
  const target = new Date(date);
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (target - today) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0 || diffDays > MAX_BOOK_DAYS) {
    return res.status(400).json({ error: 'Date out of range' });
  }

  // ดึง booking ของวันนั้น
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('time, stylist')
    .eq('date', date)
    .in('stylist', CUSTOMER_STYLISTS);

  if (error) {
    return res.status(500).json(error);
  }

  // สร้าง slot ว่าง
  const result = {};

  CUSTOMER_STYLISTS.forEach(stylist => {
    const bookedTimes = bookings
      .filter(b => b.stylist === stylist)
      .map(b => b.time);

    const available = [];

    for (let h = OPEN_HOUR; h <= CLOSE_HOUR; h++) {
      const time = `${String(h).padStart(2, '0')}:00:00`;
      if (!bookedTimes.includes(time)) {
        available.push(time);
      }
    }

    result[stylist] = available;
  });

  res.json(result);
});

// 2️⃣ ลูกค้าจองคิว
app.post('/public/bookings', async (req, res) => {
  const { date, time, stylist, name, phone } = req.body;

  if (!date || !time || !stylist || !name || !phone) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (!CUSTOMER_STYLISTS.includes(stylist)) {
    return res.status(403).json({ error: 'Invalid stylist' });
  }

  // กันจองซ้ำ
  const { data: exist } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('stylist', stylist);

  if (exist && exist.length > 0) {
    return res.status(409).json({ error: 'Slot already booked' });
  }

  const { error } = await supabase
    .from('bookings')
    .insert([
      {
        date,
        time,
        stylist,
        name,
        phone,
        gender: 'unknown',
        service: 'customer booking'
      }
    ]);

  if (error) {
    return res.status(500).json(error);
  }

  res.json({ success: true });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Adore Hair server running on port ${PORT}`);
});

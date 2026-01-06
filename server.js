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
   SUPABASE
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   ROUTES
========================= */
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* =========================================================
   BOOKINGS
   - ใช้ table: public.bookings
   - UNIQUE(date, time, stylist)
   - gender / stylist / date / time = NOT NULL
========================================================= */

/* ===== GET BOOKINGS BY DATE ===== */
app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .order('time', { ascending: true });

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data || []);
});

/* ===== CREATE BOOKING ===== */
app.post('/bookings', async (req, res) => {
  const {
    date,
    time,      // ต้องเป็น HH:MM:SS
    stylist,
    gender,
    name,
    phone,
    service,
    note
  } = req.body;

  // ป้องกันข้อมูลไม่ครบ (กัน error เงียบ)
  if (!date || !time || !stylist || !gender || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { error } = await supabase.from('bookings').insert([{
    date,
    time,
    stylist,
    gender,
    name,
    phone: phone || '',
    service: service || '',
    note: note || ''
  }]);

  if (error) {
    // Duplicate slot (UNIQUE date+time+stylist)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Slot already booked' });
    }
    return res.status(500).json(error);
  }

  res.json({ success: true });
});

/* ===== UPDATE BOOKING (ปุ่มจัดการ) ===== */
app.put('/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, gender, service, note } = req.body;

  // gender เป็น NOT NULL → ห้ามหาย
  if (!gender) {
    return res.status(400).json({ error: 'Gender is required' });
  }

  const { error } = await supabase
    .from('bookings')
    .update({
      name,
      phone,
      gender,
      service,
      note
    })
    .eq('id', id);

  if (error) {
    return res.status(500).json(error);
  }

  res.json({ success: true });
});

/* ===== DELETE BOOKING ===== */
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

/* =========================================================
   CALENDAR DENSITY
========================================================= */
app.get('/calendar-days', async (_, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('date');

  if (error) {
    return res.status(500).json(error);
  }

  const map = {};
  data.forEach(b => {
    map[b.date] = (map[b.date] || 0) + 1;
  });

  res.json(map);
});

/* =========================================================
   CLOSED DAYS
========================================================= */
app.get('/closed-days', async (_, res) => {
  const { data, error } = await supabase
    .from('closed_days')
    .select('date');

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data.map(d => d.date));
});

app.post('/closed-days', async (req, res) => {
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Date required' });
  }

  const { data: exist } = await supabase
    .from('closed_days')
    .select('id')
    .eq('date', date);

  if (exist && exist.length > 0) {
    await supabase.from('closed_days').delete().eq('date', date);
    return res.json({ status: 'open' });
  }

  await supabase.from('closed_days').insert([{ date }]);
  res.json({ status: 'closed' });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

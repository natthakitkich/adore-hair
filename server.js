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
   ROUTES
========================= */

// serve frontend
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* ---------- BOOKINGS ----------
   Get bookings by date
---------------------------- */
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

/* ---------- CALENDAR ----------
   Get calendar density
---------------------------- */
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

/* ---------- BOOKINGS ----------
   Create booking
---------------------------- */
app.post('/bookings', async (req, res) => {
  const { date, time, stylist, name, gender, phone, service } = req.body;

  if (!date || !time || !stylist || !name || !gender) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ❗️เช็กวันปิดร้านก่อน
  const { data: closed } = await supabase
    .from('closed_days')
    .select('id')
    .eq('date', date)
    .limit(1);

  if (closed && closed.length > 0) {
    return res.status(403).json({ error: 'Store is closed on this date' });
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

/* ---------- BOOKINGS ----------
   Update booking
---------------------------- */
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

/* ---------- BOOKINGS ----------
   Delete booking
---------------------------- */
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

/* ---------- CLOSED DAYS ----------
   Get all closed days
---------------------------- */
app.get('/closed-days', async (_, res) => {
  const { data, error } = await supabase
    .from('closed_days')
    .select('date');

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data.map(d => d.date));
});

/* ---------- CLOSED DAYS ----------
   Close store on date
---------------------------- */
app.post('/closed-days', async (req, res) => {
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Date required' });
  }

  const { error } = await supabase
    .from('closed_days')
    .insert([{ date }]);

  if (error) {
    return res.status(500).json(error);
  }

  res.json({ success: true });
});

/* ---------- CLOSED DAYS ----------
   Open store (remove closed day)
---------------------------- */
app.delete('/closed-days/:date', async (req, res) => {
  const { date } = req.params;

  const { error } = await supabase
    .from('closed_days')
    .delete()
    .eq('date', date);

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

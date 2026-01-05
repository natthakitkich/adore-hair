import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

/* ================= BASIC SETUP ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ================= SUPABASE ================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ================= ROUTES ================= */

/* ---------- FRONTEND ---------- */
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* ---------- GET BOOKINGS ---------- */
app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  let query = supabase
    .from('bookings')
    .select('*')
    .order('time', { ascending: true });

  if (date) query = query.eq('date', date);

  const { data, error } = await query;
  if (error) return res.status(500).json(error);

  res.json(data || []);
});

/* ---------- CALENDAR DENSITY ---------- */
app.get('/calendar-days', async (_, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('date');

  if (error) return res.status(500).json(error);

  const map = {};
  data.forEach(d => {
    map[d.date] = (map[d.date] || 0) + 1;
  });

  res.json(map);
});

/* ---------- CLOSED DAYS ---------- */
app.get('/closed-days', async (_, res) => {
  const { data, error } = await supabase
    .from('closed_days')
    .select('date');

  if (error) return res.status(500).json(error);
  res.json(data.map(d => d.date));
});

app.post('/closed-days', async (req, res) => {
  const { date, action } = req.body;

  if (!date || !action) {
    return res.status(400).json({ error: 'missing_data' });
  }

  if (action === 'close') {
    await supabase.from('closed_days').insert([{ date }]);
    return res.json({ status: 'closed' });
  }

  if (action === 'open') {
    await supabase.from('closed_days').delete().eq('date', date);
    return res.json({ status: 'open' });
  }

  res.status(400).json({ error: 'invalid_action' });
});

/* ---------- CREATE BOOKING ---------- */
app.post('/bookings', async (req, res) => {
  const { date, time, stylist, name, gender, phone, service } = req.body;

  if (!date || !time || !stylist || !name || !gender) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  /* check closed day */
  const { data: closed } = await supabase
    .from('closed_days')
    .select('id')
    .eq('date', date);

  if (closed.length) {
    return res.status(403).json({ error: 'shop_closed' });
  }

  /* check duplicate */
  const { data: exist } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('stylist', stylist);

  if (exist.length) {
    return res.status(409).json({ error: 'slot_taken' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([{ date, time, stylist, name, gender, phone, service }])
    .select()
    .single();

  if (error) return res.status(500).json(error);
  res.json(data);
});

/* ---------- UPDATE BOOKING (PHASE 8) ---------- */
app.put('/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { date, time, name, gender, phone, service } = req.body;

  /* get original booking */
  const { data: origin, error: e1 } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (e1 || !origin) {
    return res.status(404).json({ error: 'booking_not_found' });
  }

  /* check closed day */
  const { data: closed } = await supabase
    .from('closed_days')
    .select('id')
    .eq('date', date);

  if (closed.length) {
    return res.status(403).json({ error: 'shop_closed' });
  }

  /* check collision (exclude itself) */
  const { data: clash } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('stylist', origin.stylist)
    .neq('id', id);

  if (clash.length) {
    return res.status(409).json({ error: 'slot_taken' });
  }

  /* update (stylist is locked) */
  const { error: e2 } = await supabase
    .from('bookings')
    .update({
      date,
      time,
      name,
      gender,
      phone,
      service
    })
    .eq('id', id);

  if (e2) return res.status(500).json(e2);

  res.json({ success: true });
});

/* ---------- DELETE BOOKING ---------- */
app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json(error);
  res.json({ success: true });
});

/* ================= START ================= */
app.listen(PORT, () => {
  console.log(`Adore Hair server running on port ${PORT}`);
});

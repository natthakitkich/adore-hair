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
   SUPABASE CLIENT (BASIC)
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   ROUTES
========================= */

/* ---------- BASIC ----------
   Serve frontend
---------------------------- */
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* ---------- BASIC ----------
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

/* ---------- BASIC ----------
   Create booking
---------------------------- */
app.post('/bookings', async (req, res) => {
  const { date, time, stylist, name, gender, phone, service } = req.body;

  if (!date || !time || !stylist || !name || !gender) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // BASIC: prevent duplicate slot
  const { data: exist, error: existError } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('stylist', stylist);

  if (existError) {
    return res.status(500).json(existError);
  }

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

/* ---------- DEVELOP ----------
   Update booking (LOCK date/time/stylist)
---------------------------- */
app.put('/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, gender, service } = req.body;

  // DEVELOP: allow update only specific fields
  const { error } = await supabase
    .from('bookings')
    .update({
      name,
      phone,
      gender,
      service
    })
    .eq('id', id);

  if (error) {
    return res.status(500).json(error);
  }

  res.json({ success: true });
});

/* ---------- BASIC ----------
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

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Adore Hair server (Develop) running on port ${PORT}`);
});

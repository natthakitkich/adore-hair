// ================================
// Adore Hair – Version Basic Backend
// ================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// BASIC: Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// BASIC
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// BASIC: get bookings
app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  let query = supabase
    .from('bookings')
    .select('*')
    .order('time');

  if (date) query = query.eq('date', date);

  const { data, error } = await query;
  if (error) return res.status(500).json(error);

  res.json(data || []);
});

// BASIC: create booking
app.post('/bookings', async (req, res) => {
  const { date, time, stylist, name, gender, phone, service } = req.body;

  if (!date || !time || !stylist || !name || !gender) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data: exist } = await supabase
    .from('bookings')
    .select('*')
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

  if (error) return res.status(500).json(error);
  res.json(data);
});

// NEW: update booking (ล็อกเวลา + ช่าง)
app.put('/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, gender, service } = req.body;

  const { error } = await supabase
    .from('bookings')
    .update({ name, phone, gender, service })
    .eq('id', id);

  if (error) return res.status(500).json(error);
  res.json({ success: true });
});

// BASIC: delete booking
app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json(error);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

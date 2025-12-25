import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   MIDDLEWARE
========================= */
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* bookings รายวัน */
app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .order('time');

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/* เพิ่ม booking */
app.post('/bookings', async (req, res) => {
  const { date, time, name, phone, stylist, gender, service } = req.body;

  const { error } = await supabase.from('bookings').insert([
    { date, time, name, phone, stylist, gender, service }
  ]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

/* ลบ booking */
app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

/* slot รายวัน */
app.get('/slots', async (req, res) => {
  const { date } = req.query;

  const slots = {};
  for (let h = 13; h <= 22; h++) {
    const t = `${String(h).padStart(2, '0')}:00`;
    slots[t] = { Bank: false, Sindy: false, Assist: false };
  }

  const { data } = await supabase
    .from('bookings')
    .select('time, stylist')
    .eq('date', date);

  data.forEach(b => {
    if (slots[b.time]) slots[b.time][b.stylist] = true;
  });

  res.json({ slots });
});

/* 🔴 CALENDAR API (หัวใจของวงเขียว) */
app.get('/calendar', async (req, res) => {
  const { month } = req.query; // YYYY-MM

  const start = `${month}-01`;
  const end = `${month}-31`;

  const { data, error } = await supabase
    .from('bookings')
    .select('date')
    .gte('date', start)
    .lte('date', end);

  if (error) return res.status(400).json({ error: error.message });

  const days = [...new Set(data.map(d => d.date))];
  res.json({ days });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

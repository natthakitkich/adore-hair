import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* ================= BOOKINGS ================= */

app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .order('time');

  if (error) return res.json([]);
  res.json(data || []);
});

app.post('/bookings', async (req, res) => {
  const { date, time, stylist, name, phone, gender, service } = req.body;

  const { error } = await supabase.from('bookings').insert([
    { date, time, stylist, name, phone, gender, service }
  ]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  await supabase.from('bookings').delete().eq('id', id);
  res.json({ ok: true });
});

/* ================= CALENDAR DENSITY ================= */
/* รวมทุก booking ทุกเดือน */

app.get('/calendar-days', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('date');

  if (error) return res.json({});

  const map = {};

  (data || []).forEach(b => {
    if (!b.date) return;
    const d = b.date.slice(0, 10);
    map[d] = (map[d] || 0) + 1;
  });

  res.json(map);
});

/* ================= SLOTS ================= */

app.get('/slots', async (req, res) => {
  const { date } = req.query;

  const { data } = await supabase
    .from('bookings')
    .select('time, stylist')
    .eq('date', date);

  const slots = {};
  for (let h = 13; h <= 22; h++) {
    const t = `${String(h).padStart(2, '0')}:00`;
    slots[t] = { Bank: false, Sindy: false, Assist: false };
  }

  (data || []).forEach(b => {
    if (slots[b.time]) slots[b.time][b.stylist] = true;
  });

  res.json({ slots });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on', PORT));

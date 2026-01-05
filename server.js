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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ===== BOOKINGS ===== */
app.get('/bookings', async (req, res) => {
  const { date } = req.query;
  let q = supabase.from('bookings').select('*').order('time');
  if (date) q = q.eq('date', date);
  const { data, error } = await q;
  if (error) return res.status(500).json(error);
  res.json(data || []);
});

/* ===== CALENDAR DENSITY ===== */
app.get('/calendar-days', async (_, res) => {
  const { data } = await supabase.from('bookings').select('date');
  const map = {};
  data?.forEach(d => (map[d.date] = (map[d.date] || 0) + 1));
  res.json(map);
});

/* ===== CLOSED DAYS ===== */
app.get('/closed-days', async (_, res) => {
  const { data } = await supabase.from('closed_days').select('date');
  res.json(data.map(d => d.date));
});

app.post('/closed-days', async (req, res) => {
  const { date, action } = req.body;

  if (action === 'close') {
    await supabase.from('closed_days').insert([{ date }]);
    return res.json({ status: 'closed' });
  }

  if (action === 'open') {
    await supabase.from('closed_days').delete().eq('date', date);
    return res.json({ status: 'open' });
  }

  res.status(400).json({ error: 'Invalid action' });
});

/* ===== CREATE BOOKING ===== */
app.post('/bookings', async (req, res) => {
  const { date, time, stylist, name, gender, phone, service } = req.body;

  const { data: closed } = await supabase
    .from('closed_days')
    .select('id')
    .eq('date', date);

  if (closed.length) {
    return res.status(403).json({ error: 'ร้านปิดทำการ' });
  }

  const { data: exist } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('stylist', stylist);

  if (exist.length) {
    return res.status(409).json({ error: 'ซ้ำ' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([{ date, time, stylist, name, gender, phone, service }])
    .select()
    .single();

  if (error) return res.status(500).json(error);
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

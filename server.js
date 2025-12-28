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

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* ===== BOOKINGS ===== */
app.get('/bookings', async (req, res) => {
  const { date } = req.query;
  let q = supabase.from('bookings').select('*').order('time');
  if (date) q = q.eq('date', date);
  const { data } = await q;
  res.json(data || []);
});

app.post('/bookings', async (req, res) => {
  const { date, time, stylist, name, gender, phone, service } = req.body;
  if (!date || !time || !stylist || !name || !gender) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  }

  const { data: exists } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('stylist', stylist)
    .limit(1);

  if (exists?.length) {
    return res.status(409).json({ error: 'เวลานี้ถูกจองแล้ว' });
  }

  await supabase.from('bookings').insert([{ date, time, stylist, name, gender, phone, service }]);
  res.json({ ok: true });
});

app.delete('/bookings/:id', async (req, res) => {
  await supabase.from('bookings').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

/* ===== SLOTS ===== */
app.get('/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.json({ slots: {} });

  const slots = {};
  for (let h = 13; h <= 22; h++) {
    slots[`${String(h).padStart(2,'0')}:00`] = { Bank:false, Sindy:false, Assist:false };
  }

  const { data } = await supabase.from('bookings').select('time,stylist').eq('date', date);
  (data || []).forEach(b => slots[b.time] && (slots[b.time][b.stylist] = true));
  res.json({ slots });
});

/* ===== CALENDAR DAYS ===== */
app.get('/calendar-days', async (_, res) => {
  const { data } = await supabase.from('bookings').select('date');
  const map = {};
  (data || []).forEach(b => {
    const d = b.date;
    map[d] = (map[d] || 0) + 1;
  });
  res.json(map);
});

app.listen(PORT, () => console.log('Server running'));

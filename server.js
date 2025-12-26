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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ===== BOOKINGS ===== */

app.get('/bookings', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.json([]);

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .order('time', { ascending: true });

  if (error) {
    console.error(error);
    return res.json([]);
  }

  res.json(data || []);
});

app.post('/bookings', async (req, res) => {
  const { date, time, name, phone, stylist, gender, service } = req.body;

  if (!date || !time || !name || !stylist || !gender) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  }

  const { error } = await supabase.from('bookings').insert([
    { date, time, name, phone, stylist, gender, service }
  ]);

  if (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true });
});

app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  res.json({ ok: true });
});

/* ===== SLOTS ===== */

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

  (data || []).forEach(b => {
    if (slots[b.time]) {
      slots[b.time][b.stylist] = true;
    }
  });

  res.json({ slots });
});

/* ===== CALENDAR DAYS ===== */

app.get('/calendar-days', async (req, res) => {
  const { data } = await supabase
    .from('bookings')
    .select('date');

  const days = Array.isArray(data)
    ? [...new Set(data.map(d => d.date))]
    : [];

  res.json({ days });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

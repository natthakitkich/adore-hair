import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

/* ===== BASIC SETUP ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ===== SUPABASE ===== */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ===== ROOT ===== */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* =========================================================
   BOOKINGS
   ========================================================= */

/* ----- GET BOOKINGS (by date optional) ----- */
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
    console.error(error);
    return res.json([]);
  }

  res.json(data || []);
});

/* ----- CREATE BOOKING ----- */
app.post('/bookings', async (req, res) => {
  const { date, time, name, phone, stylist, gender, service } = req.body;

  if (!date || !time || !name || !stylist || !gender) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  }

  const { error } = await supabase
    .from('bookings')
    .insert([{ date, time, name, phone, stylist, gender, service }]);

  if (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true });
});

/* ----- DELETE BOOKING ----- */
app.delete('/bookings/:id', async (req, res) => {
  await supabase
    .from('bookings')
    .delete()
    .eq('id', req.params.id);

  res.json({ ok: true });
});

/* =========================================================
   CALENDAR SUMMARY (หัวใจของปฏิทิน)
   ========================================================= */

/*
  ส่งออกเป็น:
  {
    "2025-12-25": 3,
    "2025-12-26": 8,
    ...
  }

  ✔ นับทุก booking จริง (Bank / Sindy / Assist)
  ✔ normalize date → ตัดปัญหา timezone
*/
app.get('/calendar-days', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('date');

  if (error) {
    console.error(error);
    return res.json({});
  }

  const map = {};

  data.forEach(b => {
    if (!b.date) return;

    // normalize date → YYYY-MM-DD
    const d = b.date.slice(0, 10);
    map[d] = (map[d] || 0) + 1;
  });

  res.json(map);
});

/* =========================================================
   SLOTS (13:00–22:00)
   ========================================================= */

app.get('/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.json({ slots: {} });

  const slots = {};
  for (let h = 13; h <= 22; h++) {
    const t = `${String(h).padStart(2, '0')}:00`;
    slots[t] = {
      Bank: false,
      Sindy: false,
      Assist: false
    };
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('time, stylist')
    .eq('date', date);

  if (!error && data) {
    data.forEach(b => {
      if (slots[b.time] && slots[b.time][b.stylist] !== undefined) {
        slots[b.time][b.stylist] = true;
      }
    });
  }

  res.json({ slots });
});

/* ===== START SERVER ===== */
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});

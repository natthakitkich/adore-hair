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

/* ---------- HOME ---------- */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data || []);
});

/* ---------- CREATE BOOKING ---------- */
app.post('/bookings', async (req, res) => {
  const { date, time, name, phone, stylist, gender, service } = req.body;

  if (!date || !time || !name || !stylist || !gender) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  }

  const { error } = await supabase
    .from('bookings')
    .insert([
      { date, time, name, phone, stylist, gender, service }
    ]);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ success: true });
});

/* ---------- DELETE BOOKING ---------- */
app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ success: true });
});

/* ---------- SLOTS (ต่อวัน / ต่อช่าง) ---------- */
app.get('/slots', async (req, res) => {
  const { date } = req.query;

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

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  (data || []).forEach(b => {
    if (slots[b.time]) {
      slots[b.time][b.stylist] = true;
    }
  });

  res.json({ slots });
});

/* ---------- CALENDAR (วันไหนมีคิว) ---------- */
app.get('/calendar', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('date');

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const dates = [...new Set((data || []).map(d => d.date))];
  res.json(dates);
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

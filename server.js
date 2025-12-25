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

/* =========================
   STATIC FILES (สำคัญมาก)
========================= */
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

// หน้าเว็บหลัก
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ดึง bookings
app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  let query = supabase
    .from('bookings')
    .select('*')
    .order('time', { ascending: true });

  if (date) query = query.eq('date', date);

  const { data, error } = await query;

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// สร้าง booking
app.post('/bookings', async (req, res) => {
  const { date, time, name, phone, stylist, gender, service } = req.body;

  const { error } = await supabase.from('bookings').insert([
    { date, time, name, phone, stylist, gender, service }
  ]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// slots
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

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

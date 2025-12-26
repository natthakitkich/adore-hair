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

/* ===== ROOT ===== */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ===== BOOKINGS BY DATE ===== */
app.get('/bookings', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.json([]);

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .order('time');

  if (error) return res.json([]);
  res.json(data);
});

/* ===== CREATE BOOKING ===== */
app.post('/bookings', async (req, res) => {
  const { date, time, name, phone, stylist, gender, service } = req.body;

  if (!date || !time || !name || !stylist || !gender) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  }

  const { error } = await supabase.from('bookings').insert([
    { date, time, name, phone, stylist, gender, service }
  ]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

/* ===== DELETE ===== */
app.delete('/bookings/:id', async (req, res) => {
  await supabase.from('bookings').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

/* ===== CALENDAR SUMMARY (หัวใจของสี) ===== */
app.get('/calendar-days', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('date, stylist');

  if (error) return res.json({});

  const map = {};
  data.forEach(b => {
    if (b.stylist === 'Bank' || b.stylist === 'Sindy') {
      map[b.date] = (map[b.date] || 0) + 1;
    }
  });

  res.json(map); // { '2025-12-26': 8 }
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
    slots[b.time][b.stylist] = true;
  });

  res.json({ slots });
});

app.listen(PORT, () => {
  console.log('Server running on', PORT);
});

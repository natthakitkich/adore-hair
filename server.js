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

/* ===== SUPABASE ===== */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ===== ROOT ===== */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ===== BOOKINGS ===== */
app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  let q = supabase
    .from('bookings')
    .select('*')
    .order('time', { ascending: true });

  if (date) q = q.eq('date', date);

  const { data, error } = await q;
  if (error) return res.json([]);

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

  if (exists && exists.length > 0) {
    return res.status(409).json({ error: 'เวลานี้ถูกจองแล้ว' });
  }

  await supabase.from('bookings').insert([
    { date, time, stylist, name, gender, phone, service }
  ]);

  res.json({ ok: true });
});

app.delete('/bookings/:id', async (req, res) => {
  await supabase.from('bookings').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

/* ===== CALENDAR DAYS (รวมทุกช่าง) ===== */
/* ===== CALENDAR DAYS (แยก Bank / Sindy) ===== */
app.get('/calendar-days', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('date, stylist');

  if (error) {
    console.error(error);
    return res.json({});
  }

  const map = {};

  (data || []).forEach(b => {
    if (!b.date) return;
    const d = b.date.slice(0, 10);

    if (!map[d]) {
      map[d] = { Bank: 0, Sindy: 0 };
    }

    if (b.stylist === 'Bank' || b.stylist === 'Sindy') {
      map[d][b.stylist]++;
    }
  });

  res.json(map);
});

/* ===== SLOTS ===== */
app.get('/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.json({ slots: {} });

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
    if (slots[b.time]) slots[b.time][b.stylist] = true;
  });

  res.json({ slots });
});

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});

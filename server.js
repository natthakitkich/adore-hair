import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* =========================
   CALENDAR DAYS (ทุกเดือน)
========================= */
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

    const d = b.date.slice(0, 10); // YYYY-MM-DD

    if (!map[d]) {
      map[d] = { Bank: 0, Sindy: 0 };
    }

    if (b.stylist === 'Bank' || b.stylist === 'Sindy') {
      map[d][b.stylist]++;
    }
  });

  res.json(map);
});

/* =========================
   SLOTS
========================= */
app.get('/slots', async (req, res) => {
  const { date } = req.query;

  const { data } = await supabase
    .from('bookings')
    .select('time, stylist')
    .eq('date', date);

  const slots = {};

  (data || []).forEach(b => {
    if (!slots[b.time]) {
      slots[b.time] = { Bank: false, Sindy: false };
    }
    slots[b.time][b.stylist] = true;
  });

  res.json({ slots });
});

/* =========================
   BOOKINGS
========================= */
app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .order('time');

  res.json(data || []);
});

app.post('/bookings', async (req, res) => {
  const { error } = await supabase
    .from('bookings')
    .insert(req.body);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true });
});

app.delete('/bookings/:id', async (req, res) => {
  await supabase
    .from('bookings')
    .delete()
    .eq('id', req.params.id);

  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('Server running');
});

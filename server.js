import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

/* =========================
   BASIC SETUP
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* =========================
   BOOKINGS
========================= */
app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .order('time', { ascending: true });

  if (error) {
    console.error(error);
    return res.status(500).json(error);
  }

  res.json(data || []);
});

app.post('/bookings', async (req, res) => {
  try {
    const { date, time, stylist, name, gender, phone, service } = req.body;

    if (!date || !time || !stylist || !name || !gender) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // normalize time (HH:mm)
    const cleanTime = time.length > 5 ? time.slice(0, 5) : time;

    const { data: exist, error: existError } = await supabase
      .from('bookings')
      .select('id')
      .eq('date', date)
      .eq('time', cleanTime)
      .eq('stylist', stylist);

    if (existError) {
      console.error(existError);
      return res.status(500).json(existError);
    }

    if (exist && exist.length > 0) {
      return res.status(409).json({ error: 'Slot already booked' });
    }

    const { error: insertError } = await supabase
      .from('bookings')
      .insert([{
        date,
        time: cleanTime,
        stylist,
        name,
        gender,
        phone: phone || null,
        service: service || null
      }]);

    if (insertError) {
      console.error(insertError);
      return res.status(500).json(insertError);
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server exception' });
  }
});

app.put('/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, gender, service } = req.body;

  const { error } = await supabase
    .from('bookings')
    .update({
      name,
      phone: phone || null,
      gender,
      service: service || null
    })
    .eq('id', id);

  if (error) {
    console.error(error);
    return res.status(500).json(error);
  }

  res.json({ success: true });
});

app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return res.status(500).json(error);
  }

  res.json({ success: true });
});

/* =========================
   CALENDAR DENSITY
========================= */
app.get('/calendar-days', async (_, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('date');

  if (error) {
    console.error(error);
    return res.status(500).json(error);
  }

  const map = {};
  (data || []).forEach(b => {
    map[b.date] = (map[b.date] || 0) + 1;
  });

  res.json(map);
});

/* =========================
   CLOSED DAYS
========================= */
app.get('/closed-days', async (_, res) => {
  const { data, error } = await supabase
    .from('closed_days')
    .select('date');

  if (error) {
    console.error(error);
    return res.status(500).json(error);
  }

  res.json((data || []).map(d => d.date));
});

app.post('/closed-days', async (req, res) => {
  const { date } = req.body;

  const { data: exist, error } = await supabase
    .from('closed_days')
    .select('id')
    .eq('date', date);

  if (error) {
    console.error(error);
    return res.status(500).json(error);
  }

  if (exist && exist.length > 0) {
    await supabase.from('closed_days').delete().eq('date', date);
    res.json({ status: 'open' });
  } else {
    await supabase.from('closed_days').insert([{ date }]);
    res.json({ status: 'closed' });
  }
});

/* ========================= */
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

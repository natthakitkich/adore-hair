import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// Supabase config
// ===============================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ===============================
// Utils
// ===============================
const WORK_HOURS = Array.from({ length: 10 }, (_, i) =>
  `${String(13 + i).padStart(2, '0')}:00`
);

// ===============================
// GET /slots?date=YYYY-MM-DD
// ใช้สำหรับ:
// - disable เวลาในฟอร์ม
// - ทำวงกลมเขียวในปฏิทิน
// ===============================
app.get('/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date is required' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('time, stylist')
    .eq('date', date);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // group by time
  const slots = {};
  WORK_HOURS.forEach(t => {
    slots[t] = {
      Bank: false,
      Sindy: false,
      Assist: false,
    };
  });

  data.forEach(b => {
    if (slots[b.time]) {
      slots[b.time][b.stylist] = true;
    }
  });

  res.json({ date, slots });
});

// ===============================
// GET /bookings?date=YYYY-MM-DD
// ใช้สำหรับ:
// - ตาราง
// - summary
// ===============================
app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  const query = supabase
    .from('bookings')
    .select('*')
    .order('time', { ascending: true });

  if (date) query.eq('date', date);

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// ===============================
// POST /bookings
// จองคิวใหม่
// ===============================
app.post('/bookings', async (req, res) => {
  const {
    date,
    time,
    name,
    phone = '0',
    stylist,
    gender,
    service,
  } = req.body;

  // -------- validation --------
  if (!date || !time || !name || !stylist || !gender || !service) {
    return res.status(400).json({
      error: 'missing required fields',
    });
  }

  if (!['Bank', 'Sindy', 'Assist'].includes(stylist)) {
    return res.status(400).json({ error: 'invalid stylist' });
  }

  if (!['male', 'female'].includes(gender)) {
    return res.status(400).json({ error: 'invalid gender' });
  }

  // -------- check conflict --------
  const { data: conflict } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('stylist', stylist)
    .limit(1);

  if (conflict && conflict.length > 0) {
    return res.status(409).json({
      error: 'time slot already booked for this stylist',
    });
  }

  // -------- insert --------
  const { data, error } = await supabase.from('bookings').insert([
    {
      date,
      time,
      name,
      phone,
      stylist,
      gender,
      service,
    },
  ]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, data });
});

// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

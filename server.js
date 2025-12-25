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

// หน้าเว็บ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// bookings ตามวัน
app.get('/bookings', async (req, res) => {
  const { date } = req.query;

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date)
    .order('time');

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// สร้าง booking
app.post('/bookings', async (req, res) => {
  const { date, time, name, phone, stylist, gender, service } = req.body;

  if (!date || !time || !name || !stylist || !gender) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  }

  const { error } = await supabase.from('bookings').insert([{
    date,
    time,
    name,
    phone,
    stylist,
    gender,
    service
  }]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// ลบ booking
app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// days ที่มีคิว (สำหรับปฏิทินวงเขียว)
app.get('/calendar', async (req, res) => {
  const { month } = req.query; // YYYY-MM

  const { data, error } = await supabase
    .from('bookings')
    .select('date')
    .like('date', `${month}%`);

  if (error) return res.status(400).json({ error: error.message });

  const days = [...new Set(data.map(d => d.date))];
  res.json(days);
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

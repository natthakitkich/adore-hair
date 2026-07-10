import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
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
   SUPABASE CLIENT
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   CLOSED DAYS FILE STORAGE
========================= */
const DATA_DIR = path.join(__dirname, 'data');
const CLOSED_DAYS_FILE = path.join(DATA_DIR, 'closed-days.json');

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

async function ensureClosedDaysFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(CLOSED_DAYS_FILE);
  } catch {
    await fs.writeFile(CLOSED_DAYS_FILE, '[]\n', 'utf8');
  }
}

async function readClosedDays() {
  await ensureClosedDaysFile();

  try {
    const raw = await fs.readFile(CLOSED_DAYS_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed.filter(isValidDateString))].sort();
  } catch (error) {
    console.error('[ClosedDays] Read error', error);
    return [];
  }
}

async function writeClosedDays(days) {
  await ensureClosedDaysFile();

  const normalized = [...new Set(days.filter(isValidDateString))].sort();
  await fs.writeFile(
    CLOSED_DAYS_FILE,
    `${JSON.stringify(normalized, null, 2)}\n`,
    'utf8'
  );

  return normalized;
}

async function isShopClosed(date) {
  const closedDays = await readClosedDays();
  return closedDays.includes(date);
}

/* =========================
   ROUTES
========================= */

// serve frontend
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* ---------- DEVELOP ----------
   Get closed days
---------------------------- */
app.get('/closed-days', async (_, res) => {
  try {
    const closedDays = await readClosedDays();
    res.json(closedDays);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load closed days' });
  }
});

/* ---------- DEVELOP ----------
   Close shop on a date
---------------------------- */
app.post('/closed-days', async (req, res) => {
  const { date } = req.body;

  if (!isValidDateString(date)) {
    return res.status(400).json({ error: 'Invalid date' });
  }

  try {
    const closedDays = await readClosedDays();

    if (!closedDays.includes(date)) {
      closedDays.push(date);
    }

    const updated = await writeClosedDays(closedDays);
    res.status(201).json({ success: true, date, closedDays: updated });
  } catch (error) {
    console.error('[ClosedDays] Write error', error);
    res.status(500).json({ error: 'Unable to save closed day' });
  }
});

/* ---------- DEVELOP ----------
   Reopen shop on a date
---------------------------- */
app.delete('/closed-days/:date', async (req, res) => {
  const { date } = req.params;

  if (!isValidDateString(date)) {
    return res.status(400).json({ error: 'Invalid date' });
  }

  try {
    const closedDays = await readClosedDays();
    const updated = await writeClosedDays(
      closedDays.filter(closedDate => closedDate !== date)
    );

    res.json({ success: true, date, closedDays: updated });
  } catch (error) {
    console.error('[ClosedDays] Delete error', error);
    res.status(500).json({ error: 'Unable to remove closed day' });
  }
});

/* ---------- BASIC ----------
   Get bookings by date
---------------------------- */
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
    return res.status(500).json(error);
  }

  res.json(data || []);
});

/* ---------- DEVELOP ----------
   Get calendar density
---------------------------- */
app.get('/calendar-days', async (_, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('date');

  if (error) {
    return res.status(500).json(error);
  }

  const map = {};

  data.forEach(b => {
    map[b.date] = (map[b.date] || 0) + 1;
  });

  res.json(map);
});

/* ---------- BASIC ----------
   Create booking (NOTE SUPPORT)
---------------------------- */
app.post('/bookings', async (req, res) => {
  const {
    date,
    time,
    stylist,
    name,
    gender,
    phone,
    service,
    note
  } = req.body;

  if (!date || !time || !stylist || !name || !gender) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (await isShopClosed(date)) {
    return res.status(403).json({ error: 'Shop closed' });
  }

  const { data: exist } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('stylist', stylist);

  if (exist && exist.length > 0) {
    return res.status(409).json({ error: 'Slot already booked' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([
      {
        date,
        time,
        stylist,
        name,
        gender,
        phone,
        service,
        note
      }
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data);
});

/* ---------- DEVELOP ----------
   Update booking (RESCHEDULE + NOTE SUPPORT)
---------------------------- */
app.put('/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const {
    date,
    time,
    name,
    phone,
    gender,
    service,
    note
  } = req.body;

  // ดึง booking เดิมก่อน เพื่อรู้ stylist
  const { data: current, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const newDate = date || current.date;
  const newTime = time || current.time;
  const stylist = current.stylist;

  // อนุญาตให้จัดการคิวเดิมที่อยู่ในวันปิดได้
  // แต่ไม่อนุญาตให้ย้ายคิวจากวันอื่นเข้ามาในวันปิด
  if (newDate !== current.date && await isShopClosed(newDate)) {
    return res.status(403).json({ error: 'Shop closed' });
  }

  // ตรวจว่ามีคิวอื่นชนหรือไม่ (ยกเว้น id ตัวเอง)
  const { data: conflict } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', newDate)
    .eq('time', newTime)
    .eq('stylist', stylist)
    .neq('id', id);

  if (conflict && conflict.length > 0) {
    return res.status(409).json({ error: 'Slot already booked' });
  }

  const { error } = await supabase
    .from('bookings')
    .update({
      date: newDate,
      time: newTime,
      name,
      phone,
      gender,
      service,
      note
    })
    .eq('id', id);

  if (error) {
    return res.status(500).json(error);
  }

  res.json({ success: true });
});

/* ---------- BASIC ----------
   Delete booking
---------------------------- */
app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json(error);
  }

  res.json({ success: true });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Adore Hair server running on port ${PORT}`);
});

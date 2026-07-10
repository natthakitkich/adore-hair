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
   SUPABASE CLIENT
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   CLOSED DAYS — SUPABASE STORAGE
========================= */
function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

async function readClosedDays() {
  const { data, error } = await supabase
    .from('closed_days')
    .select('date')
    .order('date', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || [])
    .map(item => item.date)
    .filter(isValidDateString);
}

async function isShopClosed(date) {
  const { data, error } = await supabase
    .from('closed_days')
    .select('date')
    .eq('date', date)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

/* =========================
   ROUTES
========================= */

// serve frontend
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* ---------- PUBLIC ----------
   Serve customer queue page
---------------------------- */
app.get('/queue', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/queue.html'));
});

/* ---------- DEVELOP ----------
   Get closed days
---------------------------- */
app.get('/closed-days', async (_, res) => {
  try {
    const closedDays = await readClosedDays();
    res.json(closedDays);
  } catch (error) {
    console.error('[ClosedDays] Read error', error);
    res.status(500).json({
      error: 'Unable to load closed days'
    });
  }
});

/* ---------- DEVELOP ----------
   Close shop on a date
---------------------------- */
app.post('/closed-days', async (req, res) => {
  const { date } = req.body;

  if (!isValidDateString(date)) {
    return res.status(400).json({
      error: 'Invalid date'
    });
  }

  try {
    const { error } = await supabase
      .from('closed_days')
      .upsert(
        [{ date }],
        { onConflict: 'date' }
      );

    if (error) {
      throw error;
    }

    const closedDays = await readClosedDays();

    res.status(201).json({
      success: true,
      date,
      closedDays
    });
  } catch (error) {
    console.error('[ClosedDays] Write error', error);

    res.status(500).json({
      error: 'Unable to save closed day'
    });
  }
});

/* ---------- DEVELOP ----------
   Reopen shop on a date
---------------------------- */
app.delete('/closed-days/:date', async (req, res) => {
  const { date } = req.params;

  if (!isValidDateString(date)) {
    return res.status(400).json({
      error: 'Invalid date'
    });
  }

  try {
    const { error } = await supabase
      .from('closed_days')
      .delete()
      .eq('date', date);

    if (error) {
      throw error;
    }

    const closedDays = await readClosedDays();

    res.json({
      success: true,
      date,
      closedDays
    });
  } catch (error) {
    console.error('[ClosedDays] Delete error', error);

    res.status(500).json({
      error: 'Unable to remove closed day'
    });
  }
});

/* ---------- PUBLIC ----------
   Get public calendar status
   No customer count exposed
---------------------------- */
app.get('/public-calendar', async (_, res) => {
  try {
    const [
      { data: bookingData, error: bookingError },
      closedDays
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select('date'),
      readClosedDays()
    ]);

    if (bookingError) {
      throw bookingError;
    }

    const countMap = {};

    (bookingData || []).forEach(booking => {
      countMap[booking.date] =
        (countMap[booking.date] || 0) + 1;
    });

    const publicCalendar = {};

    Object.entries(countMap).forEach(([date, count]) => {
      if (count <= 0) {
        publicCalendar[date] = 'available';
      } else if (count <= 5) {
        publicCalendar[date] = 'low';
      } else if (count <= 10) {
        publicCalendar[date] = 'medium';
      } else {
        publicCalendar[date] = 'high';
      }
    });

    closedDays.forEach(date => {
      publicCalendar[date] = 'closed';
    });

    res.json(publicCalendar);
  } catch (error) {
    console.error('[PublicCalendar] Load error', error);

    res.status(500).json({
      error: 'Unable to load public calendar'
    });
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

  data.forEach(booking => {
    map[booking.date] =
      (map[booking.date] || 0) + 1;
  });

  res.json(map);
});

/* ---------- BASIC ----------
   Create booking
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
    return res.status(400).json({
      error: 'Missing required fields'
    });
  }

  try {
    if (await isShopClosed(date)) {
      return res.status(403).json({
        error: 'Shop closed'
      });
    }
  } catch (error) {
    console.error('[ClosedDays] Check error', error);

    return res.status(500).json({
      error: 'Unable to check shop status'
    });
  }

  const { data: exist, error: existError } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('stylist', stylist);

  if (existError) {
    return res.status(500).json(existError);
  }

  if (exist && exist.length > 0) {
    return res.status(409).json({
      error: 'Slot already booked'
    });
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
   Update booking
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

  const { data: current, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return res.status(404).json({
      error: 'Booking not found'
    });
  }

  const newDate = date || current.date;
  const newTime = time || current.time;
  const stylist = current.stylist;

  try {
    if (
      newDate !== current.date &&
      await isShopClosed(newDate)
    ) {
      return res.status(403).json({
        error: 'Shop closed'
      });
    }
  } catch (error) {
    console.error('[ClosedDays] Check error', error);

    return res.status(500).json({
      error: 'Unable to check shop status'
    });
  }

  const { data: conflict, error: conflictError } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', newDate)
    .eq('time', newTime)
    .eq('stylist', stylist)
    .neq('id', id);

  if (conflictError) {
    return res.status(500).json(conflictError);
  }

  if (conflict && conflict.length > 0) {
    return res.status(409).json({
      error: 'Slot already booked'
    });
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

  res.json({
    success: true
  });
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

  res.json({
    success: true
  });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Adore Hair server running on port ${PORT}`);
});


/* =========================================================
  BOOKINGS
   ========================================================= */
========================================================= */

/* ----- GET BOOKINGS (by date optional) ----- */
/* ----- GET BOOKINGS ----- */
app.get('/bookings', async (req, res) => {
const { date } = req.query;

  let query = supabase
  let q = supabase
.from('bookings')
.select('*')
.order('time', { ascending: true });

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query;
  if (date) q = q.eq('date', date);

  if (error) {
    console.error(error);
    return res.json([]);
  }
  const { data, error } = await q;
  if (error) return res.json([]);

res.json(data || []);
});

/* ----- CREATE BOOKING ----- */
/* ----- CREATE BOOKING (with duplicate guard) ----- */
app.post('/bookings', async (req, res) => {
  const { date, time, name, phone, stylist, gender, service } = req.body;
  const { date, time, stylist, name, gender, phone, service } = req.body;

  if (!date || !time || !name || !stylist || !gender) {
  if (!date || !time || !stylist || !name || !gender) {
return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
}

  /* 🔒 CHECK DUPLICATE: same date + time + stylist */
  const { data: exists } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('stylist', stylist)
    .limit(1);

  if (exists && exists.length > 0) {
    return res.status(409).json({
      error: 'เวลานี้ช่างคนนี้ถูกจองแล้ว'
    });
  }

const { error } = await supabase
.from('bookings')
    .insert([{ date, time, name, phone, stylist, gender, service }]);
    .insert([{ date, time, stylist, name, gender, phone, service }]);

if (error) {
    console.error(error);
return res.status(400).json({ error: error.message });
}

res.json({ ok: true });
});

/* ----- DELETE BOOKING ----- */
/* ----- DELETE ----- */
app.delete('/bookings/:id', async (req, res) => {
await supabase
.from('bookings')
@@ -83,47 +91,9 @@ app.delete('/bookings/:id', async (req, res) => {
res.json({ ok: true });
});

/* =========================================================
   CALENDAR SUMMARY (หัวใจของปฏิทิน)
   ========================================================= */

/*
  ส่งออกเป็น:
  {
    "2025-12-25": 3,
    "2025-12-26": 8,
    ...
  }

  ✔ นับทุก booking จริง (Bank / Sindy / Assist)
  ✔ normalize date → ตัดปัญหา timezone
*/
app.get('/calendar-days', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('date');

  if (error) {
    console.error(error);
    return res.json({});
  }

  const map = {};

  data.forEach(b => {
    if (!b.date) return;

    // normalize date → YYYY-MM-DD
    const d = b.date.slice(0, 10);
    map[d] = (map[d] || 0) + 1;
  });

  res.json(map);
});

/* =========================================================
  SLOTS (13:00–22:00)
   ========================================================= */
========================================================= */

app.get('/slots', async (req, res) => {
const { date } = req.query;
@@ -139,23 +109,40 @@ app.get('/slots', async (req, res) => {
};
}

  const { data, error } = await supabase
  const { data } = await supabase
.from('bookings')
.select('time, stylist')
.eq('date', date);

  if (!error && data) {
    data.forEach(b => {
      if (slots[b.time] && slots[b.time][b.stylist] !== undefined) {
        slots[b.time][b.stylist] = true;
      }
    });
  }
  (data || []).forEach(b => {
    if (slots[b.time] && slots[b.time][b.stylist] !== undefined) {
      slots[b.time][b.stylist] = true; // 🔒 mark as booked
    }
  });

res.json({ slots });
});

/* ===== START SERVER ===== */
/* =========================================================
   CALENDAR DAYS
========================================================= */

app.get('/calendar-days', async (req, res) => {
  const { data } = await supabase
    .from('bookings')
    .select('date');

  const map = {};
  (data || []).forEach(b => {
    if (!b.date) return;
    const d = b.date.slice(0, 10);
    map[d] = (map[d] || 0) + 1;
  });

  res.json(map);
});

/* ===== START ===== */
app.listen(PORT, () => {
console.log('Server running on port', PORT);
});

import express from 'express';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const app = express();
const PORT = Number(process.env.PORT || 3000);

const APP_URL = new URL(
  process.env.APP_URL || 'http://localhost:3000'
);

const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';

// จำการเข้าสู่ระบบ 365 วัน
// ต่ออายุเมื่อมีการใช้งานและผ่านการต่ออายุครั้งก่อนอย่างน้อย 1 วัน
const SESSION_SECONDS = 365 * 24 * 60 * 60;
const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  OWNER_PASSWORD.length < 12 ||
  SESSION_SECRET.length < 32
) {
  throw new Error(
    'กรุณาตั้งค่า Supabase, OWNER_PASSWORD อย่างน้อย 12 ตัว ' +
    'และ SESSION_SECRET อย่างน้อย 32 ตัว'
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

app.disable('x-powered-by');

app.use(express.json({
  limit: '1mb',
  verify(req, res, buffer) {
    req.rawBody = buffer;
  }
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (
      req.path !== '/line/webhook' &&
      req.headers.origin &&
      req.headers.origin !== APP_URL.origin
    ) {
      return res.status(403).json({
        error: 'Origin ไม่ถูกต้อง'
      });
    }
  }

  next();
});

function same(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));

  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function sign(value) {
  return createHmac('sha256', SESSION_SECRET)
    .update(value)
    .digest('hex');
}

function hasSession(req) {
  const raw = (req.headers.cookie || '')
    .split(';')
    .map(x => x.trim())
    .find(x => x.startsWith('adore_session='))
    ?.slice('adore_session='.length);

  if (!raw) return false;

  const [expires, nonce, signature] = raw.split('.');

  if (!expires || !nonce || !signature) return false;
  if (!Number.isFinite(Number(expires))) return false;
  if (Number(expires) <= Date.now()) return false;

  if (!same(signature, sign(`${expires}.${nonce}`))) {
    return false;
  }

  return {
    expires: Number(expires),
    nonce
  };
}

function cookie(value, seconds) {
  return [
    `adore_session=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${seconds}`,
    APP_URL.protocol === 'https:' ? 'Secure' : ''
  ].filter(Boolean).join('; ');
}

function owner(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');

  const session = hasSession(req);

  if (!session) {
    return res.status(401).json({
      error: 'กรุณาเข้าสู่ระบบเจ้าของร้าน'
    });
  }

  // ต่ออายุอัตโนมัติ รวมถึงเซสชันเดิมที่ยังไม่หมดอายุ
  if (
    session.expires - Date.now() <=
    SESSION_SECONDS * 1000 - SESSION_RENEW_AFTER_MS
  ) {
    const value =
      `${Date.now() + SESSION_SECONDS * 1000}.${session.nonce}`;

    res.setHeader(
      'Set-Cookie',
      cookie(`${value}.${sign(value)}`, SESSION_SECONDS)
    );
  }

  next();
}

function problem(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

const route = fn => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

// จำกัดความถี่
const rateBuckets = new Map();

function limit(label, maximum, milliseconds) {
  return (req, res, next) => {
    const key = `${label}:${req.ip}`;
    const now = Date.now();
    let item = rateBuckets.get(key);

    if (!item || item.until <= now) {
      item = {
        count: 0,
        until: now + milliseconds
      };

      rateBuckets.set(key, item);
    }

    item.count += 1;

    if (item.count > maximum) {
      res.setHeader(
        'Retry-After',
        String(Math.ceil((item.until - now) / 1000))
      );

      return res.status(429).json({
        error: 'ทำรายการถี่เกินไป กรุณารอสักครู่'
      });
    }

    next();
  };
}

setInterval(() => {
  const now = Date.now();

  for (const [key, item] of rateBuckets) {
    if (item.until <= now) {
      rateBuckets.delete(key);
    }
  }
}, 60000).unref();

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

function validTime(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(
    value || ''
  );
}

function phone(value) {
  const raw = String(value || '').replace(/[^\d+]/g, '');

  return raw.startsWith('+66')
    ? `0${raw.slice(3)}`
    : raw;
}

async function db(query) {
  const { data, error } = await query;

  if (error) throw error;

  return data;
}

async function command(action, payload) {
  return db(supabase.rpc('adore_owner_command', {
    p_action: action,
    p: payload
  }));
}

async function closedDates(table) {
  const rows = await db(
    supabase.from(table).select('date')
  );

  return (rows || []).map(x => x.date);
}

async function bookingDates() {
  const dates = [];

  for (let offset = 0; ; offset += 1000) {
    const rows = await db(
      supabase.from('bookings')
        .select('date')
        .order('id')
        .range(offset, offset + 999)
    );

    dates.push(...(rows || []).map(x => x.date));

    if (!rows || rows.length < 1000) break;
  }

  return dates;
}

function publicRequest(request) {
  return {
    booking_code: request.booking_code,
    date: request.date,
    time: request.time,
    gender: request.gender,
    duration_minutes: request.duration_minutes,
    status: request.status,
    notified: Boolean(request.line_sent_at)
  };
}

function bookingPayload(body) {
  const payload = {
    date: String(body.date || ''),
    time: String(body.time || ''),
    stylist: String(body.stylist || ''),
    name: String(body.name || '').trim(),
    phone: phone(body.phone),
    gender: String(body.gender || ''),
    service: String(body.service || '').trim(),
    note: String(body.note || '').trim() || null,
    duration_minutes: Number(body.duration_minutes ?? 60)
  };

  if (
    !validDate(payload.date) ||
    !validTime(payload.time) ||
    !['Bank', 'Sindy', 'Assist'].includes(payload.stylist) ||
    !['male', 'female'].includes(payload.gender) ||
    !payload.name ||
    payload.name.length > 100 ||
    payload.phone.length > 20 ||
    payload.service.length > 200 ||
    (payload.note || '').length > 2000 ||
    !Number.isInteger(payload.duration_minutes) ||
    payload.duration_minutes < 30 ||
    payload.duration_minutes > 600 ||
    payload.duration_minutes % 30 !== 0
  ) {
    throw problem('กรุณาตรวจสอบข้อมูลการจอง');
  }

  return payload;
}


function minuteOf(time) {
  const [hour, minute] = String(time).slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
}

function overlapsRange(start, duration, otherStart, otherDuration) {
  const end = start + duration;
  const otherEnd = otherStart + otherDuration;
  return start < otherEnd && end > otherStart;
}

function bookingConflict(rows, payload) {
  const start = minuteOf(payload.time);

  return (rows || []).find(row =>
    row.date === payload.date &&
    row.stylist === payload.stylist &&
    overlapsRange(
      start,
      payload.duration_minutes,
      minuteOf(row.time),
      Number(row.duration_minutes || 60)
    )
  );
}

// เข้าสู่ระบบ
app.post(
  '/owner/login',
  limit('login', 20, 15 * 60000),
  route(async (req, res) => {
    if (!same(req.body.password || '', OWNER_PASSWORD)) {
      throw problem('รหัสผ่านไม่ถูกต้อง', 401);
    }

    const value =
      `${Date.now() + SESSION_SECONDS * 1000}.` +
      randomBytes(16).toString('hex');

    res.setHeader(
      'Set-Cookie',
      cookie(`${value}.${sign(value)}`, SESSION_SECONDS)
    );

    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true });
  })
);

app.get('/owner/session', owner, (req, res) => {
  res.json({
    success: true,
    line_ready: false
  });
});

app.post('/owner/logout', (req, res) => {
  res.setHeader('Set-Cookie', cookie('', 0));
  res.json({ success: true });
});

// ส่งหน้าเว็บเดิม พร้อมส่วนเสริม
async function sendPage(res, filename, mode) {
  let html = await readFile(
    path.join(PUBLIC_DIR, filename),
    'utf8'
  );

  html = html.replace(
    /<\/head\s*>/i,
    '<link rel="stylesheet" href="/online.css"><link rel="stylesheet" href="/special-hours.css"></head>'
  );

  if (mode === 'owner') {
    // ให้เบราว์เซอร์โหลดไฟล์ปิดเสียงฉบับใหม่
    html = html.replace(
      /alert-audio\.js(?:\?[^"']*)?/g,
      'alert-audio.js?v=no-audio-1'
    );

    html = html.replace(
      /<\/body\s*>/i,
      '<script src="/online-owner.js"></script><script src="/special-hours.js"></script></body>'
    );
  } else {
    const entry = `
      <section class="online-entry">
        <a href="/book.html">
          จองคิวตัดผม / ตรวจสอบการจอง
        </a>
        <p>ตัดผมชาย · ตัดผมหญิง</p>
      </section>
    `;

    html = /<\/main\s*>/i.test(html)
      ? html.replace(/<\/main\s*>/i, `${entry}</main>`)
      : html.replace(/<\/body\s*>/i, `${entry}</body>`);
  }

  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(html);
}

app.get(
  ['/', '/index.html'],
  route(async (req, res) => {
    await sendPage(res, 'index.html', 'owner');
  })
);

app.use(['/queue', '/queue.html', '/book.html', '/api/public', '/line/webhook', '/public-calendar', '/public-closed-days'], (req, res) => {
  res.status(410).send('ร้านใช้ระบบจัดการคิวภายในเท่านั้น');
});

// วันปิดร้าน
for (const [base, table, closeAction, openAction] of [
  ['/closed-days', 'closed_days', 'close', 'open']
]) {
  app.get(base, owner, route(async (req, res) => {
    res.json(await closedDates(table));
  }));

  app.post(base, owner, route(async (req, res) => {
    if (!validDate(req.body.date)) {
      throw problem('วันที่ไม่ถูกต้อง');
    }

    res.json(await command(closeAction, {
      date: req.body.date
    }));
  }));

  app.delete(
    `${base}/:date`,
    owner,
    route(async (req, res) => {
      if (!validDate(req.params.date)) {
        throw problem('วันที่ไม่ถูกต้อง');
      }

      res.json(await command(openAction, {
        date: req.params.date
      }));
    })
  );
}

// คิวเจ้าของร้าน
app.get('/bookings', owner, route(async (req, res) => {
  let query = supabase.from('bookings')
    .select('*')
    .order('time', { ascending: true });

  if (req.query.date) {
    if (!validDate(req.query.date)) {
      throw problem('วันที่ไม่ถูกต้อง');
    }

    query = query.eq('date', req.query.date);
  }

  res.json(await db(query) || []);
}));

app.get('/calendar-days', owner, route(async (req, res) => {
  const result = {};

  for (const date of await bookingDates()) {
    result[date] = (result[date] || 0) + 1;
  }

  res.json(result);
}));

app.post('/bookings', owner, route(async (req, res) => {
  res.json(await command(
    'booking_create',
    bookingPayload(req.body)
  ));
}));

app.put('/bookings/:id', owner, route(async (req, res) => {
  const current = await db(
    supabase.from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle()
  );

  if (!current) {
    throw problem('ไม่พบรายการจอง', 404);
  }

  const payload = bookingPayload({
    ...current,
    ...req.body,
    stylist: current.stylist
  });

  res.json(await command('booking_update', {
    ...payload,
    id: req.params.id
  }));
}));

app.delete(
  '/bookings/:id',
  owner,
  route(async (req, res) => {
    res.json(await command('booking_delete', {
      id: req.params.id
    }));
  })
);

// คำขอของเจ้าของร้าน
app.get('/owner/requests', owner, route(async (req, res) => {
  const rows = await db(
    supabase.from('online_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
  );

  res.json(rows || []);
}));

// Special hours: all mutations share the database transaction lock.
app.get('/owner/special-hours', owner, route(async (req, res) => {
  if (!validDate(req.query.date)) throw problem('วันที่ไม่ถูกต้อง');
  res.json(await command('hours_list', { date: req.query.date }));
}));
app.post('/owner/special-hours/:action', owner, route(async (req, res) => {
  if (!['preview', 'add', 'delete'].includes(req.params.action)) throw problem('คำสั่งไม่ถูกต้อง');
  res.json(await command('hours_' + req.params.action, req.body));
}));
app.post('/owner/special-bookings', owner, route(async (req, res) => {
  res.json(await command('special_booking_create', bookingPayload(req.body)));
}));


// เพิ่มคิวพิเศษโดยตรง โดยไม่ต้องเปิดช่วงรับคิวล่วงหน้า
app.post('/owner/special-bookings/direct', owner, route(async (req, res) => {
  const payload = bookingPayload(req.body);
  const start = minuteOf(payload.time);
  const end = start + payload.duration_minutes;
  const overrideBlock = req.body.override_block === true;

  if (end > 1440) {
    throw problem('เวลานัดต้องจบภายในวันเดียวกัน');
  }

  const hours = await command('hours_list', {
    date: payload.date
  });

  if (hours?.shop_closed) {
    throw problem(
      'ร้านปิดทั้งวัน ต้องเปิดร้านก่อนจึงจะเพิ่มคิวใหม่ได้',
      403
    );
  }

  const blockingRule = (hours?.rules || []).find(rule =>
    rule.kind === 'closed' &&
    rule.stylist === payload.stylist &&
    overlapsRange(
      start,
      payload.duration_minutes,
      Number(rule.start_min),
      Number(rule.end_min) - Number(rule.start_min)
    )
  );

  if (blockingRule && !overrideBlock) {
    return res.status(409).json({
      error: 'ช่วงเวลานี้ถูกปิดคิวไว้',
      code: 'STYLIST_BLOCKED',
      block: {
        id: blockingRule.id,
        start_min: blockingRule.start_min,
        end_min: blockingRule.end_min,
        note: blockingRule.note || null
      }
    });
  }

  const [booked, pending] = await Promise.all([
    db(
      supabase.from('bookings')
        .select('id,date,time,stylist,duration_minutes')
        .eq('date', payload.date)
        .eq('stylist', payload.stylist)
    ),
    db(
      supabase.from('online_requests')
        .select('id,date,time,stylist,duration_minutes')
        .eq('status', 'pending')
        .eq('date', payload.date)
        .eq('stylist', payload.stylist)
    )
  ]);

  const existingConflict = bookingConflict(booked, payload);
  const pendingConflict = bookingConflict(pending, payload);

  if (existingConflict || pendingConflict) {
    return res.status(409).json({
      error: 'ช่วงเวลานี้มีคิวอยู่แล้ว กรุณาเลือกเวลาอื่น',
      code: 'BOOKING_CONFLICT'
    });
  }

  const created = await db(
    supabase.from('bookings')
      .insert(payload)
      .select('*')
      .single()
  );

  res.status(201).json(created);
}));

app.use(express.static(PUBLIC_DIR, {
  index: false,
  dotfiles: 'deny',
  maxAge: 0
}));

app.use((error, req, res, next) => {
  let status = error.status || 500;
  let message = error.message || 'เกิดข้อผิดพลาด';

  if (error.code === 'P0001') {
    status = message === 'Shop closed' ? 403 : 409;
  } else if (
    ['23505', '23P01', '40001', '40P01'].includes(error.code)
  ) {
    status = 409;
    message =
      'มีการเปลี่ยนแปลงคิวพร้อมกัน กรุณาลองใหม่';
  } else if (error.code?.startsWith('22')) {
    status = 400;
    message = 'รูปแบบข้อมูลไม่ถูกต้อง';
  }

  if (status >= 500) {
    console.error(
      '[Server]',
      error.code || error.message
    );

    message =
      'ระบบขัดข้องชั่วคราว กรุณาลองใหม่หรือติดต่อร้าน';
  }

  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(
    `Adore Hair server running on port ${PORT}`
  );

});

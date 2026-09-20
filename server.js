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

const LINE_SECRET =
  (process.env.LINE_CHANNEL_SECRET || '').trim();

const LINE_TOKEN =
  (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();

const LINE_TARGET =
  (process.env.LINE_TARGET_ID || '').trim();

const LINE_ADMINS = new Set(
  (process.env.LINE_ADMIN_IDS || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
);

const STYLISTS = (process.env.ONLINE_STYLISTS || 'Bank')
  .split(',')
  .map(x => x.trim())
  .filter(x => ['Bank', 'Sindy', 'Assist'].includes(x));

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

function lineReady() {
  return Boolean(
    LINE_SECRET &&
    LINE_TOKEN &&
    LINE_TARGET &&
    LINE_ADMINS.size &&
    STYLISTS.length
  );
}

async function db(query) {
  const { data, error } = await query;

  if (error) throw error;

  return data;
}

async function command(action, payload) {
  return db(supabase.rpc('adore_command', {
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
    line_ready: lineReady()
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
    '<link rel="stylesheet" href="/online.css"></head>'
  );

  if (mode === 'owner') {
    // ให้เบราว์เซอร์โหลดไฟล์ปิดเสียงฉบับใหม่
    html = html.replace(
      /alert-audio\.js(?:\?[^"']*)?/g,
      'alert-audio.js?v=no-audio-1'
    );

    html = html.replace(
      /<\/body\s*>/i,
      '<script src="/online-owner.js"></script></body>'
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

app.get(
  ['/queue', '/queue.html'],
  route(async (req, res) => {
    await sendPage(res, 'queue.html', 'public');
  })
);

// ปฏิทินลูกค้า
app.get('/public-calendar', route(async (req, res) => {
  const [dates, closed, publicClosed] = await Promise.all([
    bookingDates(),
    closedDates('closed_days'),
    closedDates('public_closed_days')
  ]);

  const counts = {};
  const result = {};

  for (const date of dates) {
    counts[date] = (counts[date] || 0) + 1;
  }

  for (const [date, count] of Object.entries(counts)) {
    result[date] =
      count <= 5 ? 'low' : count <= 10 ? 'medium' : 'high';
  }

  for (const date of [...closed, ...publicClosed]) {
    result[date] = 'closed';
  }

  res.setHeader('Cache-Control', 'no-store');
  res.json(result);
}));

// วันปิดร้าน
for (const [base, table, closeAction, openAction] of [
  ['/closed-days', 'closed_days', 'close', 'open'],
  [
    '/public-closed-days',
    'public_closed_days',
    'public_close',
    'public_open'
  ]
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

// จองออนไลน์
app.get('/api/public/config', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  res.json({
    ready: lineReady(),
    days_ahead: 60
  });
});

app.get(
  '/api/public/slots',
  limit('slots', 90, 60000),
  route(async (req, res) => {
    if (!validDate(req.query.date)) {
      throw problem('วันที่ไม่ถูกต้อง');
    }

    if (!['male', 'female'].includes(req.query.gender)) {
      throw problem('กรุณาเลือกบริการ');
    }

    res.setHeader('Cache-Control', 'no-store');

    res.json(await command('slots', {
      date: req.query.date,
      gender: req.query.gender,
      pool: STYLISTS
    }));
  })
);

app.post(
  '/api/public/requests',
  limit('request', 10, 3600000),
  route(async (req, res) => {
    if (!lineReady()) {
      throw problem(
        'ร้านยังไม่เปิดรับจองออนไลน์ กรุณาโทรจอง',
        503
      );
    }

    const key = String(req.body.key || '').toLowerCase();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key)
    ) {
      throw problem(
        'รหัสคำขอไม่ถูกต้อง กรุณาโหลดหน้าใหม่'
      );
    }

    if (
      !validDate(req.body.date) ||
      !validTime(req.body.time)
    ) {
      throw problem('วันที่หรือเวลาไม่ถูกต้อง');
    }

    const bookingCode =
      `AD-${key.replaceAll('-', '').slice(0, 20).toUpperCase()}`;

    const request = await command('request', {
      key,
      booking_code: bookingCode,
      customer_name:
        String(req.body.customer_name || '').trim(),
      phone: phone(req.body.phone),
      gender: req.body.gender,
      date: req.body.date,
      time: req.body.time,
      pool: STYLISTS
    });

    res.setHeader('Cache-Control', 'no-store');
    res.json(publicRequest(request));

    void notifyPending();
  })
);

app.post(
  '/api/public/status',
  limit('status', 120, 60000),
  route(async (req, res) => {
    const code =
      String(req.body.code || '').trim().toUpperCase();

    const customerPhone = phone(req.body.phone);

    if (
      !/^AD-[0-9A-F]{20}$/.test(code) ||
      !/^0[689]\d{8}$/.test(customerPhone)
    ) {
      throw problem(
        'กรุณากรอกรหัสการจองและเบอร์มือถือให้ถูกต้อง'
      );
    }

    const request = await db(
      supabase.from('online_requests')
        .select('*')
        .eq('booking_code', code)
        .eq('phone', customerPhone)
        .maybeSingle()
    );

    if (!request) {
      throw problem('ไม่พบการจองที่ตรงกับข้อมูลนี้', 404);
    }

    const result = publicRequest(request);

    if (request.status === 'confirmed') {
      const booking = await db(
        supabase.from('bookings')
          .select('date,time,duration_minutes')
          .eq('online_request_id', request.id)
          .maybeSingle()
      );

      if (booking) {
        Object.assign(result, booking);
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(result);
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

app.post(
  '/owner/requests/:id/:action',
  owner,
  route(async (req, res) => {
    if (!['approve', 'reject'].includes(req.params.action)) {
      throw problem('คำสั่งไม่ถูกต้อง');
    }

    const request = await command(req.params.action, {
      id: req.params.id,
      actor: 'Owner website'
    });

    res.json({
      status: request.status,
      booking_code: request.booking_code
    });
  })
);

// LINE API
async function lineAPI(endpoint, body, retryKey) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${LINE_TOKEN}`
  };

  if (retryKey) {
    headers['X-Line-Retry-Key'] = retryKey;
  }

  const response = await fetch(
    `https://api.line.me/v2/bot/message/${endpoint}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000)
    }
  );

  const alreadyAccepted =
    response.status === 409 &&
    response.headers.has('x-line-accepted-request-id');

  if (!response.ok && !alreadyAccepted) {
    const detail = await response.text();

    throw new Error(
      `LINE HTTP ${response.status}: ${detail.slice(0, 1000)}`
    );
  }
}

function endTime(time, duration) {
  const [hour, minute] = time.split(':').map(Number);
  const total = hour * 60 + minute + Number(duration);

  return (
    `${String(Math.floor(total / 60)).padStart(2, '0')}:` +
    String(total % 60).padStart(2, '0')
  );
}

let notifying = false;

async function notifyPending() {
  if (notifying || !lineReady()) return;

  notifying = true;

  try {
    const requests = await db(
      supabase.from('online_requests')
        .select('*')
        .eq('status', 'pending')
        .is('line_sent_at', null)
        .lte('notify_after', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(10)
    );

    for (const request of requests || []) {
      try {
        const service =
          request.gender === 'female'
            ? 'ตัดผมหญิง'
            : 'ตัดผมชาย';

        // ไม่ใส่ title หรือรูปภาพใน Buttons Template
        // เพื่อใช้ข้อความได้สูงสุด 160 ตัวอักษร
        const messageText = [
          String(request.customer_name || '').slice(0, 45),
          `${service} · ช่าง ${request.stylist}`,
          `${request.date} ${request.time.slice(0, 5)}–${endTime(
            request.time,
            request.duration_minutes
          )}`,
          request.phone
        ].join('\n');

        await lineAPI(
          'push',
          {
            to: LINE_TARGET,
            messages: [{
              type: 'template',
              altText:
                `มีคำขอจองใหม่ ${request.date} ` +
                request.time.slice(0, 5),
              template: {
                type: 'buttons',
                text: messageText,
                actions: [
                  {
                    type: 'postback',
                    label: 'อนุมัติ',
                    data: `action=approve&id=${request.id}`
                  },
                  {
                    type: 'postback',
                    label: 'ปฏิเสธ',
                    data: `action=reject&id=${request.id}`
                  }
                ]
              }
            }]
          },
          request.id
        );

        await db(
          supabase.from('online_requests')
            .update({
              line_sent_at: new Date().toISOString(),
              line_error: null
            })
            .eq('id', request.id)
        );

        console.log(
          '[LINE sent]',
          request.booking_code
        );
      } catch (error) {
        console.error(
          '[LINE push]',
          request.booking_code,
          error.message
        );

        const attempts =
          Number(request.notify_attempts || 0) + 1;

        const wait = Math.min(
          3600,
          30 * (2 ** Math.min(attempts, 7))
        );

        await db(
          supabase.from('online_requests')
            .update({
              notify_attempts: attempts,
              line_error:
                String(error.message).slice(0, 1500),
              notify_after:
                new Date(Date.now() + wait * 1000).toISOString()
            })
            .eq('id', request.id)
        );
      }
    }
  } catch (error) {
    console.error(
      '[LINE notification]',
      error.code || error.message
    );
  } finally {
    notifying = false;
  }
}

// รับคำสั่งจาก LINE
app.post('/line/webhook', route(async (req, res) => {
  if (!LINE_SECRET) {
    throw problem('LINE ยังไม่ได้ตั้งค่า', 503);
  }

  const expected = createHmac('sha256', LINE_SECRET)
    .update(req.rawBody || Buffer.alloc(0))
    .digest('base64');

  if (
    !same(
      expected,
      req.headers['x-line-signature'] || ''
    )
  ) {
    throw problem('Invalid LINE signature', 401);
  }

  for (const event of req.body.events || []) {
    const source = event.source || {};

    if (
      event.type === 'message' &&
      event.message?.type === 'text' &&
      event.message.text.trim() === '/id'
    ) {
      console.log(
        '[LINE setup IDs]',
        JSON.stringify({
          userId: source.userId,
          groupId: source.groupId,
          roomId: source.roomId
        })
      );

      continue;
    }

    if (event.type !== 'postback') continue;

    const origin =
      source.groupId || source.roomId || source.userId;

    if (
      !LINE_ADMINS.has(source.userId) ||
      origin !== LINE_TARGET
    ) {
      continue;
    }

    const params = new URLSearchParams(
      event.postback?.data || ''
    );

    const action = params.get('action');
    const id = params.get('id');

    if (
      !['approve', 'reject'].includes(action) ||
      !/^[0-9a-f-]{36}$/i.test(id || '')
    ) {
      continue;
    }

    let text;

    try {
      const request = await command(action, {
        id,
        actor: `LINE:${source.userId}`
      });

      const labels = {
        pending: 'รออนุมัติ',
        confirmed: 'ยืนยันการจองแล้ว',
        rejected: 'ปฏิเสธคำขอแล้ว',
        cancelled: 'ยกเลิกแล้ว'
      };

      text = [
        labels[request.status],
        request.customer_name,
        `${request.date} ${request.time.slice(0, 5)}`
      ].join('\n');
    } catch (error) {
      if (error.code !== 'P0001') throw error;
      text = error.message;
    }

    if (event.replyToken) {
      try {
        await lineAPI('reply', {
          replyToken: event.replyToken,
          messages: [{
            type: 'text',
            text
          }]
        });
      } catch (error) {
        console.error('[LINE reply]', error.message);
      }
    }
  }

  res.sendStatus(200);
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

  console.log(`LINE configured: ${lineReady()}`);

  void notifyPending();
});

setInterval(
  () => void notifyPending(),
  30000
).unref();

// END ADORE SERVER REMEMBER DEVICE

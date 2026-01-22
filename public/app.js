const API = '';
const OWNER_PIN = '1234';

/* =========================
   ELEMENTS
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

const calendarTitle = document.getElementById('calendarTitle');
const calendarDaysEl = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

const bookingForm = document.getElementById('bookingForm');
const timeSelect = document.getElementById('time');
const listEl = document.getElementById('list');

/* OPTIONAL ELEMENTS */
const noteInput = document.getElementById('note');
const editNote = document.getElementById('editNote');

/* =========================
   STATE
========================= */
let bookings = [];
let calendarDensity = {};

let selectedStylist = 'Bank';
let selectedDate = getTodayTH();

let viewMonth = new Date(selectedDate).getMonth();
let viewYear = new Date(selectedDate).getFullYear();

/* =========================
   VOICE STATE
========================= */
/* =========================
   AUDIO UNLOCK STATE (NEW)
   ใช้สำหรับ Safari / iOS
========================= */
let audioUnlocked = false;
let announcedQueueIds = new Set();

/* =========================
   LOGIN
========================= */
/* =========================
   LOGIN (FIXED + iOS SAFE)
========================= */
loginBtn.onclick = () => {
  const pin = pinInput.value.trim();
  loginMsg.textContent = '';

  if (pin.length !== 4) {
    loginMsg.textContent = 'กรุณาใส่ PIN 4 หลัก';
    return;
  }

  if (pin !== OWNER_PIN) {
    loginMsg.textContent = 'รหัสผ่านไม่ถูกต้อง';
    return;
  }

  localStorage.setItem('adore_logged_in', '1');
  loginOverlay.classList.add('hidden');
  init();

  // ❌ ไม่เรียก speak ตรงนี้
  // 🔊 เสียงจะไปพูดตอน user แตะจอครั้งแรกแทน
};


pinInput.addEventListener('input', () => {
  pinInput.value = pinInput.value.replace(/\D/g, '');
});

logoutBtn.onclick = () => {
  localStorage.removeItem('adore_logged_in');
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('adore_logged_in') === '1') {
    loginOverlay.classList.add('hidden');
    init();
  }
});

/* =========================
   INIT
========================= */
function init() {
  bindStylistTabs();
  loadCalendar();
  loadBookings();
}

/* =========================
   CALENDAR
========================= */
async function loadCalendar() {
  const res = await fetch(`${API}/calendar-days`);
  calendarDensity = await res.json();
  renderCalendar();
}

function renderCalendar() {
  calendarDaysEl.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  calendarTitle.textContent =
    firstDay.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  for (let i = 0; i < startDay; i++) {
    calendarDaysEl.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = calendarDensity[date] || 0;

    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = d;

    if (date === selectedDate) el.classList.add('today');
    if (count > 0 && count <= 5) el.classList.add('low');
    if (count > 5 && count <= 10) el.classList.add('mid');
    if (count > 10) el.classList.add('high');

    el.onclick = () => {
      selectedDate = date;
      loadBookings();
      renderCalendar();
    };

    calendarDaysEl.appendChild(el);
  }
}

prevMonthBtn.onclick = () => {
  viewMonth--;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear--;
  }
  renderCalendar();
};

nextMonthBtn.onclick = () => {
  viewMonth++;
  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }
  renderCalendar();
};

/* =========================
   BOOKINGS
========================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${selectedDate}`);
  bookings = await res.json();

  renderSummary();
  renderTimeOptions();
  renderTable();
}

function bindStylistTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      selectedStylist = tab.dataset.tab;
      renderTimeOptions();
    };
  });
}

function renderTimeOptions() {
  timeSelect.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;
    const booked = bookings.find(
      b => b.time === time && b.stylist === selectedStylist
    );

    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0, 5);
    if (booked) opt.disabled = true;

    timeSelect.appendChild(opt);
  }
}

/* =========================
   SUMMARY
========================= */
function renderSummary() {
  const bank = bookings.filter(b => b.stylist === 'Bank').length;
  const sindy = bookings.filter(b => b.stylist === 'Sindy').length;
  const assist = bookings.filter(b => b.stylist === 'Assist').length;

  document.getElementById('countBank').textContent = bank;
  document.getElementById('countSindy').textContent = sindy;
  document.getElementById('countAssist').textContent = assist;
  document.getElementById('countTotal').textContent = bank + sindy + assist;
}

/* =========================
   TABLE
========================= */
function renderTable() {
  listEl.innerHTML = '';

  bookings.forEach(b => {
    const card = document.createElement('div');
    card.className = 'booking-card';

    const phoneHtml = b.phone
      ? `<a href="tel:${b.phone}" class="phone-link">${b.phone}</a>`
      : '-';

    card.innerHTML = `
      <div class="card-main">
        <div class="time-pill">${b.time.slice(0,5)}</div>
        <div class="card-main-info">
          <span class="badge ${b.stylist}">${b.stylist}</span>
          ${b.gender === 'male' ? '👨' : '👩'}
        </div>
        <button class="ghost toggle-detail">ดู</button>
      </div>

      <div class="card-sub">${b.name} · ${b.service || ''}</div>

      <div class="card-detail">
        <div class="card-sub">โทร: ${phoneHtml}</div>
        ${b.note ? `<div class="card-sub">หมายเหตุ: ${b.note}</div>` : ''}
        <div class="card-actions">
          <button class="ghost manage-btn">จัดการ</button>
        </div>
      </div>
    `;

    card.onclick = () => card.classList.toggle('expanded');

    card.querySelector('.toggle-detail').onclick = e => {
      e.stopPropagation();
      card.classList.toggle('expanded');
    };

    card.querySelector('.manage-btn').onclick = e => {
      e.stopPropagation();
      openEditModal(b);
    };

    listEl.appendChild(card);
  });
}

/* =========================
   🔊 VOICE — AI-LIKE PREMIUM (WEB MAX)
   แก้ไขเฉพาะเสียง ไม่แสดงผลบนหน้าเว็บ
========================= */

let preferredThaiVoice = null;
let preferredEnglishVoice = null;

/* ✅ เลือก voice ที่ดีที่สุดบนเครื่อง */
function prepareVoices() {
  const voices = speechSynthesis.getVoices();

  // 🇹🇭 Thai — หลีกเลี่ยง Siri ให้มากที่สุด
  preferredThaiVoice =
    voices.find(v =>
      v.lang === 'th-TH' &&
      !v.name.toLowerCase().includes('siri')
    ) ||
    voices.find(v => v.lang === 'th-TH') ||
    null;

  // 🇺🇸 English — เสียงนุ่ม อ่านชื่อสวย
  preferredEnglishVoice =
    voices.find(v =>
      v.lang.startsWith('en') &&
      v.name.toLowerCase().includes('premium')
    ) ||
    voices.find(v => v.lang.startsWith('en')) ||
    null;
}

// iOS ต้องรอ voices โหลด
speechSynthesis.onvoiceschanged = prepareVoices;

/* =========================
   Thai voice — luxury assistant
========================= */
function speakThai(text, opts = {}) {
  if (!('speechSynthesis' in window)) return;

  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'th-TH';
  u.voice = preferredThaiVoice;

  // 🎛️ ปรับโทนให้หรู
  u.rate = opts.rate ?? 1.05;     // เร็วขึ้นจากเดิม
  u.pitch = opts.pitch ?? 0.95;   // นุ่ม ไม่แหลม
  u.volume = 1;

  speechSynthesis.speak(u);
}

/* =========================
   English voice — name only
========================= */
function speakEnglish(text) {
  if (!('speechSynthesis' in window)) return;

  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.voice = preferredEnglishVoice;

  u.rate = 0.9;
  u.pitch = 0.9;
  u.volume = 1;

  speechSynthesis.speak(u);
}

/* =========================
   ✨ Luxury Queue Announcement
========================= */
function speakQueueLuxury({ customerName, stylist }) {
  speechSynthesis.cancel();

  // ประโยคหลัก (ไทย)
  speakThai(
    `ขอเรียนแจ้งเตือนค่ะ อีกประมาณ สิบ นาที
     จะถึงคิวของคุณ ${customerName}`,
    { rate: 1.0 }
  );

  // เว้นจังหวะเหมือน AI
  setTimeout(() => {
    speakThai('โดยช่าง', { rate: 1.05 });
  }, 1200);

  // อ่านชื่อช่างเป็นอังกฤษ
  setTimeout(() => {
    speakEnglish(stylist);
  }, 1600);
}

/* =========================
   🔔 Login welcome (เร็วขึ้น)
========================= */
function speakLoginReady() {
  speechSynthesis.cancel();
  speakThai('สวัสดีค่ะ ระบบแจ้งเตือนคิวพร้อมใช้งาน กรุณาเปิดหน้าเว็บทิ้งไว้หากต้องการให้มีการเรียกคิว', {
    rate: 1.15,   // 🔥 เร็วขึ้น แก้ปัญหาช้า
    pitch: 0.95
  });
}

/* =========================
   QUEUE CHECK
========================= */
function checkUpcomingQueues() {
  const now = new Date();

  bookings.forEach(b => {
    const t = new Date(`${b.date}T${b.time}`);
    const diff = (t - now) / 60000;

    if (diff > 0 && diff <= 10 && !announcedQueueIds.has(b.id)) {
      speakQueueLuxury(b.name, b.stylist);
      announcedQueueIds.add(b.id);
    }
  });
}
/* =========================================================
   🔓 AUDIO UNLOCK — MODE A (TOUCH ANYWHERE ONCE)
   ✔ Safari / iOS compliant
   ✔ ไม่กระทบ UI
   ✔ พูดครั้งเดียวต่อการเปิดเว็บ
========================================================= */

function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // 🔊 ประโยคหลังล็อกอิน (โทนหรู / AI-like)
  speakLoginReady();
}

// แตะหน้าจอครั้งแรก
document.addEventListener('touchstart', unlockAudioOnce, { once: true });
document.addEventListener('click', unlockAudioOnce, { once: true });
setInterval(checkUpcomingQueues, 60000);

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

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
   AUDIO / VOICE STATE
========================= */
let audioUnlocked = false;
let announcedQueueIds = new Set();

/* =========================
   LOGIN
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

  // ❌ ไม่เรียกเสียงตรงนี้ (Safari จะ block)
};

pinInput.addEventListener('input', () => {
  pinInput.value = pinInput.value.replace(/\D/g, '');
});

logoutBtn.onclick = () => {
  localStorage.removeItem('adore_logged_in');
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  audioUnlocked = false;

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

/* =========================
   TABLE
========================= */
function renderTable() {
  listEl.innerHTML = '';

  bookings.forEach(b => {
    const card = document.createElement('div');
    card.className = 'booking-card';

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
        <div class="card-sub">โทร: ${b.phone || '-'}</div>
        ${b.note ? `<div class="card-sub">หมายเหตุ: ${b.note}</div>` : ''}
      </div>
    `;

    card.onclick = () => card.classList.toggle('expanded');
    card.querySelector('.toggle-detail').onclick = e => {
      e.stopPropagation();
      card.classList.toggle('expanded');
    };

    listEl.appendChild(card);
  });
}

/* =========================================================
   🔊 VOICE SYSTEM — 100% VERSION
========================================================= */

let preferredThaiVoice = null;
let preferredEnglishVoice = null;

function prepareVoices() {
  const voices = speechSynthesis.getVoices();

  preferredThaiVoice =
    voices.find(v => v.lang === 'th-TH' && !v.name.toLowerCase().includes('siri'))
    || voices.find(v => v.lang === 'th-TH')
    || null;

  preferredEnglishVoice =
    voices.find(v => v.lang.startsWith('en'))
    || null;
}

speechSynthesis.onvoiceschanged = prepareVoices;

/* =========================
   SYSTEM VOICE
========================= */
function speakSystem(text) {
  if (!audioUnlocked) return;

  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'th-TH';
  u.voice = preferredThaiVoice;
  u.rate = 1.2;
  u.pitch = 1.0;

  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
/* =========================
   🔔 DING SOUND — LUXURY / LOUD
   Safari / iOS SAFE
========================= */
let audioCtx = null;

function playDing() {
  if (!audioUnlocked) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  /* 🎛️ CHARACTER */
  osc.type = 'triangle';      // ✅ นุ่ม หรู ไม่บาดหู
  osc.frequency.value = 1200; // ✅ แหลม ชัด ได้ยินแน่นอน

  gain.gain.value = 0.8;      // ✅ ดังขึ้น

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.4); // ✅ ding ยาวขึ้น
}
/* =========================
   QUEUE VOICE (WITH DING)
========================= */
function speakQueue(name, stylist) {
  speechSynthesis.cancel();

  // 🔔 ding ก่อนเรียกคิว
  playDing();

  const a = new SpeechSynthesisUtterance(
    `แจ้งเตือนค่ะ อีกประมาณ สิบ นาที จะถึงคิวของคุณ ${name}`
  );
  a.lang = 'th-TH';
  a.voice = preferredThaiVoice;
  a.rate = 0.95;
  a.pitch = 0.95;

  const byStylist = new SpeechSynthesisUtterance('โดยช่าง');
  byStylist.lang = 'th-TH';
  byStylist.voice = preferredThaiVoice;
  byStylist.rate = 1.0;

  const b = new SpeechSynthesisUtterance(stylist);
  b.lang = 'en-US';
  b.voice = preferredEnglishVoice;
  b.rate = 0.9;

  speechSynthesis.speak(a);
  setTimeout(() => speechSynthesis.speak(byStylist), 1500);
  setTimeout(() => speechSynthesis.speak(b), 1900);
}
/* =========================
   AUDIO UNLOCK (Safari)
========================= */
function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  prepareVoices(); // 👈 เพิ่มบรรทัดนี้ (สำคัญมากใน Safari)

  speakSystem(
    'สวัสดีค่ะ ระบบแจ้งเตือนคิวพร้อมใช้งานแล้ว กรุณาเปิดหน้าเว็บทิ้งไว้หากต้องการให้มีการเรียกคิวอัตโนมัติ'
  );
}

document.addEventListener('touchstart', unlockAudioOnce, { once: true });
document.addEventListener('click', unlockAudioOnce, { once: true });

/* =========================
   QUEUE CHECK
========================= */
function checkUpcomingQueues() {
  if (!audioUnlocked) return;

  const now = new Date();

  bookings.forEach(b => {
    const t = new Date(`${b.date}T${b.time}`);
    const diff = (t - now) / 60000;

    if (diff > 0 && diff <= 10 && !announcedQueueIds.has(b.id)) {
      speakQueue(b.name, b.stylist);
      announcedQueueIds.add(b.id);
    }
  });
}

setInterval(checkUpcomingQueues, 60000);

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

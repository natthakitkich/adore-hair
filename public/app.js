/* =========================================================
   ADORE HAIR — OWNER QUEUE
   FILE A : FINAL / STABLE / IOS SAFE
   ========================================================= */

/* =========================
   CONFIG
========================= */
const API = '';
const OWNER_PIN = '1234';
const TIMEZONE = 'Asia/Bangkok';

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

const timeSelect = document.getElementById('time');
const listEl = document.getElementById('list');

/* SUMMARY */
const countBank = document.getElementById('countBank');
const countSindy = document.getElementById('countSindy');
const countAssist = document.getElementById('countAssist');
const countTotal = document.getElementById('countTotal');

/* EDIT MODAL */
const editModal = document.getElementById('editModal');
const editName = document.getElementById('editName');
const editPhone = document.getElementById('editPhone');
const editNote = document.getElementById('editNote');
const editSaveBtn = document.getElementById('editSave');
const editCloseBtn = document.getElementById('editClose');

/* =========================
   STATE
========================= */
let bookings = [];
let calendarDensity = {};
let selectedStylist = 'Bank';
let selectedDate = getTodayTH();

let viewMonth = new Date(selectedDate).getMonth();
let viewYear = new Date(selectedDate).getFullYear();

let editingBooking = null;

/* =========================
   AUDIO STATE (IOS SAFE)
========================= */
let audioUnlocked = false;
let announcedQueueIds = new Set();
let audioCtx = null;

let preferredThaiVoice = null;
let preferredEnglishVoice = null;

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
};

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
   DATE UTIL (FIX TIMEZONE)
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
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
  renderTable();
}

/* =========================
   SUMMARY
========================= */
function renderSummary() {
  const bank = bookings.filter(b => b.stylist === 'Bank').length;
  const sindy = bookings.filter(b => b.stylist === 'Sindy').length;
  const assist = bookings.filter(b => b.stylist === 'Assist').length;

  countBank.textContent = bank;
  countSindy.textContent = sindy;
  countAssist.textContent = assist;
  countTotal.textContent = bank + sindy + assist;
}

/* =========================
   TABLE + MANAGE
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
        <button class="ghost manage-btn">จัดการ</button>
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
   EDIT MODAL
========================= */
function openEditModal(b) {
  editingBooking = b;
  editName.value = b.name || '';
  editPhone.value = b.phone || '';
  editNote.value = b.note || '';
  editModal.classList.add('show');
}

editCloseBtn.onclick = () => {
  editModal.classList.remove('show');
};

editSaveBtn.onclick = async () => {
  if (!editingBooking) return;

  await fetch(`${API}/bookings/${editingBooking.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: editName.value,
      phone: editPhone.value,
      note: editNote.value
    })
  });

  editModal.classList.remove('show');
  loadBookings();
};

/* =========================
   VOICE SYSTEM (SAFE)
========================= */
function prepareVoices() {
  const voices = speechSynthesis.getVoices();
  preferredThaiVoice = voices.find(v => v.lang === 'th-TH') || null;
  preferredEnglishVoice = voices.find(v => v.lang.startsWith('en')) || null;
}
speechSynthesis.onvoiceschanged = prepareVoices;

function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  prepareVoices();
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  speakSystem('สวัสดีค่ะ ระบบแจ้งเตือนคิวพร้อมใช้งานแล้ว กรุณาเปิดหน้าเว็บทิ้งไว้');
}

document.addEventListener('touchstart', unlockAudioOnce, { once: true });
document.addEventListener('click', unlockAudioOnce, { once: true });

function speakSystem(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'th-TH';
  u.voice = preferredThaiVoice;
  u.rate = 1.2;
  speechSynthesis.speak(u);
}

function playDing() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 1200;
  gain.gain.value = 0.8;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

function speakQueue(name, stylist) {
  playDing();

  const a = new SpeechSynthesisUtterance(
    `แจ้งเตือนค่ะ อีกประมาณ สิบ นาที จะถึงคิวของคุณ ${name}`
  );
  a.lang = 'th-TH';
  a.voice = preferredThaiVoice;
  a.rate = 0.95;

  const by = new SpeechSynthesisUtterance('โดยช่าง');
  by.lang = 'th-TH';
  by.voice = preferredThaiVoice;

  const b = new SpeechSynthesisUtterance(stylist);
  b.lang = 'en-US';
  b.voice = preferredEnglishVoice;

  speechSynthesis.speak(a);
  setTimeout(() => speechSynthesis.speak(by), 1500);
  setTimeout(() => speechSynthesis.speak(b), 1900);
}

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

/* =========================================================
   ADORE HAIR — OWNER QUEUE (FINAL / iOS SAFE)
========================================================= */

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

const listEl = document.getElementById('list');

/* =========================
   STATE
========================= */
let bookings = [];
let calendarDensity = {};
let selectedDate = getTodayTH();

/* =========================
   AUDIO STATE (iOS)
========================= */
let audioUnlocked = false;
let audioCtx = null;
let announcedQueueIds = new Set();

/* =========================
   LOGIN
========================= */
loginBtn.onclick = () => {
  if (pinInput.value !== OWNER_PIN) {
    loginMsg.textContent = 'รหัสไม่ถูกต้อง';
    return;
  }
  localStorage.setItem('adore_logged_in', '1');
  loginOverlay.classList.add('hidden');
  init();
};

logoutBtn.onclick = () => {
  localStorage.clear();
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('adore_logged_in')) {
    loginOverlay.classList.add('hidden');
    init();
  }
});

/* =========================
   INIT
========================= */
function init() {
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
  const now = new Date(selectedDate);
  calendarTitle.textContent =
    now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  for (let i = 1; i <= 31; i++) {
    const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = i;
    if (calendarDensity[d]) el.classList.add('low');
    el.onclick = () => {
      selectedDate = d;
      loadBookings();
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
  renderTable();
}

function renderTable() {
  listEl.innerHTML = '';
  bookings.forEach(b => {
    const card = document.createElement('div');
    card.className = 'booking-card';
    card.innerHTML = `
      <div class="card-main">
        <div class="time-pill">${b.time.slice(0,5)}</div>
        <span class="badge">${b.stylist}</span>
        <button class="ghost toggle">ดู</button>
      </div>
      <div class="card-detail">
        <div>${b.name}</div>
        <div>โทร: ${b.phone || '-'}</div>
        <button class="ghost manage">จัดการ</button>
      </div>
    `;

    card.querySelector('.toggle').onclick = e => {
      e.stopPropagation();
      card.classList.toggle('expanded');
    };

    card.querySelector('.manage').onclick = e => {
      e.stopPropagation();
      openEditModal(b);
    };

    listEl.appendChild(card);
  });
}

/* =========================================================
   EDIT MODAL — FIXED 100%
========================================================= */
function openEditModal(b) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>แก้ไขคิว</h3>
      <input id="mName" value="${b.name}">
      <input id="mPhone" value="${b.phone || ''}">
      <textarea id="mNote">${b.note || ''}</textarea>
      <button id="save">บันทึก</button>
      <button id="close">ปิด</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#close').onclick = () => overlay.remove();
  overlay.querySelector('#save').onclick = async () => {
    await fetch(`${API}/bookings/${b.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: mName.value,
        phone: mPhone.value,
        note: mNote.value
      })
    });
    overlay.remove();
    loadBookings();
  };
}

/* =========================================================
   VOICE SYSTEM — iOS / Safari SAFE
========================================================= */
let thaiVoice = null;
let enVoice = null;

speechSynthesis.onvoiceschanged = () => {
  const v = speechSynthesis.getVoices();
  thaiVoice = v.find(x => x.lang === 'th-TH' && !x.name.includes('Siri')) || v.find(x => x.lang === 'th-TH');
  enVoice = v.find(x => x.lang.startsWith('en'));
};

function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume();

  speakThai('ระบบแจ้งเตือนคิวพร้อมใช้งานแล้ว');
}

document.addEventListener('touchstart', unlockAudioOnce, { once: true });
document.addEventListener('click', unlockAudioOnce, { once: true });

function speakThai(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'th-TH';
  u.voice = thaiVoice;
  u.rate = 1.1;
  speechSynthesis.speak(u);
}

function speakEnglish(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.voice = enVoice;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

function playDing() {
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
  speakThai(`อีกประมาณ สิบ นาที จะถึงคิวของคุณ ${name}`);
  setTimeout(() => speakThai('โดยช่าง'), 1400);
  setTimeout(() => speakEnglish(stylist), 1800);
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

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

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

/* SUMMARY */
const countBank = document.getElementById('countBank');
const countSindy = document.getElementById('countSindy');
const countAssist = document.getElementById('countAssist');
const countTotal = document.getElementById('countTotal');

/* EDIT MODAL */
const editOverlay = document.getElementById('editOverlay');
const editName = document.getElementById('editName');
const editPhone = document.getElementById('editPhone');
const editService = document.getElementById('editService');
const editNote = document.getElementById('editNote');
const saveEditBtn = document.getElementById('saveEdit');
const closeEditBtn = document.getElementById('closeEdit');

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
   AUDIO STATE (iOS SAFE)
========================= */
let audioUnlocked = false;
let announcedQueueIds = new Set();

/* =========================
   LOGIN
========================= */
loginBtn.onclick = () => {
  const pin = pinInput.value.trim();
  loginMsg.textContent = '';

  if (pin !== OWNER_PIN) {
    loginMsg.textContent = 'รหัสผ่านไม่ถูกต้อง';
    return;
  }

  localStorage.setItem('adore_logged_in', '1');
  loginOverlay.classList.add('hidden');
  init();
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
   SUMMARY (กลับมาแล้ว)
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
   EDIT MODAL (ทำงานจริง)
========================= */
function openEditModal(b) {
  editingBooking = b;
  editName.value = b.name || '';
  editPhone.value = b.phone || '';
  editService.value = b.service || '';
  editNote.value = b.note || '';
  editOverlay.classList.remove('hidden');
}

saveEditBtn.onclick = async () => {
  await fetch(`${API}/bookings/${editingBooking.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: editName.value,
      phone: editPhone.value,
      service: editService.value,
      note: editNote.value
    })
  });

  editOverlay.classList.add('hidden');
  loadBookings();
};

closeEditBtn.onclick = () =>
  editOverlay.classList.add('hidden');

/* =========================
   VOICE (แยก System / Queue)
========================= */
function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  const u = new SpeechSynthesisUtterance(
    'สวัสดีค่ะ ระบบแจ้งเตือนคิวพร้อมใช้งานแล้ว'
  );
  u.lang = 'th-TH';
  u.rate = 1.15;
  speechSynthesis.speak(u);
}

document.addEventListener('click', unlockAudioOnce, { once: true });

function speakQueue(name, stylist) {
  if (!audioUnlocked) return;

  speechSynthesis.cancel();
  speechSynthesis.speak(
    new SpeechSynthesisUtterance(`อีกประมาณ สิบ นาที จะถึงคิวของคุณ ${name}`)
  );
}

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

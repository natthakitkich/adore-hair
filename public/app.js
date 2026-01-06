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

/* STORE STATUS */
const storeStatusText = document.getElementById('storeStatusText');
const toggleStoreBtn = document.getElementById('toggleStoreBtn');

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
  initStoreStatus();
  loadCalendar();      // 🔑 โหลด density ทุกครั้ง
  loadBookings();
}

/* =========================
   STORE STATUS
========================= */
function initStoreStatus() {
  const status = localStorage.getItem('adore_store_status') || 'open';
  renderStoreStatus(status);

  toggleStoreBtn.onclick = () => {
    const current =
      localStorage.getItem('adore_store_status') || 'open';
    const next = current === 'open' ? 'closed' : 'open';
    localStorage.setItem('adore_store_status', next);
    renderStoreStatus(next);
    loadCalendar(); // 🔑 ให้ ⛔️ แสดงทันที
  };
}

function renderStoreStatus(status) {
  if (status === 'open') {
    storeStatusText.textContent = 'สถานะร้าน: เปิด';
    toggleStoreBtn.textContent = 'ปิดร้าน';
    toggleStoreBtn.className = 'ghost open';
  } else {
    storeStatusText.textContent = 'สถานะร้าน: ปิด';
    toggleStoreBtn.textContent = 'เปิดร้าน';
    toggleStoreBtn.className = 'ghost closed';
  }
}

/* =========================
   CALENDAR
========================= */
async function loadCalendar() {
  try {
    const res = await fetch(`${API}/calendar-days`);
    calendarDensity = await res.json();
  } catch {
    calendarDensity = {};
  }
  renderCalendar();
}

function renderCalendar() {
  calendarDaysEl.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  calendarTitle.textContent =
    firstDay.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric'
    });

  for (let i = 0; i < startDay; i++) {
    calendarDaysEl.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date =
      `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const count = calendarDensity[date]?.count || 0;
    const closed = calendarDensity[date]?.closed;

    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = d;

    if (date === selectedDate) el.classList.add('today');
    if (closed) el.classList.add('closed');
    else if (count > 0 && count <= 5) el.classList.add('low');
    else if (count > 5 && count <= 10) el.classList.add('mid');
    else if (count > 10) el.classList.add('high');

    el.onclick = () => {
      selectedDate = date;
      loadBookings();
      renderCalendar();
    };

    calendarDaysEl.appendChild(el);
  }
}

/* 🔑 เปลี่ยนเดือนต้องโหลดใหม่เสมอ */
prevMonthBtn.onclick = () => {
  viewMonth--;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear--;
  }
  loadCalendar();
};

nextMonthBtn.onclick = () => {
  viewMonth++;
  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }
  loadCalendar();
};

/* =========================
   BOOKINGS
========================= */
async function loadBookings() {
  try {
    const res = await fetch(`${API}/bookings?date=${selectedDate}`);
    bookings = await res.json();
  } catch {
    bookings = [];
  }

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
  document.getElementById('countTotal').textContent =
    bank + sindy + assist;
}

/* =========================
   TABLE
========================= */
function renderTable() {
  listEl.innerHTML = '';

  bookings.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time.slice(0, 5)}</td>
      <td><span class="badge ${b.stylist}">${b.stylist}</span></td>
      <td>${b.gender === 'male' ? '👨' : '👩'}</td>
      <td>${b.name}</td>
      <td>${b.service || ''}</td>
      <td>${b.phone || ''}</td>
      <td>—</td>
    `;
    listEl.appendChild(tr);
  });
}

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

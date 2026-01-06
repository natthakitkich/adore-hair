/* =========================
   CONFIG
========================= */
const API = ''; // endpoint เดิม
const OWNER_PIN = '1234';
const TZ = 'Asia/Bangkok';

/* =========================
   DOM
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

const storeStatusText = document.getElementById('storeStatusText');
const storeToggleBtn = document.getElementById('toggleStoreBtn');

/* =========================
   STATE
========================= */
let bookings = [];
let densityMap = {};
let closedDays = new Set();

let selectedStylist = 'Bank';

let today = getTodayTH();
let selectedDate = today;

let viewDate = new Date(`${today}T00:00:00+07:00`);
let viewMonth = viewDate.getMonth();
let viewYear = viewDate.getFullYear();

let storeOpen = true;

/* =========================
   LOGIN
========================= */
loginBtn.onclick = () => {
  if (pinInput.value !== OWNER_PIN) {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    return;
  }
  localStorage.setItem('logged', '1');
  loginOverlay.classList.add('hidden');
  init(true);
};

if (localStorage.getItem('logged')) {
  loginOverlay.classList.add('hidden');
  init(true);
}

logoutBtn.onclick = () => {
  localStorage.removeItem('logged');
  location.reload();
};

/* =========================
   INIT
========================= */
function init(forceToday = false) {
  if (forceToday) {
    today = getTodayTH();
    selectedDate = today;
    viewDate = new Date(`${today}T00:00:00+07:00`);
    viewMonth = viewDate.getMonth();
    viewYear = viewDate.getFullYear();
  }

  bindTabs();
  bindMonthNav();
  loadCalendar();
  loadStoreStatus();
  loadBookings();
}

/* =========================
   TIME (TH)
========================= */
function getTodayTH() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/* =========================
   CALENDAR
========================= */
async function loadCalendar() {
  const res = await fetch(`${API}/calendar-days`);
  const data = await res.json();

  closedDays = new Set(data.closed || []);
  densityMap = data.density || {};

  renderCalendar();
}

function renderCalendar() {
  calendarDaysEl.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDay = firstDay.getDay(); // 0 = อา
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  calendarTitle.textContent =
    firstDay.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric'
    });

  // ช่องว่างก่อนวันแรก
  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day disabled';
    calendarDaysEl.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'day';
    cell.textContent = d;

    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    if (dateStr === today) cell.classList.add('active');
    if (dateStr === selectedDate) cell.classList.add('active');

    if (closedDays.has(dateStr)) {
      cell.classList.add('closed');
    } else {
      const count = densityMap[dateStr] || 0;
      if (count >= 14) cell.classList.add('high');
      else if (count >= 7) cell.classList.add('mid');
      else if (count > 0) cell.classList.add('low');
    }

    cell.onclick = () => {
      selectedDate = dateStr;
      loadStoreStatus();
      loadBookings();
      renderCalendar();
    };

    calendarDaysEl.appendChild(cell);
  }
}

/* =========================
   MONTH NAV
========================= */
function bindMonthNav() {
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
}

/* =========================
   STORE STATUS
========================= */
async function loadStoreStatus() {
  const res = await fetch(`${API}/store-status?date=${selectedDate}`);
  const data = await res.json();
  storeOpen = data.open;
  renderStoreStatus();
}

function renderStoreStatus() {
  storeStatusText.textContent = storeOpen ? 'สถานะร้าน: เปิด' : 'สถานะร้าน: ปิด';
  storeToggleBtn.textContent = storeOpen ? 'ปิดร้าน' : 'เปิดร้าน';
}

storeToggleBtn.onclick = async () => {
  storeOpen = !storeOpen;
  await fetch(`${API}/store-status`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ date: selectedDate, open: storeOpen })
  });
  init(true);
};

/* =========================
   BOOKINGS
========================= */
async function loadBookings() {
  if (closedDays.has(selectedDate)) {
    bookings = [];
    renderTimeOptions();
    renderTable();
    return;
  }

  const res = await fetch(`${API}/bookings?date=${selectedDate}`);
  bookings = await res.json();
  renderTimeOptions();
  renderTable();
}

function renderTimeOptions() {
  timeSelect.innerHTML = '';
  const used = bookings
    .filter(b => b.stylist === selectedStylist)
    .map(b => b.time);

  for (let h = 13; h <= 22; h++) {
    const t = `${String(h).padStart(2,'0')}:00`;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    if (used.includes(t)) opt.disabled = true;
    timeSelect.appendChild(opt);
  }
}

/* =========================
   TABLE
========================= */
function renderTable() {
  listEl.innerHTML = '';
  bookings.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time.slice(0,5)}</td>
      <td>${b.stylist}</td>
      <td>${b.gender === 'male' ? '👨' : '👩'}</td>
      <td>${b.name}</td>
      <td>${b.service}</td>
      <td>${b.phone}</td>
      <td><button class="ghost">แก้ไข</button></td>
    `;
    listEl.appendChild(tr);
  });
}

/* =========================
   TABS
========================= */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelector('.tab.active')?.classList.remove('active');
      t.classList.add('active');
      selectedStylist = t.dataset.tab;
      renderTimeOptions();
    };
  });
}

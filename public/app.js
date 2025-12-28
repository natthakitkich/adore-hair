/* =========================
   CONFIG
========================= */
const OWNER_PIN = '1234';
const TZ = 'Asia/Bangkok';
const DAILY_CAPACITY = 20;

/* =========================
   STATE
========================= */
let currentDate = '';
let todayDate = '';
let viewYear, viewMonth;
let currentStylist = 'Bank';
let bookings = [];
let calendarMap = {};

/* =========================
   ELEMENTS
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');
const pinInput = document.getElementById('pin');
const logoutBtn = document.getElementById('logoutBtn');

const dateInput = document.getElementById('date');
const calendarDays = document.getElementById('calendarDays');
const calendarTitle = document.getElementById('calendarTitle');
const list = document.getElementById('list');

const countBank = document.getElementById('countBank');
const countSindy = document.getElementById('countSindy');
const countAssist = document.getElementById('countAssist');
const countTotal = document.getElementById('countTotal');

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initDate();
  bindUI();
  loadAll();
});

/* =========================
   AUTH (FIXED)
========================= */
function initAuth() {
  if (localStorage.getItem('adore_logged_in') === '1') {
    loginOverlay.classList.add('hidden');
  }

  if (loginBtn) {
    loginBtn.onclick = () => {
      if (pinInput.value === OWNER_PIN) {
        localStorage.setItem('adore_logged_in', '1');
        loginOverlay.classList.add('hidden');
        loginMsg.textContent = '';
      } else {
        loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      }
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem('adore_logged_in');
      location.reload();
    };
  }
}

/* =========================
   DATE
========================= */
function initDate() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  todayDate = now.toISOString().slice(0, 10);
  currentDate = todayDate;

  viewYear = now.getFullYear();
  viewMonth = now.getMonth();

  if (dateInput) {
    dateInput.value = currentDate;
    dateInput.onchange = () => {
      currentDate = dateInput.value;
      loadAll();
    };
  }
}

/* =========================
   UI (SAFE)
========================= */
function bindUI() {
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');

  if (prevBtn) prevBtn.onclick = () => changeMonth(-1);
  if (nextBtn) nextBtn.onclick = () => changeMonth(1);

  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
      renderTable();
      renderSummary();
    };
  });
}

/* =========================
   MONTH
========================= */
function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear--;
  }
  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }
  renderCalendar();
}

/* =========================
   LOAD DATA
========================= */
async function loadAll() {
  await Promise.all([
    loadBookings(),
    loadCalendarMap()
  ]);
  renderCalendar();
  renderTable();
  renderSummary();
}

async function loadBookings() {
  const r = await fetch(`/bookings?date=${currentDate}`);
  bookings = await r.json();
}

async function loadCalendarMap() {
  const r = await fetch('/calendar-days');
  calendarMap = await r.json();
}

/* =========================
   CALENDAR
========================= */
function renderCalendar() {
  if (!calendarDays) return;

  calendarDays.innerHTML = '';
  calendarTitle.textContent =
    new Date(viewYear, viewMonth).toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric'
    });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarDays.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = calendarMap[dateStr] || 0;
    const ratio = count / DAILY_CAPACITY;

    const cell = document.createElement('div');
    cell.className = 'calCell';

    const num = document.createElement('div');
    num.className = 'calNum';
    num.textContent = d;

    if (count > 0) {
      if (ratio <= 0.3) num.classList.add('density-low');
      else if (ratio <= 0.65) num.classList.add('density-mid');
      else if (ratio < 1) num.classList.add('density-high');
      else num.classList.add('density-full');
    }

    if (dateStr === currentDate) cell.classList.add('selected');

    cell.onclick = () => {
      currentDate = dateStr;
      if (dateInput) dateInput.value = dateStr;
      loadAll();
    };

    cell.appendChild(num);
    calendarDays.appendChild(cell);
  }
}

/* =========================
   TABLE (FIXED: แสดงทุกช่าง)
========================= */
function renderTable() {
  if (!list) return;
  list.innerHTML = '';

  bookings
    .filter(b => b.stylist === currentStylist)
    .forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.time}</td>
        <td><span class="badge stylist-${b.stylist.toLowerCase()}">${b.stylist}</span></td>
        <td>${b.gender === 'male' ? '👨' : '👩'}</td>
        <td>${b.name}</td>
        <td>${b.service || ''}</td>
        <td>${b.phone || ''}</td>
        <td></td>
      `;
      list.appendChild(tr);
    });
}

/* =========================
   SUMMARY
========================= */
function renderSummary() {
  const c = s => bookings.filter(b => b.stylist === s).length;
  countBank.textContent = c('Bank');
  countSindy.textContent = c('Sindy');
  countAssist.textContent = c('Assist');
  countTotal.textContent = bookings.length;
}

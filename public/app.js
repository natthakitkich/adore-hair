/* =========================
   LOGIN (จำสถานะ + Logout)
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');
const pinInput = document.getElementById('pin');
const logoutBtn = document.getElementById('logoutBtn');

// เปลี่ยน PIN ตรงนี้
const OWNER_PIN = '1234';

// เช็กสถานะ login ตอนโหลด
if (localStorage.getItem('adore_logged_in') === 'true') {
  loginOverlay.classList.add('hidden');
} else {
  loginOverlay.classList.remove('hidden');
}

// Login
loginBtn.onclick = () => {
  if (pinInput.value === OWNER_PIN) {
    localStorage.setItem('adore_logged_in', 'true');
    loginOverlay.classList.add('hidden');
    loginMsg.textContent = '';
    pinInput.value = '';
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    loginMsg.classList.add('err');
  }
};

// Logout
if (logoutBtn) {
  logoutBtn.onclick = () => {
    localStorage.removeItem('adore_logged_in');
    location.reload();
  };
}

/* =========================
   STATE
========================= */
let currentDate = '';
let viewYear, viewMonth;
let currentStylist = 'Bank';
let bookings = [];

/* =========================
   ELEMENTS
========================= */
const dateInput = document.getElementById('date');
const calendarDays = document.getElementById('calendarDays');
const timeSelect = document.getElementById('time');
const list = document.getElementById('list');

const countBank = document.getElementById('countBank');
const countSindy = document.getElementById('countSindy');
const countAssist = document.getElementById('countAssist');
const countTotal = document.getElementById('countTotal');

/* =========================
   INIT
========================= */
init();

function init() {
  const today = new Date();
  currentDate = today.toISOString().slice(0, 10);
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();

  dateInput.value = currentDate;

  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);

  bindTabs();
  bindForm();
  loadAll();
}

/* =========================
   MONTH CHANGE
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
  loadCalendar();
}

/* =========================
   LOAD ALL
========================= */
async function loadAll() {
  await loadCalendar();
  await loadBookings();
  await loadSlots();
  renderTable();
  renderSummary();
}

/* =========================
   CALENDAR
========================= */
async function loadCalendar() {
  const res = await fetch('/calendar-days');
  const { days = [] } = await res.json();

  calendarDays.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarDays.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const cell = document.createElement('div');
    cell.className = 'calCell';
    cell.innerHTML = `<div class="calNum">${d}</div>`;

    if (days.includes(dateStr)) cell.classList.add('hasBookings');
    if (dateStr === currentDate) cell.classList.add('selected');

    cell.onclick = () => {
      currentDate = dateStr;
      dateInput.value = dateStr;
      loadAll();
    };

    calendarDays.appendChild(cell);
  }
}

/* =========================
   BOOKINGS
========================= */
async function loadBookings() {
  const res = await fetch(`/bookings?date=${currentDate}`);
  bookings = await res.json();
}

/* =========================
   SLOTS
========================= */
async function loadSlots() {
  timeSelect.innerHTML = '<option value="">เลือกเวลา</option>';

  const res = await fetch(`/slots?date=${currentDate}`);
  const { slots = {} } = await res.json();

  Object.keys(slots).forEach(time => {
    if (!slots[time][currentStylist]) {
      const opt = document.createElement('option');
      opt.value = time;
      opt.textContent = time;
      timeSelect.appendChild(opt);
    }
  });
}

/* =========================
   TABLE
========================= */
function renderTable() {
  list.innerHTML = '';

  bookings.forEach(b => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${b.time}</td>
      <td><span class="badge stylist-${b.stylist.toLowerCase()}">${b.stylist}</span></td>
      <td><span class="gender ${b.gender}">${b.gender === 'male' ? '👨' : '👩'}</span></td>
      <td>${b.name}</td>
      <td>${b.service || '-'}</td>
      <td>${b.phone || '-'}</td>
      <td><button class="smallBtn danger">ลบ</button></td>
    `;

    tr.querySelector('button').onclick = async () => {
      await fetch(`/bookings/${b.id}`, { method: 'DELETE' });
      loadAll();
    };

    list.appendChild(tr);
  });
}

/* =========================
   SUMMARY
========================= */
function renderSummary() {
  const count = s => bookings.filter(b => b.stylist === s).length;
  countBank.textContent = count('Bank');
  countSindy.textContent = count('Sindy');
  countAssist.textContent = count('Assist');
  countTotal.textContent = bookings.length;
}

/* =========================
   FORM
========================= */
function bindForm() {
  document.getElementById('bookingForm').onsubmit = async e => {
    e.preventDefault();

    const body = {
      date: currentDate,
      time: timeSelect.value,
      stylist: currentStylist,
      name: document.getElementById('name').value,
      phone: document.getElementById('phone').value,
      gender: document.querySelector('input[name="gender"]:checked')?.value,
      service: document.getElementById('service').value
    };

    const res = await fetch('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      e.target.reset();
      loadAll();
    }
  };
}

/* =========================
   TABS
========================= */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
      loadSlots();
    };
  });
}

const API = '';
const OWNER_PIN = '1234';

/* ================= LOGIN ================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

loginBtn.onclick = () => {
  if (pinInput.value !== OWNER_PIN) {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    return;
  }
  localStorage.setItem('logged', '1');
  loginOverlay.classList.add('hidden');
  init();
};

if (localStorage.getItem('logged')) {
  loginOverlay.classList.add('hidden');
  init();
}

logoutBtn.onclick = () => {
  localStorage.removeItem('logged');
  location.reload();
};

/* ================= GLOBAL ================= */
const calendarTitle = document.getElementById('calendarTitle');
const calendarDaysEl = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

const bookingForm = document.getElementById('bookingForm');
const timeSelect = document.getElementById('time');
const listEl = document.getElementById('list');

let bookings = [];
let selectedStylist = 'Bank';
let selectedDate = getTodayTH();

let viewDate = new Date(selectedDate);
let viewMonth = viewDate.getMonth();
let viewYear = viewDate.getFullYear();

/* ================= INIT ================= */
function init() {
  bindTabs();
  bindMonthNav();
  loadCalendar();
  loadBookings();
}

/* ================= CALENDAR ================= */
async function loadCalendar() {
  const res = await fetch(`${API}/calendar-days`);
  const density = await res.json();
  renderCalendar(density);
}

function renderCalendar(density) {
  calendarDaysEl.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0 = Sunday

  calendarTitle.textContent = firstDay.toLocaleDateString(
    'th-TH-u-ca-gregory',
    { month: 'long', year: 'numeric' }
  );

  /* ช่องว่างก่อนวันแรก (แก้ bug วันเลื่อน) */
  for (let i = 0; i < startWeekday; i++) {
    const blank = document.createElement('div');
    blank.className = 'day empty';
    calendarDaysEl.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = d;

    if (density[date]) el.classList.add('low');
    if (date === selectedDate) el.classList.add('active');

    el.onclick = () => {
      selectedDate = date;
      loadBookings();
    };

    calendarDaysEl.appendChild(el);
  }
}

function bindMonthNav() {
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
}

/* ================= BOOKINGS ================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${selectedDate}`);
  bookings = await res.json();
  renderTimeOptions();
  renderTable(); // ❗ ไม่กรองตามแท็บ
}

function renderTimeOptions() {
  timeSelect.innerHTML = '';
  for (let h = 13; h <= 22; h++) {
    const t = `${String(h).padStart(2, '0')}:00`;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  }
}

bookingForm.onsubmit = async e => {
  e.preventDefault();

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) return alert('เลือกเพศ');

  const res = await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: selectedDate,
      time: timeSelect.value,
      stylist: selectedStylist,
      name: document.getElementById('name').value,
      phone: document.getElementById('phone').value,
      gender,
      service: document.getElementById('service').value
    })
  });

  if (!res.ok) {
    alert('เกิดข้อผิดพลาดในการบันทึกคิว');
    return;
  }

  alert('บันทึกคิวเรียบร้อยแล้ว');
  bookingForm.reset();
  loadBookings();
  loadCalendar();
};

/* ================= TABLE ================= */
function stylistBadge(stylist) {
  const map = {
    Bank: '#4FC3F7',
    Sindy: '#F48FB1',
    Assist: '#81C784'
  };
  const color = map[stylist] || '#999';

  return `
    <span style="
      padding:4px 10px;
      border-radius:999px;
      border:1px solid ${color};
      color:${color};
      font-weight:600;
    ">${stylist}</span>
  `;
}

function renderTable() {
  listEl.innerHTML = '';

  bookings.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time.slice(0,5)}</td>
      <td>${stylistBadge(b.stylist)}</td>
      <td>${b.gender === 'male' ? '👨' : '👩'}</td>
      <td>${b.name}</td>
      <td>${b.service}</td>
      <td>${b.phone}</td>
      <td><button class="ghost">จัดการ</button></td>
    `;

    tr.querySelector('button').onclick = () => {
      alert('เปิด modal แก้ไข (logic เดิม)');
    };

    listEl.appendChild(tr);
  });
}

/* ================= TABS ================= */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelector('.tab.active')?.classList.remove('active');
      t.classList.add('active');
      selectedStylist = t.dataset.tab;
    };
  });
}

/* ================= UTIL ================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

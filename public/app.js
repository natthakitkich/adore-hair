/* ===== CONFIG ===== */
const OWNER_PIN = '1234';
const TZ = 'Asia/Bangkok';
const DAILY_CAPACITY = 20; // Bank + Sindy รวม 20 คิว/วัน

/* ===== STATE ===== */
let currentDate = '';
let todayDate = '';
let viewYear, viewMonth;
let currentStylist = 'Bank';
let bookings = [];
let calendarMap = {}; // { 'YYYY-MM-DD': count }

/* ===== ELEMENTS ===== */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');
const pinInput = document.getElementById('pin');
const logoutBtn = document.getElementById('logoutBtn');

const dateInput = document.getElementById('date');
const calendarDays = document.getElementById('calendarDays');
const calendarTitle = document.getElementById('calendarTitle');
const timeSelect = document.getElementById('time');
const list = document.getElementById('list');

const countBank = document.getElementById('countBank');
const countSindy = document.getElementById('countSindy');
const countAssist = document.getElementById('countAssist');
const countTotal = document.getElementById('countTotal');

const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const serviceInput = document.getElementById('service');

/* ===== INIT ===== */
init();

function init() {
  initAuth();
  initDate();
  bindUI();
  loadAll();
}

/* ===== AUTH ===== */
function initAuth() {
  if (localStorage.getItem('adore_logged_in') === '1') {
    loginOverlay.classList.add('hidden');
  }

  loginBtn.onclick = () => {
    if (pinInput.value === OWNER_PIN) {
      localStorage.setItem('adore_logged_in', '1');
      loginOverlay.classList.add('hidden');
    } else {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    }
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem('adore_logged_in');
    location.reload();
  };
}

/* ===== DATE ===== */
function initDate() {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: TZ })
  );

  todayDate = now.toISOString().slice(0, 10);
  currentDate = todayDate;
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  dateInput.value = currentDate;
}

/* ===== UI ===== */
function bindUI() {
  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);

  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      currentStylist = t.dataset.tab;
      loadSlots();
    };
  });

  document.getElementById('bookingForm').onsubmit = submitForm;
}

/* ===== MONTH ===== */
function changeMonth(d) {
  viewMonth += d;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
}

/* ===== LOAD ALL ===== */
async function loadAll() {
  await Promise.all([
    loadBookings(),
    loadCalendarMap()
  ]);
  renderCalendar();
  loadSlots();
  renderTable();
  renderSummary();
}

/* ===== BOOKINGS ===== */
async function loadBookings() {
  const r = await fetch(`/bookings?date=${currentDate}`);
  bookings = await r.json();
}

/* ===== CALENDAR MAP (จำนวนคิวต่อวัน) ===== */
async function loadCalendarMap() {
  const r = await fetch('/calendar-days');
  calendarMap = await r.json();
}

/* ===== CALENDAR (เปลี่ยนสีตามความหนาแน่น) ===== */
function renderCalendar() {
  calendarDays.innerHTML = '';

  calendarTitle.textContent =
    new Date(viewYear, viewMonth)
      .toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarDays.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr =
      `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const count = calendarMap[dateStr] || 0;
    const ratio = count / DAILY_CAPACITY;

    const cell = document.createElement('div');
    cell.className = 'calCell';

    const num = document.createElement('div');
    num.className = 'calNum';
    num.textContent = d;

    // 🎯 กำหนดสีตามความหนาแน่น
    if (count > 0) {
      if (ratio <= 0.3) num.classList.add('density-low');       // เขียว
      else if (ratio <= 0.65) num.classList.add('density-mid'); // เหลือง
      else if (ratio < 1) num.classList.add('density-high');    // ส้ม
      else num.classList.add('density-full');                   // แดง
    }

    if (dateStr === currentDate) cell.classList.add('selected');

    cell.onclick = () => {
      currentDate = dateStr;
      dateInput.value = dateStr;
      loadAll();
    };

    cell.appendChild(num);
    calendarDays.appendChild(cell);
  }
}

/* ===== SLOTS ===== */
async function loadSlots() {
  timeSelect.innerHTML = '<option value="">เลือกเวลา</option>';

  const r = await fetch(`/slots?date=${currentDate}`);
  const { slots = {} } = await r.json();

  Object.entries(slots).forEach(([time, status]) => {
    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0, 5);

    if (status[currentStylist]) {
      opt.disabled = true;
      opt.textContent += ' (เต็ม)';
    }

    timeSelect.appendChild(opt);
  });
}

/* ===== TABLE ===== */
function renderTable() {
  list.innerHTML = '';

  bookings.forEach(b => {
    const tr = document.createElement('tr');
    const genderIcon = b.gender === 'male' ? '👨' : '👩';

    tr.innerHTML = `
      <td>${b.time.slice(0,5)}</td>
      <td><span class="badge stylist-${b.stylist.toLowerCase()}">${b.stylist}</span></td>
      <td>${genderIcon}</td>
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

/* ===== SUMMARY ===== */
function renderSummary() {
  const c = s => bookings.filter(b => b.stylist === s).length;
  countBank.textContent = c('Bank');
  countSindy.textContent = c('Sindy');
  countAssist.textContent = c('Assist');
  countTotal.textContent = bookings.length;
}

/* ===== FORM ===== */
async function submitForm(e) {
  e.preventDefault();

  const body = {
    date: currentDate,
    time: timeSelect.value,
    stylist: currentStylist,
    name: nameInput.value,
    phone: phoneInput.value,
    gender: document.querySelector('[name="gender"]:checked')?.value,
    service: serviceInput.value
  };

  const r = await fetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (r.ok) {
    e.target.reset();
    loadAll();
  } else {
    const err = await r.json();
    alert(err.error || 'ไม่สามารถจองได้');
  }
}

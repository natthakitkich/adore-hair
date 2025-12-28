/* ===== CONFIG ===== */
const DAILY_CAPACITY = 20;

/* ===== STATE ===== */
let currentDate = '';
let todayDate = '';
let viewYear, viewMonth;
let currentStylist = 'Bank';
let bookings = [];
let calendarMap = {};

/* ===== ELEMENTS ===== */
const dateInput = document.getElementById('date');
const calendarDays = document.getElementById('calendarDays');
const calendarTitle = document.getElementById('calendarTitle');
const timeSelect = document.getElementById('time');
const list = document.getElementById('list');

const countBank = document.getElementById('countBank');
const countSindy = document.getElementById('countSindy');
const countAssist = document.getElementById('countAssist');
const countTotal = document.getElementById('countTotal');

/* ===== INIT ===== */
init();

function init() {
  const now = new Date();
  todayDate = now.toISOString().slice(0, 10);
  currentDate = todayDate;

  viewYear = now.getFullYear();
  viewMonth = now.getMonth();

  dateInput.value = currentDate;

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

  loadAll();
}

/* ===== MONTH ===== */
async function changeMonth(d) {
  viewMonth += d;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }

  await loadCalendarMap();
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

/* ===== DATA ===== */
async function loadBookings() {
  const r = await fetch(`/bookings?date=${currentDate}`);
  bookings = await r.json();
}

async function loadCalendarMap() {
  const r = await fetch('/calendar-days');
  calendarMap = await r.json();
}

/* ===== CALENDAR ===== */
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
      `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    const cell = document.createElement('div');
    cell.className = 'calCell';

    const num = document.createElement('div');
    num.className = 'calNum';
    num.textContent = d;

    const dayData = calendarMap[dateStr];
    if (dayData) {
      num.classList.add('split');

      const level = r =>
        r >= 1 ? 'full' :
        r >= 0.7 ? 'high' :
        r >= 0.4 ? 'mid' :
        r > 0 ? 'low' : null;

      // 👉 Bank = ซ้าย / Sindy = ขวา
      const bankLevel = level((dayData.Bank || 0) / 10);
      const sindyLevel = level((dayData.Sindy || 0) / 10);

      if (bankLevel) num.classList.add(`bank-${bankLevel}`);
      if (sindyLevel) num.classList.add(`sindy-${sindyLevel}`);
    }

    if (dateStr === currentDate) {
      cell.classList.add('selected');
    }

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
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    gender: document.querySelector('[name="gender"]:checked')?.value,
    service: document.getElementById('service').value
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
    alert('ไม่สามารถจองได้');
  }
}

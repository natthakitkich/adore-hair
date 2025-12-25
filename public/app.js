/* =========================
   STATE
========================= */
let currentDate = '';
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
  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
  currentDate = today;

  bindTabs();
  bindForm();
  loadAll();
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
  const json = await res.json();
  const daysWithBooking = json.days || [];

  calendarDays.innerHTML = '';

  const d = new Date(currentDate);
  const year = d.getFullYear();
  const month = d.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarDays.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const cell = document.createElement('div');
    cell.className = 'calDay';
    cell.textContent = day;

    if (daysWithBooking.includes(dateStr)) {
      cell.classList.add('hasBooking');
    }

    cell.onclick = () => {
      dateInput.value = dateStr;
      currentDate = dateStr;
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
  const json = await res.json();
  const slots = json.slots || {};

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
      <td>${b.stylist} / ${b.gender}</td>
      <td>${b.name}</td>
      <td>${b.service || '-'}</td>
      <td>${b.phone || '-'}</td>
      <td><button data-id="${b.id}">ลบ</button></td>
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
  const bank = bookings.filter(b => b.stylist === 'Bank').length;
  const sindy = bookings.filter(b => b.stylist === 'Sindy').length;
  const assist = bookings.filter(b => b.stylist === 'Assist').length;

  countBank.textContent = bank;
  countSindy.textContent = sindy;
  countAssist.textContent = assist;
  countTotal.textContent = bank + sindy + assist;
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
    } else {
      alert('กรอกข้อมูลไม่ครบ');
    }
  };
}

/* =========================
   TABS
========================= */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStylist = btn.dataset.tab;
      loadSlots();
    };
  });
}

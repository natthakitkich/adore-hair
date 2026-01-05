/* =================================================
   Adore Hair – app.js (Calendar Integrated / Stable)
================================================= */

const API = '';

/* =========================
   GLOBAL STATE
========================= */
let bookings = [];
let calendarDensity = {};

let currentDate = '';
let currentStylist = 'Bank';
let currentMonth = new Date();

/* =========================
   LOGIN CONTROL
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

const OWNER_PIN = '1234';

loginBtn.onclick = () => {
  if (pinInput.value === OWNER_PIN) {
    document.body.style.overflow = 'auto';
    loginOverlay.classList.add('hidden');
    pinInput.value = '';
    loginMsg.textContent = '';
    init();
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
};

logoutBtn.onclick = () => location.reload();

/* =========================
   INIT
========================= */
function init() {
  const today = new Date();
  currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  currentDate = today.toISOString().slice(0, 10);

  bindTabs();
  bindCalendarNav();

  loadCalendarDensity().then(() => {
    renderCalendar();
    highlightSelectedDate();
  });

  loadBookings();
}

/* =========================
   UTIL
========================= */
function formatTime(time) {
  return time ? time.slice(0, 5) : '';
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/* =========================
   CALENDAR NAV
========================= */
function bindCalendarNav() {
  document.getElementById('prevMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    loadCalendarDensity().then(renderCalendar);
  };

  document.getElementById('nextMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    loadCalendarDensity().then(renderCalendar);
  };
}

/* =========================
   LOAD CALENDAR DENSITY
========================= */
async function loadCalendarDensity() {
  try {
    const res = await fetch(`${API}/calendar-days`);
    calendarDensity = await res.json();
  } catch {
    calendarDensity = {};
  }
}

/* =========================
   RENDER CALENDAR
========================= */
function renderCalendar() {
  const title = document.getElementById('calendarTitle');
  const grid = document.getElementById('calendarDays');

  title.textContent = currentMonth.toLocaleString('th-TH', {
    month: 'long',
    year: 'numeric'
  });

  grid.innerHTML = '';

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    const count = calendarDensity[dateStr] || 0;

    const cell = document.createElement('div');
    cell.className = 'calCell';

    const num = document.createElement('div');
    num.className = 'calNum';

    if (count >= 7) num.classList.add('density-full');
    else if (count >= 5) num.classList.add('density-high');
    else if (count >= 3) num.classList.add('density-mid');
    else if (count >= 1) num.classList.add('density-low');

    num.textContent = d;
    cell.appendChild(num);

    cell.onclick = () => {
      currentDate = dateStr;
      loadBookings();
      highlightSelectedDate();
    };

    grid.appendChild(cell);
  }
}

/* =========================
   HIGHLIGHT SELECTED DATE
========================= */
function highlightSelectedDate() {
  document.querySelectorAll('.calCell').forEach(c =>
    c.classList.remove('selected')
  );

  const day = Number(currentDate.slice(-2));

  [...document.querySelectorAll('.calCell')].forEach(c => {
    if (c.textContent.trim() === String(day)) {
      c.classList.add('selected');
    }
  });
}

/* =========================
   LOAD BOOKINGS
========================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${currentDate}`);
  bookings = await res.json();

  renderTimeOptions();
  renderTable();
  updateSummary();
}

/* =========================
   TIME OPTIONS
========================= */
function renderTimeOptions() {
  const timeSelect = document.getElementById('time');
  timeSelect.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time = `${pad(h)}:00:00`;
    const booked = bookings.find(
      b => b.time === time && b.stylist === currentStylist
    );

    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = formatTime(time);
    if (booked) opt.disabled = true;

    timeSelect.appendChild(opt);
  }
}

/* =========================
   TABS
========================= */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
      renderTimeOptions();
      renderTable();
      updateSummary();
    };
  });
}

/* =========================
   FORM SUBMIT
========================= */
document.getElementById('bookingForm').onsubmit = async e => {
  e.preventDefault();

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) {
    alert('กรุณาเลือกเพศ');
    return;
  }

  await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: currentDate,
      time: document.getElementById('time').value,
      stylist: currentStylist,
      name: document.getElementById('name').value,
      phone: document.getElementById('phone').value,
      gender,
      service: document.getElementById('service').value
    })
  });

  e.target.reset();
  await loadCalendarDensity();
  renderCalendar();
  loadBookings();
};

/* =========================
   TABLE
========================= */
function renderTable() {
  const list = document.getElementById('list');
  list.innerHTML = '';

  bookings
    .filter(b => b.stylist === currentStylist)
    .forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatTime(b.time)}</td>
        <td>${b.stylist}</td>
        <td>${b.gender === 'male' ? '👨' : '👩'}</td>
        <td>${b.name}</td>
        <td>${b.service || ''}</td>
        <td>${b.phone || ''}</td>
        <td><button class="ghost">ลบ/แก้ไขคิว</button></td>
      `;
      tr.querySelector('button').onclick = () => openEditModal(b);
      list.appendChild(tr);
    });
}

/* =========================
   SUMMARY
========================= */
function updateSummary() {
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
   EDIT MODAL
========================= */
const editOverlay = document.getElementById('editOverlay');
const editTime = document.getElementById('editTime');
const editStylist = document.getElementById('editStylist');
const editName = document.getElementById('editName');
const editPhone = document.getElementById('editPhone');
const editService = document.getElementById('editService');
let editingId = null;

function openEditModal(b) {
  editingId = b.id;
  editTime.value = formatTime(b.time);
  editStylist.value = b.stylist;
  editName.value = b.name;
  editPhone.value = b.phone || '';
  editService.value = b.service || '';

  document.querySelectorAll('[name=editGender]').forEach(r => {
    r.checked = r.value === b.gender;
  });

  editOverlay.classList.remove('hidden');
}

document.getElementById('saveEdit').onclick = async () => {
  const gender = document.querySelector('[name=editGender]:checked')?.value;

  await fetch(`${API}/bookings/${editingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: editName.value,
      phone: editPhone.value,
      gender,
      service: editService.value
    })
  });

  alert('ข้อมูลถูกแก้ไขแล้ว');
  closeEditModal();
  await loadCalendarDensity();
  renderCalendar();
  loadBookings();
};

document.getElementById('deleteEdit').onclick = async () => {
  if (!confirm('ยืนยันการลบคิวนี้?')) return;

  await fetch(`${API}/bookings/${editingId}`, { method: 'DELETE' });

  closeEditModal();
  await loadCalendarDensity();
  renderCalendar();
  loadBookings();
};

document.getElementById('closeEdit').onclick = closeEditModal;

function closeEditModal() {
  editOverlay.classList.add('hidden');
  editingId = null;
}

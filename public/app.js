/* =================================================
   Adore Hair – Version Basic (Frontend Logic)
   + Upgrade: format time / edit booking
================================================= */

/* =========================
   GLOBAL STATE (BASIC)
========================= */
const API = '';

let bookings = [];
let currentDate = '';
let currentMonth = new Date();
let currentStylist = 'Bank';

// NEW: state สำหรับแก้ไขคิว
let editingId = null;

/* =========================
   LOGIN SYSTEM (BASIC)
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

const OWNER_PIN = '1234'; // BASIC

loginBtn.onclick = () => {
  if (pinInput.value === OWNER_PIN) {
    loginOverlay.classList.add('hidden');
    pinInput.value = '';
    loginMsg.textContent = '';
    init(); // BASIC flow
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
};

logoutBtn.onclick = () => {
  location.reload();
};

/* =========================
   INIT (BASIC FLOW)
========================= */
function init() {
  const dateInput = document.getElementById('date');
  const today = new Date().toISOString().slice(0, 10);

  currentDate = today;
  dateInput.value = today;

  dateInput.onchange = () => {
    currentDate = dateInput.value;
    loadBookings();
    loadCalendarDays(); // BASIC
  };

  // BASIC: tab stylist
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
      renderTable();
    };
  });

  loadCalendarDays(); // BASIC
  loadBookings();     // BASIC
}

/* =========================
   UTIL
========================= */
// NEW: ตัดวินาทีออกจากเวลา
function formatTime(time) {
  return time ? time.slice(0, 5) : '';
}

/* =========================
   LOAD BOOKINGS (BASIC)
========================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${currentDate}`);
  bookings = await res.json();

  renderTimeSlots(); // BASIC
  renderTable();     // BASIC
  updateSummary();   // BASIC
}

/* =========================
   LOAD CALENDAR DAYS (BASIC)
========================= */
async function loadCalendarDays() {
  const res = await fetch(`${API}/calendar-days`);
  const days = await res.json();
  renderCalendar(days);
}

/* =========================
   CALENDAR RENDER (BASIC)
========================= */
function renderCalendar(daysData) {
  const calendarDays = document.getElementById('calendarDays');
  const title = document.getElementById('calendarTitle');

  calendarDays.innerHTML = '';
  title.textContent = currentMonth.toLocaleString('th-TH', {
    month: 'long',
    year: 'numeric'
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarDays.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = daysData[dateStr] || 0;

    const cell = document.createElement('div');
    cell.className = 'calCell';
    if (dateStr === currentDate) cell.classList.add('selected');

    const num = document.createElement('div');
    num.className = 'calNum';

    if (count >= 6) num.classList.add('density-full');
    else if (count >= 4) num.classList.add('density-high');
    else if (count >= 2) num.classList.add('density-mid');
    else if (count >= 1) num.classList.add('density-low');

    num.textContent = day;
    cell.appendChild(num);

    cell.onclick = () => {
      currentDate = dateStr;
      document.getElementById('date').value = dateStr;
      loadBookings();
      loadCalendarDays();
    };

    calendarDays.appendChild(cell);
  }
}

/* =========================
   TIME SLOT SYSTEM (BASIC)
========================= */
function renderTimeSlots() {
  const timeSelect = document.getElementById('time');
  timeSelect.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;

    const exist = bookings.find(b =>
      b.time === time &&
      b.stylist === currentStylist
    );

    const option = document.createElement('option');
    option.value = time;
    option.textContent = formatTime(time); // NEW: แสดง HH:MM

    if (exist) option.disabled = true;

    timeSelect.appendChild(option);
  }
}

/* =========================
   BOOKING FORM SUBMIT (BASIC)
========================= */
document.getElementById('bookingForm').onsubmit = async e => {
  e.preventDefault();

  const gender = document.querySelector('[name=gender]:checked')?.value;

  const payload = {
    date: currentDate,
    time: document.getElementById('time').value,
    stylist: currentStylist,
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    gender,
    service: document.getElementById('service').value
  };

  await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  e.target.reset();
  loadBookings();
};

/* =========================
   TABLE RENDER (BASIC + NEW BUTTON)
========================= */
function renderTable() {
  const list = document.getElementById('list');
  list.innerHTML = '';

  bookings
    .filter(b => b.stylist === currentStylist)
    .forEach(b => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${formatTime(b.time)}</td> <!-- NEW -->
        <td><span class="badge stylist-${b.stylist.toLowerCase()}">${b.stylist}</span></td>
        <td>${b.gender === 'male' ? '👨' : '👩'}</td>
        <td>${b.name}</td>
        <td>${b.service || ''}</td>
        <td>${b.phone || ''}</td>
        <td><button class="ghost">ลบ/แก้ไขคิว</button></td> <!-- NEW -->
      `;

      tr.querySelector('button').onclick = () => openEdit(b); // NEW
      list.appendChild(tr);
    });
}

/* =========================
   SUMMARY (BASIC)
========================= */
function updateSummary() {
  const bank = bookings.filter(b => b.stylist === 'Bank').length;
  const sindy = bookings.filter(b => b.stylist === 'Sindy').length;
  const assist = bookings.filter(b => b.stylist === 'Assist').length;

  document.getElementById('countBank').textContent = bank;
  document.getElementById('countSindy').textContent = sindy;
  document.getElementById('countAssist').textContent = assist;
  document.getElementById('countTotal').textContent = bank + sindy + assist;
}

/* =========================
   EDIT BOOKING MODAL (NEW)
========================= */
const editOverlay = document.getElementById('editOverlay');
const editTime = document.getElementById('editTime');
const editStylist = document.getElementById('editStylist');
const editName = document.getElementById('editName');
const editPhone = document.getElementById('editPhone');
const editService = document.getElementById('editService');

function openEdit(b) {
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
  closeEdit();
  loadBookings();
};

document.getElementById('deleteEdit').onclick = async () => {
  if (!confirm('ยืนยันการลบคิวนี้?')) return;

  await fetch(`${API}/bookings/${editingId}`, { method: 'DELETE' });
  closeEdit();
  loadBookings();
};

document.getElementById('closeEdit').onclick = closeEdit;

function closeEdit() {
  editOverlay.classList.add('hidden');
  editingId = null;
}

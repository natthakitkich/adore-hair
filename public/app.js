/* =================================================
   Adore Hair – app.js (Closed Days Enabled)
================================================= */

const API = '';

/* =========================
   GLOBAL STATE
========================= */
let bookings = [];
let closedDays = [];
let currentDate = '';
let currentStylist = 'Bank';

let calendarDensity = {};
let currentMonth = new Date();

/* =========================
   LOGIN
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

const OWNER_PIN = '1234';

loginBtn.onclick = () => {
  if (pinInput.value === OWNER_PIN) {
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
  const dateInput = document.getElementById('date');
  const today = new Date().toISOString().slice(0, 10);

  currentDate = today;
  dateInput.value = today;

  dateInput.onchange = () => {
    currentDate = dateInput.value;
    loadBookings();
  };

  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
      renderTimeOptions();
    };
  });

  document.getElementById('prevMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  };

  document.getElementById('nextMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  };

  loadCalendarDensity();
  loadClosedDays();
  loadBookings();
}

/* =========================
   LOAD DATA
========================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${currentDate}`);
  bookings = await res.json();
  renderTimeOptions();
  renderTable();
  updateSummary();
}

async function loadCalendarDensity() {
  try {
    const res = await fetch(`${API}/calendar-days`);
    calendarDensity = await res.json();
  } catch {
    calendarDensity = {};
  }
}

async function loadClosedDays() {
  const res = await fetch(`${API}/closed-days`);
  closedDays = await res.json();
  renderCalendar();
}

/* =========================
   CALENDAR
========================= */
function renderCalendar() {
  const calendarDays = document.getElementById('calendarDays');
  const calendarTitle = document.getElementById('calendarTitle');
  if (!calendarDays || !calendarTitle) return;

  calendarDays.innerHTML = '';
  calendarTitle.textContent = currentMonth.toLocaleString('th-TH', {
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
    const isClosed = closedDays.includes(dateStr);
    const count = calendarDensity[dateStr] || 0;

    const cell = document.createElement('div');
    cell.className = 'calCell';
    if (dateStr === currentDate) cell.classList.add('selected');
    if (isClosed) cell.classList.add('closed');

    const num = document.createElement('div');
    num.className = 'calNum';
    if (isClosed) num.classList.add('closed');

    if (!isClosed) {
      if (count >= 7) num.classList.add('density-full');
      else if (count >= 5) num.classList.add('density-high');
      else if (count >= 3) num.classList.add('density-mid');
      else if (count >= 1) num.classList.add('density-low');
    }

    num.textContent = day;
    cell.appendChild(num);

    cell.onclick = async () => {
      await fetch(`${API}/closed-days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr })
      });
      loadClosedDays();
      if (dateStr === currentDate) renderTimeOptions();
    };

    calendarDays.appendChild(cell);
  }
}

/* =========================
   TIME OPTIONS
========================= */
function renderTimeOptions() {
  const timeSelect = document.getElementById('time');
  timeSelect.innerHTML = '';

  if (closedDays.includes(currentDate)) {
    const opt = document.createElement('option');
    opt.textContent = 'ร้านปิดทำการ';
    opt.disabled = true;
    timeSelect.appendChild(opt);
    return;
  }

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;
    const booked = bookings.find(
      b => b.time === time && b.stylist === currentStylist
    );

    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0, 5);
    if (booked) opt.disabled = true;
    timeSelect.appendChild(opt);
  }
}

/* =========================
   FORM SUBMIT
========================= */
document.getElementById('bookingForm').onsubmit = async e => {
  e.preventDefault();

  if (closedDays.includes(currentDate)) {
    alert('วันนี้ร้านปิดทำการ');
    return;
  }

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
  loadCalendarDensity();
  loadBookings();
};

/* =========================
   TABLE / SUMMARY
========================= */
function renderTable() {
  const list = document.getElementById('list');
  list.innerHTML = '';

  bookings
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.time.slice(0, 5)}</td>
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

function updateSummary() {
  document.getElementById('countBank').textContent =
    bookings.filter(b => b.stylist === 'Bank').length;
  document.getElementById('countSindy').textContent =
    bookings.filter(b => b.stylist === 'Sindy').length;
  document.getElementById('countAssist').textContent =
    bookings.filter(b => b.stylist === 'Assist').length;
  document.getElementById('countTotal').textContent = bookings.length;
}

/* =========================
   EDIT MODAL (เดิม)
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
  editTime.value = b.time.slice(0, 5);
  editStylist.value = b.stylist;
  editName.value = b.name;
  editPhone.value = b.phone || '';
  editService.value = b.service || '';

  document.querySelectorAll('[name=editGender]').forEach(r => {
    r.checked = r.value === b.gender;
  });

  editOverlay.classList.remove('hidden');
}

document.getElementById('closeEdit').onclick = () => {
  editOverlay.classList.add('hidden');
};

const API = '';
const OWNER_PIN = '1234';

/* =========================
   ELEMENTS
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

const topbar = document.getElementById('topbar');
const calendarView = document.getElementById('calendarView');
const bookingView = document.getElementById('bookingView');

const calendarTitle = document.getElementById('calendarTitle');
const calendarDaysEl = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

/* =========================
   GLOBAL STATE
========================= */
let bookings = [];
let calendarDensity = {};
let currentDate = '';
let currentStylist = 'Bank';

let viewMonth = new Date().getMonth();
let viewYear = new Date().getFullYear();

/* =========================
   LOGIN
========================= */
loginBtn.onclick = () => {
  const pin = pinInput.value.trim();
  loginMsg.textContent = '';

  if (pin.length !== 4) {
    loginMsg.textContent = 'กรุณาใส่ PIN 4 หลัก';
    return;
  }

  if (pin !== OWNER_PIN) {
    loginMsg.textContent = 'รหัสผ่านไม่ถูกต้อง';
    return;
  }

  localStorage.setItem('adore_logged_in', '1');
  pinInput.value = '';
  showCalendar();
};

logoutBtn.onclick = () => {
  localStorage.removeItem('adore_logged_in');
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  const logged = localStorage.getItem('adore_logged_in') === '1';
  if (logged) {
    showCalendar();
  } else {
    showLogin();
  }
});

/* =========================
   VIEW CONTROL
========================= */
function showLogin() {
  loginOverlay.classList.remove('hidden');
  topbar.classList.add('hidden');
  calendarView.classList.add('hidden');
  bookingView.classList.add('hidden');
}

function showCalendar() {
  loginOverlay.classList.add('hidden');
  topbar.classList.remove('hidden');
  calendarView.classList.remove('hidden');
  bookingView.classList.add('hidden');

  loadCalendar();
}

function showBooking(date) {
  calendarView.classList.add('hidden');
  bookingView.classList.remove('hidden');

  currentDate = date;
  initBooking();
}

/* =========================
   CALENDAR
========================= */
async function loadCalendar() {
  const res = await fetch(`${API}/calendar-days`);
  calendarDensity = await res.json();
  renderCalendar();
}

function renderCalendar() {
  calendarDaysEl.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  calendarTitle.textContent =
    firstDay.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day off';
    calendarDaysEl.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = calendarDensity[date] || 0;

    const dayEl = document.createElement('div');
    dayEl.className = 'day';

    if (count > 0 && count <= 5) dayEl.classList.add('low');
    if (count > 5 && count <= 10) dayEl.classList.add('mid');
    if (count > 10) dayEl.classList.add('high');

    dayEl.textContent = d;
    dayEl.onclick = () => showBooking(date);

    calendarDaysEl.appendChild(dayEl);
  }
}

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

/* =========================
   BOOKING (เดิม + adapt)
========================= */
function initBooking() {
  const dateInput = document.getElementById('date');
  dateInput.value = currentDate;

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
      renderTable();
      updateSummary();
    };
  });

  loadBookings();
}

async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${currentDate}`);
  bookings = await res.json();

  renderTimeOptions();
  renderTable();
  updateSummary();
}

function renderTimeOptions() {
  const timeSelect = document.getElementById('time');
  timeSelect.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;
    const booked = bookings.find(
      b => b.time === time && b.stylist === currentStylist
    );

    const option = document.createElement('option');
    option.value = time;
    option.textContent = time.slice(0, 5);
    if (booked) option.disabled = true;

    timeSelect.appendChild(option);
  }
}

/* =========================
   FORM SUBMIT
========================= */
document.getElementById('bookingForm').onsubmit = async e => {
  e.preventDefault();

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) return alert('กรุณาเลือกเพศ');

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
  loadBookings();
  loadCalendar();
};

/* =========================
   TABLE / SUMMARY / EDIT
========================= */
function renderTable() {
  const list = document.getElementById('list');
  list.innerHTML = '';

  bookings
    .filter(b => b.stylist === currentStylist)
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

  closeEditModal();
  loadBookings();
  loadCalendar();
};

document.getElementById('deleteEdit').onclick = async () => {
  if (!confirm('ยืนยันการลบคิวนี้?')) return;

  await fetch(`${API}/bookings/${editingId}`, { method: 'DELETE' });

  closeEditModal();
  loadBookings();
  loadCalendar();
};

document.getElementById('closeEdit').onclick = closeEditModal;

function closeEditModal() {
  editOverlay.classList.add('hidden');
  editingId = null;
}

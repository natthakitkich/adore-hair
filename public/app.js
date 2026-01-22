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

const calendarTitle = document.getElementById('calendarTitle');
const calendarDaysEl = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

const timeSelect = document.getElementById('time');
const listEl = document.getElementById('list');

/* =========================
   STATE
========================= */
let bookings = [];
let calendarDensity = {};

let selectedStylist = 'Bank';
let selectedDate = getTodayTH();

let viewMonth = new Date(selectedDate).getMonth();
let viewYear = new Date(selectedDate).getFullYear();

let editingBooking = null;

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
  loginOverlay.classList.add('hidden');
  init();
};

pinInput.addEventListener('input', () => {
  pinInput.value = pinInput.value.replace(/\D/g, '');
});

logoutBtn.onclick = () => {
  localStorage.removeItem('adore_logged_in');
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('adore_logged_in') === '1') {
    loginOverlay.classList.add('hidden');
    init();
  }
});

/* =========================
   INIT
========================= */
function init() {
  bindStylistTabs();
  loadCalendar();
  loadBookings();
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
    calendarDaysEl.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = calendarDensity[date] || 0;

    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = d;

    if (date === selectedDate) el.classList.add('today');
    if (count > 0 && count <= 5) el.classList.add('low');
    if (count > 5 && count <= 10) el.classList.add('mid');
    if (count > 10) el.classList.add('high');

    el.onclick = () => {
      selectedDate = date;
      loadBookings();
      renderCalendar();
    };

    calendarDaysEl.appendChild(el);
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
   BOOKINGS
========================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${selectedDate}`);
  bookings = await res.json();

  renderSummary();
  renderTimeOptions();
  renderTable();
}

function bindStylistTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      selectedStylist = tab.dataset.tab;
      renderTimeOptions();
    };
  });
}

function renderTimeOptions() {
  timeSelect.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;
    const booked = bookings.find(
      b => b.time === time && b.stylist === selectedStylist
    );

    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0, 5);
    if (booked) opt.disabled = true;

    timeSelect.appendChild(opt);
  }
}

/* =========================
   SUMMARY
========================= */
function renderSummary() {
  const bank = bookings.filter(b => b.stylist === 'Bank').length;
  const sindy = bookings.filter(b => b.stylist === 'Sindy').length;
  const assist = bookings.filter(b => b.stylist === 'Assist').length;

  document.getElementById('countBank').textContent = bank;
  document.getElementById('countSindy').textContent = sindy;
  document.getElementById('countAssist').textContent = assist;
  document.getElementById('countTotal').textContent = bank + sindy + assist;
}

/* =========================
   TABLE + MANAGE
========================= */
function renderTable() {
  listEl.innerHTML = '';

  bookings.forEach(b => {
    const card = document.createElement('div');
    card.className = 'booking-card';

    const phoneHtml = b.phone
      ? `<a href="tel:${b.phone}" class="phone-link">${b.phone}</a>`
      : '-';

    card.innerHTML = `
      <div class="card-main">
        <div class="time-pill">${b.time.slice(0,5)}</div>
        <div class="card-main-info">
          <span class="badge ${b.stylist}">${b.stylist}</span>
          ${b.gender === 'male' ? '👨' : '👩'}
        </div>
        <button class="ghost toggle-detail">ดู</button>
      </div>

      <div class="card-sub">${b.name} · ${b.service || ''}</div>

      <div class="card-detail">
        <div class="card-sub">โทร: ${phoneHtml}</div>
        ${b.note ? `<div class="card-sub">หมายเหตุ: ${b.note}</div>` : ''}
        <div class="card-actions">
          <button class="ghost manage-btn">จัดการ</button>
        </div>
      </div>
    `;

    card.onclick = () => card.classList.toggle('expanded');

    card.querySelector('.toggle-detail').onclick = e => {
      e.stopPropagation();
      card.classList.toggle('expanded');
    };

    card.querySelector('.manage-btn').onclick = e => {
      e.stopPropagation();
      openEditModal(b);
    };

    listEl.appendChild(card);
  });
}

/* =========================
   EDIT MODAL
========================= */
function openEditModal(booking) {
  editingBooking = booking;

  const modal = document.getElementById('editModal');
  modal.classList.add('show');

  document.getElementById('editName').value = booking.name || '';
  document.getElementById('editPhone').value = booking.phone || '';
  document.getElementById('editNote').value = booking.note || '';
}

document.getElementById('editSave').onclick = async () => {
  if (!editingBooking) return;

  await fetch(`${API}/bookings/${editingBooking.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: document.getElementById('editName').value,
      phone: document.getElementById('editPhone').value,
      note: document.getElementById('editNote').value
    })
  });

  closeEditModal();
  loadBookings();
};

document.getElementById('editClose').onclick = closeEditModal;

function closeEditModal() {
  document.getElementById('editModal').classList.remove('show');
  editingBooking = null;
}

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

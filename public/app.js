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

const bookingForm = document.getElementById('bookingForm');
const timeSelect = document.getElementById('time');
const listEl = document.getElementById('list');

/* =========================
   EDIT MODAL ELEMENTS
========================= */
const editOverlay = document.getElementById('editOverlay');
const editTime = document.getElementById('editTime');
const editStylist = document.getElementById('editStylist');
const editName = document.getElementById('editName');
const editPhone = document.getElementById('editPhone');
const editService = document.getElementById('editService');
const editNote = document.getElementById('editNote');
const saveEditBtn = document.getElementById('saveEdit');
const deleteEditBtn = document.getElementById('deleteEdit');
const closeEditBtn = document.getElementById('closeEdit');

/* =========================
   STATE
========================= */
let bookings = [];
let calendarDensity = {};
let selectedStylist = 'Bank';
let selectedDate = getTodayTH();
let editingBooking = null;

/* =========================
   LOGIN
========================= */
loginBtn.onclick = () => {
  const pin = pinInput.value.trim();
  loginMsg.textContent = '';

  if (pin !== OWNER_PIN) {
    loginMsg.textContent = 'รหัสผ่านไม่ถูกต้อง';
    return;
  }

  localStorage.setItem('adore_logged_in', '1');
  loginOverlay.classList.add('hidden');
  init();
};

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
  const d = new Date(selectedDate);
  calendarTitle.textContent = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  for (let day = 1; day <= 31; day++) {
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = day;

    if (calendarDensity[date] > 0) el.classList.add('low');
    if (date === selectedDate) el.classList.add('today');

    el.onclick = () => {
      selectedDate = date;
      loadBookings();
      renderCalendar();
    };

    calendarDaysEl.appendChild(el);
  }
}

/* =========================
   BOOKINGS
========================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${selectedDate}`);
  bookings = await res.json();
  renderTable();
}

/* =========================
   TABLE + MANAGE
========================= */
function renderTable() {
  listEl.innerHTML = '';

  bookings
    .filter(b => b.stylist === selectedStylist)
    .forEach(b => {
      const card = document.createElement('div');
      card.className = 'booking-card';

      card.innerHTML = `
        <div class="card-main">
          <div class="time-pill">${b.time.slice(0,5)}</div>
          <span class="badge ${b.stylist}">${b.stylist}</span>
          <button class="ghost toggle-detail">ดู</button>
        </div>

        <div class="card-detail">
          <div>${b.name} · ${b.service || '-'}</div>
          <div>โทร: ${b.phone || '-'}</div>
          <button class="ghost manage-btn">จัดการ</button>
        </div>
      `;

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
   EDIT MODAL LOGIC
========================= */
function openEditModal(b) {
  editingBooking = b;

  editTime.value = b.time;
  editStylist.value = b.stylist;
  editName.value = b.name;
  editPhone.value = b.phone || '';
  editService.value = b.service || '';
  editNote.value = b.note || '';

  editOverlay.classList.remove('hidden');
}

saveEditBtn.onclick = async () => {
  await fetch(`${API}/bookings/${editingBooking.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      time: editTime.value,
      stylist: editStylist.value,
      name: editName.value,
      phone: editPhone.value,
      service: editService.value,
      note: editNote.value
    })
  });

  editOverlay.classList.add('hidden');
  loadBookings();
  loadCalendar();
};

deleteEditBtn.onclick = async () => {
  if (!confirm('ยืนยันการลบคิวนี้?')) return;

  await fetch(`${API}/bookings/${editingBooking.id}`, { method: 'DELETE' });
  editOverlay.classList.add('hidden');
  loadBookings();
  loadCalendar();
};

closeEditBtn.onclick = () => {
  editOverlay.classList.add('hidden');
};

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

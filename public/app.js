/* =========================
   CONFIG
========================= */
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

const storeStatusText = document.getElementById('storeStatusText');
const toggleStoreBtn = document.getElementById('toggleStoreBtn');

/* --- EDIT MODAL --- */
const editOverlay = document.getElementById('editOverlay');
const editTime = document.getElementById('editTime');
const editStylist = document.getElementById('editStylist');
const editName = document.getElementById('editName');
const editPhone = document.getElementById('editPhone');
const editService = document.getElementById('editService');

/* =========================
   STATE
========================= */
let bookings = [];
let calendarDensity = {};
let closedDays = [];

let selectedStylist = 'Bank';          // ใช้กับฟอร์มเพิ่มคิวเท่านั้น
let selectedDate = getTodayTH();       // YYYY-MM-DD (Asia/Bangkok)

let viewMonth = new Date(selectedDate).getMonth(); // 0-11
let viewYear  = new Date(selectedDate).getFullYear(); // ค.ศ.

let editingId = null;

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
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
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
  initStoreStatus();
  loadCalendar();     // จะโหลด density + closed days
  loadBookings();     // ของ selectedDate
}

/* =========================
   STORE STATUS (OPEN / CLOSED)
========================= */
function initStoreStatus() {
  const saved = localStorage.getItem('adore_store_status') || 'open';
  renderStoreStatus(saved);

  toggleStoreBtn.onclick = () => {
    const current = localStorage.getItem('adore_store_status') || 'open';
    const next = current === 'open' ? 'closed' : 'open';
    localStorage.setItem('adore_store_status', next);
    renderStoreStatus(next);
  };
}

function renderStoreStatus(status) {
  if (status === 'open') {
    storeStatusText.textContent = 'สถานะร้าน: เปิด';
    toggleStoreBtn.textContent = 'ปิดร้าน';
    toggleStoreBtn.classList.remove('closed');
    toggleStoreBtn.classList.add('open');
  } else {
    storeStatusText.textContent = 'สถานะร้าน: ปิด';
    toggleStoreBtn.textContent = 'เปิดร้าน';
    toggleStoreBtn.classList.remove('open');
    toggleStoreBtn.classList.add('closed');
  }
}

/* =========================
   CALENDAR
========================= */
async function loadCalendar() {
  // density
  const r1 = await fetch(`${API}/calendar-days`);
  calendarDensity = await r1.json();

  // closed days
  const r2 = await fetch(`${API}/closed-days`);
  closedDays = await r2.json();

  renderCalendar();
}

function renderCalendar() {
  calendarDaysEl.innerHTML = '';

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startDay = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  calendarTitle.textContent = firstOfMonth.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric'
  }); // แสดง ค.ศ. แต่ชื่อเดือนไทย

  // ช่องว่างก่อนวันแรก
  for (let i = 0; i < startDay; i++) {
    calendarDaysEl.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = calendarDensity[date] || 0;
    const isClosed = closedDays.includes(date);

    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = d;

    if (date === selectedDate) el.classList.add('today');
    if (count > 0 && count <= 5) el.classList.add('low');
    if (count > 5 && count <= 10) el.classList.add('mid');
    if (count > 10) el.classList.add('high');
    if (isClosed) el.classList.add('closed');

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
      selectedStylist = tab.dataset.tab; // ใช้กับฟอร์มเท่านั้น
      renderTimeOptions();
    };
  });
}

function renderTimeOptions() {
  timeSelect.innerHTML = '';

  const isClosed = closedDays.includes(selectedDate);
  timeSelect.disabled = isClosed;

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;
    const booked = bookings.find(b => b.time === time && b.stylist === selectedStylist);

    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0, 5);
    if (booked || isClosed) opt.disabled = true;

    timeSelect.appendChild(opt);
  }
}

/* =========================
   FORM SUBMIT
========================= */
bookingForm.onsubmit = async e => {
  e.preventDefault();

  if (closedDays.includes(selectedDate)) {
    alert('วันนี้ร้านปิด ไม่สามารถจองคิวได้');
    return;
  }

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) {
    alert('กรุณาเลือกเพศ');
    return;
  }

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
  document.getElementById('countTotal').textContent = bookings.length;
}

/* =========================
   TABLE (แสดงทุกช่างของวันนั้น)
========================= */
function renderTable() {
  listEl.innerHTML = '';

  bookings.forEach(b => {
    const badgeClass =
      b.stylist === 'Bank' ? 'bank' :
      b.stylist === 'Sindy' ? 'sindy' : 'assist';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time.slice(0,5)}</td>
      <td><span class="badge ${badgeClass}">${b.stylist}</span></td>
      <td>${b.gender === 'male' ? '👨' : '👩'}</td>
      <td>${b.name}</td>
      <td>${b.service || ''}</td>
      <td>${b.phone || ''}</td>
      <td><button class="ghost">จัดการ</button></td>
    `;
    tr.querySelector('button').onclick = () => openEditModal(b);
    listEl.appendChild(tr);
  });
}

/* =========================
   EDIT MODAL
========================= */
function openEditModal(b) {
  editingId = b.id;
  editTime.value = b.time.slice(0,5);
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

  editOverlay.classList.add('hidden');
  loadBookings();
  loadCalendar();
};

document.getElementById('deleteEdit').onclick = async () => {
  if (!confirm('ยืนยันการลบคิวนี้?')) return;

  await fetch(`${API}/bookings/${editingId}`, { method: 'DELETE' });

  editOverlay.classList.add('hidden');
  loadBookings();
  loadCalendar();
};

document.getElementById('closeEdit').onclick = () =>
  editOverlay.classList.add('hidden');

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

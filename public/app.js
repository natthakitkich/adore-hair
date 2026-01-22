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

/* EDIT MODAL */
const editOverlay = document.getElementById('editOverlay');
const editDate = document.getElementById('editDate');
const editTime = document.getElementById('editTime');
const editStylist = document.getElementById('editStylist');
const editName = document.getElementById('editName');
const editPhone = document.getElementById('editPhone');
const editService = document.getElementById('editService');
const editNote = document.getElementById('editNote');

/* CONFIRM */
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmOk = document.getElementById('confirmOk');
const confirmCancel = document.getElementById('confirmCancel');

/* TOAST */
const toastEl = document.getElementById('toast');

/* =========================
   STATE
========================= */
let bookings = [];
let calendarDensity = {};
let selectedStylist = 'Bank';
let selectedDate = getTodayTH();
let editingBooking = null;

let viewMonth = new Date(selectedDate).getMonth();
let viewYear = new Date(selectedDate).getFullYear();

let toastTimer = null;
let confirmCallback = null;

/* =========================
   OVERLAY MANAGER (CRITICAL)
========================= */
function closeAllOverlays() {
  document.querySelectorAll('.overlay').forEach(o => {
    o.classList.add('hidden');
  });
  document.body.classList.remove('modal-open');
}

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
  closeAllOverlays();
  init();
};

logoutBtn.onclick = () => {
  localStorage.removeItem('adore_logged_in');
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('adore_logged_in') === '1') {
    closeAllOverlays();
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
   BOOKING SUBMIT
========================= */
bookingForm.onsubmit = async (e) => {
  e.preventDefault();

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!timeSelect.value || !gender) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }

  const payload = {
    date: selectedDate,
    time: timeSelect.value,
    stylist: selectedStylist,
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    gender,
    service: document.getElementById('service').value.trim(),
    note: document.getElementById('note').value.trim() || null
  };

  const res = await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.status === 409) {
    showToast('เวลานี้ถูกจองแล้ว');
    return;
  }

  if (!res.ok) {
    showToast('เกิดข้อผิดพลาด');
    return;
  }

  showToast('จองคิวสำเร็จแล้ว');
  bookingForm.reset();
  document.querySelectorAll('[name=gender]').forEach(r => r.checked = false);
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
  document.getElementById('countTotal').textContent = bank + sindy + assist;
}

/* =========================
   TABLE
========================= */
function renderTable() {
  listEl.innerHTML = '';

  bookings.forEach(b => {
    const card = document.createElement('div');
    card.className = 'booking-card';

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

      ${b.phone
        ? `<a href="tel:${b.phone}" class="phone-call">โทร: ${b.phone}</a>`
        : `<div class="muted">ไม่มีเบอร์โทร</div>`}

      ${b.note ? `<div class="card-sub">หมายเหตุ: ${b.note}</div>` : ''}

      <div class="card-actions">
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
   EDIT MODAL
========================= */
function openEditModal(b) {
  closeAllOverlays();

  editingBooking = b;

  editDate.value = b.date;
  editStylist.value = b.stylist;
  editName.value = b.name;
  editPhone.value = b.phone || '';
  editService.value = b.service || '';
  editNote.value = b.note || '';

  document.querySelectorAll('[name=editGender]').forEach(r => {
    r.checked = r.value === b.gender;
  });

  generateEditTimeOptions(b.date);
  editOverlay.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function generateEditTimeOptions(date) {
  editTime.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;

    const conflict = bookings.find(x =>
      x.date === date &&
      x.time === time &&
      x.stylist === editingBooking.stylist &&
      x.id !== editingBooking.id
    );

    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0,5);
    if (conflict) opt.disabled = true;
    if (time === editingBooking.time) opt.selected = true;

    editTime.appendChild(opt);
  }
}

document.getElementById('saveEdit').onclick = async () => {
  const gender = document.querySelector('[name=editGender]:checked')?.value;

  const res = await fetch(`${API}/bookings/${editingBooking.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: editDate.value,
      time: editTime.value,
      name: editName.value,
      phone: editPhone.value,
      gender,
      service: editService.value,
      note: editNote.value
    })
  });

  if (res.status === 409) {
    showToast('เวลานี้ถูกจองแล้ว');
    return;
  }

  showToast('บันทึกเรียบร้อยแล้ว');
  closeAllOverlays();
  loadBookings();
  loadCalendar();
};

document.getElementById('deleteEdit').onclick = () => {
  openConfirm({
    title: 'ลบคิว',
    message: 'ยืนยันการลบคิวนี้ใช่หรือไม่',
    onConfirm: async () => {
      await fetch(`${API}/bookings/${editingBooking.id}`, { method: 'DELETE' });
      showToast('ลบคิวเรียบร้อยแล้ว');
      closeAllOverlays();
      loadBookings();
      loadCalendar();
    }
  });
};

document.getElementById('closeEdit').onclick = () => {
  closeAllOverlays();
};

/* =========================
   TOAST
========================= */
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastEl.classList.remove('hidden');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2200);
}

/* =========================
   CONFIRM
========================= */
function openConfirm({ title, message, onConfirm }) {
  closeAllOverlays();

  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmCallback = onConfirm;

  confirmOverlay.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

confirmCancel.onclick = () => {
  closeAllOverlays();
};

confirmOk.onclick = () => {
  if (confirmCallback) confirmCallback();
  closeAllOverlays();
};

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

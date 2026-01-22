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

/* OPTIONAL ELEMENTS */
const noteInput = document.getElementById('note');
const editNote = document.getElementById('editNote');

/* =========================
   STATE
========================= */
let bookings = [];
let calendarDensity = {};

let selectedStylist = 'Bank';
let selectedDate = getTodayTH();

let viewMonth = new Date(selectedDate).getMonth();
let viewYear = new Date(selectedDate).getFullYear();

/* =========================
   VOICE STATE
========================= */
let announcedQueueIds = new Set();

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

  // 🔊 unlock เสียงบน iOS
  speakThai('ระบบแจ้งเตือนคิวพร้อมใช้งาน');
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
   FORM
========================= */
bookingForm.onsubmit = async e => {
  e.preventDefault();

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) return alert('กรุณาเลือกเพศ');

  await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: selectedDate,
      time: timeSelect.value,
      stylist: selectedStylist,
      name: document.getElementById('name').value,
      phone: document.getElementById('phone').value,
      gender,
      service: document.getElementById('service').value,
      note: noteInput ? noteInput.value : null
    })
  });

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

        <!-- 👇 ปุ่มดู (เอากลับมา) -->
        <button class="ghost toggle-detail">ดู</button>
      </div>

      <div class="card-sub">
        ${b.name} · ${b.service || ''}
      </div>

      <div class="card-detail">
        <div class="card-sub">
          โทร: ${phoneHtml}
        </div>
        ${b.note ? `<div class="card-sub">หมายเหตุ: ${b.note}</div>` : ''}
        <div class="card-actions">
          <button class="ghost manage-btn">จัดการ</button>
        </div>
      </div>
    `;

    // ✅ กดทั้ง card = เปิด/ปิด detail
    card.onclick = () => {
      card.classList.toggle('expanded');
    };

    // ✅ ปุ่ม "ดู" ทำหน้าที่เดียวกับ card
    card.querySelector('.toggle-detail').onclick = e => {
      e.stopPropagation(); // กันไม่ให้ซ้อน
      card.classList.toggle('expanded');
    };

    // ✅ ปุ่มจัดการ แยก event ชัดเจน
    card.querySelector('.manage-btn').onclick = e => {
      e.stopPropagation();
      openEditModal(b);
    };

    listEl.appendChild(card);
  });
}

/* =========================
   🔊 VOICE — LUXURY SALON
========================= */
function speakThai(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'th-TH';
  u.rate = 0.9;
  u.pitch = 0.95;
  speechSynthesis.speak(u);
}

function speakEnglish(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.85;
  u.pitch = 0.9;
  speechSynthesis.speak(u);
}

function speakQueueLuxury(stylist) {
  speechSynthesis.cancel();
  speakThai('อีกสิบ นาที จะถึงคิวของคุณ');
  setTimeout(() => {
    speakEnglish(stylist);
  }, 350);
}

/* =========================
   QUEUE CHECK
========================= */
function checkUpcomingQueues() {
  const now = new Date();

  bookings.forEach(b => {
    const queueTime = new Date(`${b.date}T${b.time}`);
    const diff = (queueTime - now) / 60000;

    if (diff > 0 && diff <= 10 && !announcedQueueIds.has(b.id)) {
      speakQueueLuxury(b.stylist);
      announcedQueueIds.add(b.id);
    }
  });
}

setInterval(checkUpcomingQueues, 60000);

/* =========================
   EDIT MODAL
========================= */
const editOverlay = document.getElementById('editOverlay');
const editTime = document.getElementById('editTime');
const editStylist = document.getElementById('editStylist');
const editName = document.getElementById('editName');
const editPhone = document.getElementById('editPhone');
const editService = document.getElementById('editService');
const editDate = document.getElementById('editDate');

let editingId = null;
let editingBooking = null;

function generateEditTimeOptions(date) {
  editTime.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;
    const conflict = bookings.find(b =>
      b.date === date &&
      b.time === time &&
      b.stylist === editingBooking.stylist &&
      b.id !== editingBooking.id
    );

    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0, 5);
    if (conflict) opt.disabled = true;
    if (time === editingBooking.time) opt.selected = true;
    editTime.appendChild(opt);
  }
}

function openEditModal(b) {
  editingId = b.id;
  editingBooking = b;

  editDate.value = b.date;
  generateEditTimeOptions(b.date);
  editDate.onchange = () => generateEditTimeOptions(editDate.value);

  editStylist.value = b.stylist;
  editName.value = b.name;
  editPhone.value = b.phone || '';
  editService.value = b.service || '';
  if (editNote) editNote.value = b.note || '';

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
      date: editDate.value,
      time: editTime.value,
      name: editName.value,
      phone: editPhone.value,
      gender,
      service: editService.value,
      note: editNote ? editNote.value : null
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
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

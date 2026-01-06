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

/* EDIT MODAL */
const editOverlay = document.getElementById('editOverlay');
const editTime = document.getElementById('editTime');
const editStylist = document.getElementById('editStylist');
const editName = document.getElementById('editName');
const editPhone = document.getElementById('editPhone');
const editService = document.getElementById('editService');
const saveEditBtn = document.getElementById('saveEdit');
const deleteEditBtn = document.getElementById('deleteEdit');
const closeEditBtn = document.getElementById('closeEdit');

/* =========================
   STATE
========================= */
let bookings = [];
let closedDays = [];
let editingId = null;

let selectedStylist = 'Bank';
let selectedDate = getTodayTH();
let viewMonth = new Date(selectedDate).getMonth();
let viewYear = new Date(selectedDate).getFullYear();

/* =========================
   LOGIN
========================= */
loginBtn.onclick = () => {
  loginMsg.textContent = '';
  if (pinInput.value !== OWNER_PIN) {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    return;
  }
  localStorage.setItem('logged', '1');
  loginOverlay.classList.add('hidden');
  init();
};

if (localStorage.getItem('logged') === '1') {
  loginOverlay.classList.add('hidden');
  init();
}

logoutBtn.onclick = () => {
  localStorage.removeItem('logged');
  location.reload();
};

/* =========================
   INIT
========================= */
function init() {
  bindTabs();
  loadClosedDays();
  loadCalendar();
  loadBookings();
}

/* =========================
   CLOSED DAYS
========================= */
async function loadClosedDays() {
  const res = await fetch(`${API}/closed-days`);
  closedDays = await res.json();
  updateStoreStatusBar();
}

function isClosed(date) {
  return closedDays.includes(date);
}

toggleStoreBtn.onclick = async () => {
  await fetch(`${API}/closed-days`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: selectedDate })
  });
  await loadClosedDays();
  loadCalendar();
  loadBookings();
};

function updateStoreStatusBar() {
  if (isClosed(selectedDate)) {
    storeStatusText.textContent = 'วันนี้ร้านปิด';
    toggleStoreBtn.textContent = 'เปิดร้าน';
    toggleStoreBtn.className = 'ghost closed';
  } else {
    storeStatusText.textContent = 'วันนี้ร้านเปิด';
    toggleStoreBtn.textContent = 'ปิดร้าน';
    toggleStoreBtn.className = 'ghost open';
  }
}

/* =========================
   CALENDAR
========================= */
async function loadCalendar() {
  const res = await fetch(`${API}/calendar-days`);
  const density = await res.json();
  renderCalendar(density);
}

function renderCalendar(density) {
  calendarDaysEl.innerHTML = '';

  const first = new Date(viewYear, viewMonth, 1);
  const days = new Date(viewYear, viewMonth + 1, 0).getDate();

  calendarTitle.textContent = first.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric'
  });

  for (let d = 1; d <= days; d++) {
    const date =
      `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = d;

    const count = density[date] || 0;
    if (count > 0 && count <= 5) el.classList.add('low');
    if (count > 5 && count <= 10) el.classList.add('mid');
    if (count > 10) el.classList.add('high');
    if (isClosed(date)) el.classList.add('closed');
    if (date === selectedDate) el.classList.add('today');

    el.onclick = () => {
      selectedDate = date;
      updateStoreStatusBar();
      loadBookings();
      loadCalendar();
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
  loadCalendar();
};

nextMonthBtn.onclick = () => {
  viewMonth++;
  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }
  loadCalendar();
};

/* =========================
   BOOKINGS
========================= */
async function loadBookings() {
  if (isClosed(selectedDate)) {
    bookings = [];
    renderTimeOptions();
    renderTable();
    return;
  }

  const res = await fetch(`${API}/bookings?date=${selectedDate}`);
  bookings = await res.json();
  renderTimeOptions();
  renderTable();
  updateSummary();
}

function renderTimeOptions() {
  timeSelect.innerHTML = '';
  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2,'0')}:00:00`;
    const booked = bookings.find(
      b => b.time === time && b.stylist === selectedStylist
    );
    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0,5);
    if (booked || isClosed(selectedDate)) opt.disabled = true;
    timeSelect.appendChild(opt);
  }
}

bookingForm.onsubmit = async e => {
  e.preventDefault();

  if (isClosed(selectedDate)) {
    alert('วันนี้ร้านปิด ไม่สามารถจองได้');
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
      name: document.getElementById('name').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      gender,
      service: document.getElementById('service').value.trim()
    })
  });

  if (res.status === 409) {
    alert('ช่วงเวลานี้ถูกจองแล้ว');
    return;
  }

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
   TABLE + EDIT MODAL
========================= */
function renderTable() {
  listEl.innerHTML = '';
  bookings
    .filter(b => b.stylist === selectedStylist)
    .forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.time.slice(0,5)}</td>
        <td>${b.stylist}</td>
        <td>${b.gender === 'male' ? '👨' : '👩'}</td>
        <td>${b.name}</td>
        <td>${b.service || '-'}</td>
        <td>${b.phone || '-'}</td>
        <td><button class="ghost">จัดการ</button></td>
      `;
      tr.querySelector('button').onclick = () => openEditModal(b);
      listEl.appendChild(tr);
    });
}

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

saveEditBtn.onclick = async () => {
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

deleteEditBtn.onclick = async () => {
  if (!confirm('ยืนยันการลบคิวนี้?')) return;
  await fetch(`${API}/bookings/${editingId}`, { method: 'DELETE' });
  editOverlay.classList.add('hidden');
  loadBookings();
  loadCalendar();
};

closeEditBtn.onclick = () => {
  editOverlay.classList.add('hidden');
};

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
  document.getElementById('countTotal').textContent = bank + sindy + assist;
}

/* =========================
   TABS
========================= */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      t.classList.add('active');
      selectedStylist = t.dataset.tab;
      renderTimeOptions();
      renderTable();
    };
  });
}

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

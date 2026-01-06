const API = 'https://adore-hair.onrender.com';
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
let editingId = null;

/* =========================
   STATE
========================= */
let bookings = [];
let calendarDensity = {};
let closedDays = [];

let selectedStylist = 'Bank';
let selectedDate = today();

let viewMonth = new Date(selectedDate).getMonth();
let viewYear = new Date(selectedDate).getFullYear();

/* =========================
   LOGIN
========================= */
loginBtn.onclick = () => {
  if (pinInput.value !== OWNER_PIN) {
    loginMsg.textContent = 'รหัสผ่านไม่ถูกต้อง';
    return;
  }
  localStorage.setItem('adore_login', '1');
  loginOverlay.classList.add('hidden');
  init();
};

logoutBtn.onclick = () => {
  localStorage.clear();
  location.reload();
};

if (localStorage.getItem('adore_login') === '1') {
  loginOverlay.classList.add('hidden');
  init();
}

/* =========================
   INIT
========================= */
function init() {
  bindTabs();
  initStoreStatus();
  loadCalendar();
  loadBookings();
}

/* =========================
   STORE STATUS
========================= */
function initStoreStatus() {
  const s = localStorage.getItem('store') || 'open';
  renderStore(s);

  toggleStoreBtn.onclick = () => {
    const next = s === 'open' ? 'closed' : 'open';
    localStorage.setItem('store', next);
    renderStore(next);
  };
}

function renderStore(s) {
  storeStatusText.textContent =
    s === 'open' ? 'สถานะร้าน: เปิด' : 'สถานะร้าน: ปิด';
  toggleStoreBtn.textContent = s === 'open' ? 'ปิดร้าน' : 'เปิดร้าน';
}

/* =========================
   CALENDAR
========================= */
async function loadCalendar() {
  calendarDensity = await (await fetch(`${API}/calendar-days`)).json();
  closedDays = await (await fetch(`${API}/closed-days`)).json();
  renderCalendar();
}

function renderCalendar() {
  calendarDaysEl.innerHTML = '';
  const first = new Date(viewYear, viewMonth, 1);
  calendarTitle.textContent =
    first.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  const start = first.getDay();
  const days = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let i = 0; i < start; i++)
    calendarDaysEl.appendChild(document.createElement('div'));

  for (let d = 1; d <= days; d++) {
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = d;

    if (date === selectedDate) el.classList.add('today');
    if (closedDays.includes(date)) el.classList.add('closed');

    const c = calendarDensity[date] || 0;
    if (c > 0 && c <= 5) el.classList.add('low');
    if (c > 5 && c <= 10) el.classList.add('mid');
    if (c > 10) el.classList.add('high');

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
  bookings = await (
    await fetch(`${API}/bookings?date=${selectedDate}`)
  ).json();

  renderSummary();
  renderTimeOptions();
  renderTable();
}

function bindTabs() {
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
    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0, 5);

    if (bookings.find(b => b.time === time && b.stylist === selectedStylist))
      opt.disabled = true;

    timeSelect.appendChild(opt);
  }
}

/* =========================
   FORM SUBMIT
========================= */
bookingForm.onsubmit = async e => {
  e.preventDefault();
  const gender = document.querySelector('[name=gender]:checked').value;

  await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: selectedDate,
      time: timeSelect.value,
      stylist: selectedStylist,
      name: name.value,
      phone: phone.value,
      gender,
      service: service.value
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
  const count = s => bookings.filter(b => b.stylist === s).length;
  countBank.textContent = count('Bank');
  countSindy.textContent = count('Sindy');
  countAssist.textContent = count('Assist');
  countTotal.textContent = bookings.length;
}

/* =========================
   TABLE + EDIT
========================= */
function renderTable() {
  listEl.innerHTML = '';

  bookings.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time.slice(0, 5)}</td>
      <td><span class="badge ${b.stylist}">${b.stylist}</span></td>
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
  const gender = document.querySelector('[name=editGender]:checked').value;

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
function today() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

const API = '';
const OWNER_PIN = '1234';

/* ================= LOGIN ================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

loginBtn.onclick = () => {
  if (pinInput.value !== OWNER_PIN) {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    return;
  }
  localStorage.setItem('logged', '1');
  loginOverlay.classList.add('hidden');
  init();
};

if (localStorage.getItem('logged')) {
  loginOverlay.classList.add('hidden');
  init();
}

logoutBtn.onclick = () => {
  localStorage.removeItem('logged');
  location.reload();
};

/* ================= STATE ================= */
let bookings = [];
let selectedDate = getTodayISO(); // ✅ ค.ศ. เสมอ
let viewMonth = new Date(selectedDate).getMonth();
let viewYear = new Date(selectedDate).getFullYear();

/* ================= INIT ================= */
function init() {
  bindTabs();
  loadCalendar();
  loadBookings();
}

/* ================= CALENDAR ================= */
async function loadCalendar() {
  const res = await fetch(`${API}/calendar-days`);
  const density = await res.json();
  renderCalendar(density);
}

function renderCalendar(density) {
  const calendarDaysEl = document.getElementById('calendarDays');
  const calendarTitle = document.getElementById('calendarTitle');
  calendarDaysEl.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // ✅ แสดงผลเป็น พ.ศ. แต่ logic ยังเป็น ค.ศ.
  calendarTitle.textContent =
    firstDay.toLocaleDateString('th-TH', { month: 'long' }) +
    ' ' +
    (viewYear + 543);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = d;

    if (density?.[date]) el.classList.add(density[date]);

    el.onclick = () => {
      selectedDate = date;
      loadBookings();
    };

    calendarDaysEl.appendChild(el);
  }
}

/* ================= BOOKINGS ================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${selectedDate}`);
  bookings = await res.json();
  renderTimeOptions();
  renderTable();
}

function renderTimeOptions() {
  const timeSelect = document.getElementById('time');
  timeSelect.innerHTML = '';
  for (let h = 13; h <= 22; h++) {
    const t = `${String(h).padStart(2, '0')}:00`;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  }
}

/* ================= TABLE ================= */
function renderTable() {
  const listEl = document.getElementById('list');
  listEl.innerHTML = '';

  bookings.forEach(b => {
    const tr = document.createElement('tr');

    const stylistClass =
      b.stylist === 'Bank' ? 'badge-bank'
      : b.stylist === 'Sindy' ? 'badge-sindy'
      : 'badge-assist';

    tr.innerHTML = `
      <td>${b.time.slice(0,5)}</td>
      <td><span class="stylist-badge ${stylistClass}">${b.stylist}</span></td>
      <td>${b.gender === 'male' ? '👨' : '👩'}</td>
      <td>${b.name}</td>
      <td>${b.service}</td>
      <td>${b.phone}</td>
      <td><button class="ghost">จัดการ</button></td>
    `;

    tr.querySelector('button').onclick = () => {
      openEditModal(b);
    };

    listEl.appendChild(tr);
  });
}

/* ================= TABS ================= */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelector('.tab.active')?.classList.remove('active');
      t.classList.add('active');
      // ❗ ไม่ filter ตาราง
    };
  });
}

/* ================= MODAL ================= */
function openEditModal(b) {
  const modal = document.getElementById('editModal');
  modal.classList.add('show');
  modal.style.maxHeight = '85vh';
  modal.style.overflowY = 'auto';
}

/* ================= UTIL ================= */
function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

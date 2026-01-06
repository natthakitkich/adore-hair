/* =========================
   CONFIG
========================= */
const API = ''; // ใส่ endpoint เดิมของคุณ
const OWNER_PIN = '1234';
const TZ = 'Asia/Bangkok';

/* =========================
   DOM
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
const storeToggleBtn = document.getElementById('storeToggleBtn');

/* =========================
   STATE
========================= */
let bookings = [];
let closedDays = new Set();
let selectedStylist = 'Bank';

let todayTH = getTodayTH();
let selectedDate = todayTH;

let viewDate = new Date(`${todayTH}T00:00:00+07:00`);
let viewMonth = viewDate.getMonth();
let viewYear = viewDate.getFullYear();

let storeOpen = true;

/* =========================
   LOGIN
========================= */
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

/* =========================
   INIT
========================= */
function init() {
  bindTabs();
  bindMonthNav();
  loadStoreStatus();
  loadCalendar();
  loadBookings();
}

/* =========================
   TIME (THAILAND)
========================= */
function getTodayTH() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/* =========================
   CALENDAR
========================= */
async function loadCalendar() {
  const res = await fetch(`${API}/calendar-days`);
  const data = await res.json();

  closedDays = new Set(data.closed || []);
  renderCalendar(data.density || {});
}

function renderCalendar(density) {
  calendarDaysEl.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDay = firstDay.getDay(); // 0 = Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  calendarTitle.textContent = firstDay.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric'
  });

  const totalCells = 42;
  let dayNum = 1 - startDay;

  for (let i = 0; i < totalCells; i++, dayNum++) {
    const cell = document.createElement('div');
    cell.className = 'day';

    if (dayNum < 1 || dayNum > daysInMonth) {
      cell.classList.add('disabled');
      calendarDaysEl.appendChild(cell);
      continue;
    }

    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    cell.textContent = dayNum;

    if (dateStr === todayTH) cell.classList.add('today');
    if (dateStr === selectedDate) cell.classList.add('active');

    if (closedDays.has(dateStr)) {
      cell.classList.add('closed');
    } else if (density[dateStr]) {
      cell.classList.add(density[dateStr]);
    }

    cell.onclick = () => {
      selectedDate = dateStr;
      loadBookings();
      renderCalendar(density);
    };

    calendarDaysEl.appendChild(cell);
  }
}

function bindMonthNav() {
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
}

/* =========================
   STORE STATUS
========================= */
async function loadStoreStatus() {
  const res = await fetch(`${API}/store-status?date=${selectedDate}`);
  const data = await res.json();
  storeOpen = data.open;
  renderStoreStatus();
}

function renderStoreStatus() {
  storeStatusText.textContent = storeOpen ? 'สถานะร้าน: เปิด' : 'สถานะร้าน: ปิด';
  storeToggleBtn.textContent = storeOpen ? 'ปิดร้าน' : 'เปิดร้าน';
}

storeToggleBtn.onclick = async () => {
  storeOpen = !storeOpen;
  await fetch(`${API}/store-status`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ date: selectedDate, open: storeOpen })
  });
  loadCalendar();
  loadBookings();
  renderStoreStatus();
};

/* =========================
   BOOKINGS
========================= */
async function loadBookings() {
  if (closedDays.has(selectedDate)) {
    bookings = [];
    renderTimeOptions();
    renderTable();
    return;
  }

  const res = await fetch(`${API}/bookings?date=${selectedDate}`);
  bookings = await res.json();
  renderTimeOptions();
  renderTable();
}

function renderTimeOptions() {
  timeSelect.innerHTML = '';
  for (let h = 13; h <= 22; h++) {
    const t = `${String(h).padStart(2,'0')}:00`;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  }
}

bookingForm.onsubmit = async e => {
  e.preventDefault();

  if (!storeOpen) return alert('วันนี้ร้านปิด');

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) return alert('เลือกเพศ');

  const payload = {
    date: selectedDate,
    time: timeSelect.value,
    stylist: selectedStylist,
    name: bookingForm.name.value,
    phone: bookingForm.phone.value,
    gender,
    service: bookingForm.service.value
  };

  const res = await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    alert('บันทึกไม่สำเร็จ');
    return;
  }

  bookingForm.reset();
  loadBookings();
  loadCalendar();
};

/* =========================
   TABLE
========================= */
function renderTable() {
  listEl.innerHTML = '';
  bookings.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time.slice(0,5)}</td>
      <td>${b.stylist}</td>
      <td>${b.gender === 'male' ? '👨' : '👩'}</td>
      <td>${b.name}</td>
      <td>${b.service}</td>
      <td>${b.phone}</td>
      <td>
        <button class="ghost edit">แก้ไข</button>
      </td>
    `;

    tr.querySelector('.edit').onclick = () => openEditModal(b);
    listEl.appendChild(tr);
  });
}

/* =========================
   TABS
========================= */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelector('.tab.active')?.classList.remove('active');
      t.classList.add('active');
      selectedStylist = t.dataset.tab;
    };
  });
}

/* =========================
   EDIT MODAL (HOOK)
========================= */
function openEditModal(booking) {
  // modal logic ใช้ของเดิมได้ทันที
  console.log('EDIT', booking);
}

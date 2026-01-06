/* =========================
   CONFIG
========================= */
const API = '';
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
const toggleStoreBtn = document.getElementById('toggleStoreBtn');

/* =========================
   STATE
========================= */
let bookings = [];
let densityMap = {};
let closedDays = new Set();

let selectedStylist = 'Bank';
let selectedDate = getTodayTH();

let view = new Date(`${selectedDate}T00:00:00+07:00`);
let viewMonth = view.getMonth();
let viewYear = view.getFullYear();

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
  loadCalendar();
  loadBookings();
}

/* =========================
   TIME (TH)
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
  const [densityRes, closedRes] = await Promise.all([
    fetch(`${API}/calendar-days`),
    fetch(`${API}/closed-days`)
  ]);

  densityMap = await densityRes.json();
  closedDays = new Set(await closedRes.json());

  renderCalendar();
}

function renderCalendar() {
  calendarDaysEl.innerHTML = '';

  const first = new Date(viewYear, viewMonth, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  calendarTitle.textContent =
    `${first.toLocaleDateString('en-US', { month: 'long' })} ${viewYear}`;

  const totalCells = 42;
  let day = 1 - startDay;

  for (let i = 0; i < totalCells; i++, day++) {
    const el = document.createElement('div');
    el.className = 'day';

    if (day < 1 || day > daysInMonth) {
      el.style.visibility = 'hidden';
      calendarDaysEl.appendChild(el);
      continue;
    }

    const date =
      `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    el.textContent = day;

    if (date === getTodayTH()) el.classList.add('today');
    if (closedDays.has(date)) el.classList.add('closed');

    const count = densityMap[date] || 0;
    if (!closedDays.has(date)) {
      if (count > 0 && count <= 5) el.classList.add('low');
      else if (count <= 10) el.classList.add('mid');
      else if (count > 10) el.classList.add('high');
    }

    el.onclick = () => {
      selectedDate = date;
      loadBookings();
      renderCalendar();
    };

    calendarDaysEl.appendChild(el);
  }

  renderStoreStatus();
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
function renderStoreStatus() {
  const closed = closedDays.has(selectedDate);
  storeStatusText.textContent = closed ? 'สถานะร้าน: ปิด' : 'สถานะร้าน: เปิด';
  toggleStoreBtn.textContent = closed ? 'เปิดร้าน' : 'ปิดร้าน';
}

toggleStoreBtn.onclick = async () => {
  await fetch(`${API}/closed-days`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: selectedDate })
  });

  loadCalendar();
  loadBookings();
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

bookingForm.onsubmit = async e => {
  e.preventDefault();

  if (closedDays.has(selectedDate)) {
    alert('วันนี้ร้านปิด');
    return;
  }

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) return alert('เลือกเพศ');

  await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: selectedDate,
      time: timeSelect.value,
      stylist: selectedStylist,
      name: bookingForm.name.value,
      phone: bookingForm.phone.value,
      gender,
      service: bookingForm.service.value
    })
  });

  bookingForm.reset();
  alert('บันทึกคิวเรียบร้อยแล้ว');
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
      <td><span class="badge ${b.stylist.toLowerCase()}">${b.stylist}</span></td>
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
   TABS
========================= */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelector('.tab.active')?.classList.remove('active');
      t.classList.add('active');
      selectedStylist = t.dataset.tab;
      renderTimeOptions();
    };
  });
}

/* =========================
   EDIT MODAL
========================= */
function openEditModal(b) {
  console.log('EDIT', b);
  // ใช้ modal เดิมของคุณได้ทันที
}

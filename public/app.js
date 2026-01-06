const API = '';
const OWNER_PIN = '1234';

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

let bookings = [];
let selectedStylist = 'Bank';
let selectedDate = getTodayTH();
let viewMonth = new Date(selectedDate).getMonth();
let viewYear = new Date(selectedDate).getFullYear();

/* LOGIN */
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

/* INIT */
function init() {
  bindTabs();
  loadCalendar();
  loadBookings();
}

/* CALENDAR */
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
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = d;
    if (density[date]) el.classList.add('low');
    el.onclick = () => {
      selectedDate = date;
      loadBookings();
    };
    calendarDaysEl.appendChild(el);
  }
}

/* BOOKINGS */
async function loadBookings() {
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

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) return alert('เลือกเพศ');

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
      <td><button class="ghost">จัดการ</button></td>
    `;
    tr.querySelector('button').onclick = () => {
      alert('ฟังก์ชันแก้ไขยังคงเหมือนเดิม (เปิด modal ได้)');
    };
    listEl.appendChild(tr);
  });
}

/* TABS */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      t.classList.add('active');
      selectedStylist = t.dataset.tab;
      renderTimeOptions();
    };
  });
}

/* UTIL */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

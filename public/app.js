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
let calendarDensity = {};
let closedDays = new Set();

let selectedStylist = 'Bank';
let selectedDate = getTodayTH();

let viewYear = Number(selectedDate.slice(0,4));
let viewMonth = Number(selectedDate.slice(5,7)) - 1;

let storeOpen = true;

/* =========================
   LOGIN
========================= */
loginBtn.onclick = () => {
  if (pinInput.value !== OWNER_PIN) {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    return;
  }
  localStorage.setItem('adore_logged', '1');
  loginOverlay.classList.add('hidden');
  init();
};

logoutBtn.onclick = () => {
  localStorage.removeItem('adore_logged');
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('adore_logged') === '1') {
    loginOverlay.classList.add('hidden');
    init();
  }
});

/* =========================
   INIT
========================= */
function init() {
  bindTabs();
  bindMonthNav();
  loadCalendar();
  loadBookings();
  loadStoreStatus();
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
  const d = await fetch(`${API}/calendar-days`).then(r => r.json());
  calendarDensity = d || {};

  const c = await fetch(`${API}/closed-days`).then(r => r.json());
  closedDays = new Set(c || []);

  renderCalendar();
}

function renderCalendar() {
  calendarDaysEl.innerHTML = '';

  const firstDateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-01`;
  const firstDay = new Date(`${firstDateStr}T00:00:00+07:00`).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();

  calendarTitle.textContent = new Date(
    `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-01T00:00:00+07:00`
  ).toLocaleDateString('th-TH', { month:'long', year:'numeric' });

  const totalCells = 42;
  let dayNum = 1 - firstDay;

  for (let i=0;i<totalCells;i++,dayNum++){
    const cell = document.createElement('div');
    cell.className = 'day';

    if (dayNum < 1 || dayNum > daysInMonth){
      cell.classList.add('disabled');
      calendarDaysEl.appendChild(cell);
      continue;
    }

    const dateStr =
      `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    cell.textContent = dayNum;

    if (dateStr === getTodayTH()) cell.classList.add('today');
    if (dateStr === selectedDate) cell.classList.add('active');

    if (closedDays.has(dateStr)){
      cell.classList.add('closed');
    } else {
      const count = calendarDensity[dateStr] || 0;
      if (count >= 1 && count <= 4) cell.classList.add('low');
      else if (count >= 5 && count <= 7) cell.classList.add('mid');
      else if (count >= 8) cell.classList.add('high');
    }

    cell.onclick = () => {
      selectedDate = dateStr;
      loadBookings();
      loadStoreStatus();
      renderCalendar();
    };

    calendarDaysEl.appendChild(cell);
  }
}

function bindMonthNav(){
  prevMonthBtn.onclick = () => {
    viewMonth--;
    if (viewMonth < 0){ viewMonth=11; viewYear--; }
    loadCalendar();
  };
  nextMonthBtn.onclick = () => {
    viewMonth++;
    if (viewMonth > 11){ viewMonth=0; viewYear++; }
    loadCalendar();
  };
}

/* =========================
   STORE STATUS
========================= */
function loadStoreStatus(){
  storeOpen = !closedDays.has(selectedDate);
  storeStatusText.textContent = storeOpen ? 'สถานะร้าน: เปิด' : 'สถานะร้าน: ปิด';
  toggleStoreBtn.textContent = storeOpen ? 'ปิดร้าน' : 'เปิดร้าน';
}

toggleStoreBtn.onclick = async () => {
  await fetch(`${API}/closed-days`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ date:selectedDate })
  });
  loadCalendar();
  loadStoreStatus();
  loadBookings();
};

/* =========================
   BOOKINGS
========================= */
async function loadBookings(){
  const res = await fetch(`${API}/bookings?date=${selectedDate}`);
  bookings = await res.json();
  renderSummary();
  renderTimeOptions();
  renderTable();
}

function renderTimeOptions(){
  timeSelect.innerHTML = '';

  const stylistBookings = bookings.filter(b=>b.stylist===selectedStylist);
  const countToday = stylistBookings.length;

  for (let h=13;h<=22;h++){
    const time = `${String(h).padStart(2,'0')}:00:00`;
    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0,5);

    const taken = stylistBookings.find(b=>b.time===time);
    if (!storeOpen || taken || countToday>=10){
      opt.disabled = true;
      opt.style.color = '#777';
    }
    timeSelect.appendChild(opt);
  }
}

bookingForm.onsubmit = async e => {
  e.preventDefault();
  if (!storeOpen) return alert('วันนี้ร้านปิด');

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) return alert('กรุณาเลือกเพศ');

  const payload = {
    date:selectedDate,
    time:timeSelect.value,
    stylist:selectedStylist,
    name:document.getElementById('name').value,
    phone:document.getElementById('phone').value,
    gender,
    service:document.getElementById('service').value
  };

  const res = await fetch(`${API}/bookings`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });

  if (!res.ok) return alert('บันทึกไม่สำเร็จ');
  alert('บันทึกคิวเรียบร้อยแล้ว');
  bookingForm.reset();
  loadBookings();
  loadCalendar();
};

/* =========================
   SUMMARY
========================= */
function renderSummary(){
  const bank = bookings.filter(b=>b.stylist==='Bank').length;
  const sindy = bookings.filter(b=>b.stylist==='Sindy').length;
  const assist = bookings.filter(b=>b.stylist==='Assist').length;
  document.getElementById('countBank').textContent = bank;
  document.getElementById('countSindy').textContent = sindy;
  document.getElementById('countAssist').textContent = assist;
  document.getElementById('countTotal').textContent = bank+sindy+assist;
}

/* =========================
   TABLE
========================= */
function renderTable(){
  listEl.innerHTML='';
  bookings.forEach(b=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${b.time.slice(0,5)}</td>
      <td><span class="badge ${b.stylist.toLowerCase()}">${b.stylist}</span></td>
      <td>${b.gender==='male'?'👨':'👩'}</td>
      <td>${b.name}</td>
      <td>${b.service||''}</td>
      <td>${b.phone||''}</td>
      <td><button class="ghost">จัดการ</button></td>
    `;
    tr.querySelector('button').onclick=()=>openEditModal(b);
    listEl.appendChild(tr);
  });
}

/* =========================
   TABS
========================= */
function bindTabs(){
  document.querySelectorAll('.tab').forEach(tab=>{
    tab.onclick=()=>{
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      selectedStylist=tab.dataset.tab;
      renderTimeOptions();
    };
  });
}

/* =========================
   EDIT MODAL
========================= */
function openEditModal(b){
  console.log('EDIT',b);
}

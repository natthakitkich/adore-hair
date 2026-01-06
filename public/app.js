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

/* =========================
   STATE
========================= */
let bookings = [];
let selectedStylist = 'Bank';
let selectedDate = getTodayISO();

let viewDate = new Date(getTodayISO() + 'T00:00:00');

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
function init(){
  bindTabs();
  bindCalendarNav();
  loadCalendar();
  loadBookings();
}

/* =========================
   CALENDAR
========================= */
function bindCalendarNav(){
  prevMonthBtn.onclick = () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    loadCalendar();
  };
  nextMonthBtn.onclick = () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    loadCalendar();
  };
}

async function loadCalendar(){
  const res = await fetch(`${API}/calendar-days`);
  const density = await res.json();
  renderCalendar(density);
}

function renderCalendar(density){
  calendarDaysEl.innerHTML = '';

  const year = viewDate.getFullYear();        // ค.ศ. จริง
  const month = viewDate.getMonth();          // 0–11
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();

  // ชื่อเดือนภาษาไทย แต่ "ปี ค.ศ."
  calendarTitle.textContent =
    firstDay.toLocaleDateString('th-TH', { month:'long' }) +
    ' ' + year;

  // offset วันในสัปดาห์ (อา = 0)
  const offset = firstDay.getDay();

  // ช่องว่างก่อนวันแรก
  for(let i=0;i<offset;i++){
    calendarDaysEl.appendChild(document.createElement('div'));
  }

  for(let d=1; d<=lastDate; d++){
    const iso =
      `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = d;

    if (iso === getTodayISO()) el.classList.add('today');
    if (density[iso] >= 6) el.classList.add('high');
    else if (density[iso] >= 3) el.classList.add('mid');
    else if (density[iso]) el.classList.add('low');

    el.onclick = () => {
      selectedDate = iso;
      loadBookings();
    };

    calendarDaysEl.appendChild(el);
  }
}

/* =========================
   BOOKINGS
========================= */
async function loadBookings(){
  const res = await fetch(`${API}/bookings?date=${selectedDate}`);
  bookings = await res.json();

  renderTimeOptions();
  renderTable(); // << แสดงทุกช่างเสมอ
}

function renderTimeOptions(){
  timeSelect.innerHTML = '';
  for(let h=13; h<=22; h++){
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

  const res = await fetch(`${API}/bookings`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      date:selectedDate,
      time:timeSelect.value,
      stylist:selectedStylist,
      name:document.getElementById('name').value,
      phone:document.getElementById('phone').value,
      gender,
      service:document.getElementById('service').value
    })
  });

  if(!res.ok){
    alert('เกิดข้อผิดพลาดในการบันทึกคิว');
    return;
  }

  alert('บันทึกคิวเรียบร้อยแล้ว');
  bookingForm.reset();
  loadBookings();
  loadCalendar();
};

function renderTable(){
  listEl.innerHTML = '';

  bookings.forEach(b=>{
    const badgeClass =
      b.stylist === 'Bank' ? 'bank' :
      b.stylist === 'Sindy' ? 'sindy' : 'assist';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time.slice(0,5)}</td>
      <td><span class="badge ${badgeClass}">${b.stylist}</span></td>
      <td>${b.gender === 'male' ? '👨' : '👩'}</td>
      <td>${b.name}</td>
      <td>${b.service}</td>
      <td>${b.phone || '-'}</td>
      <td><button class="ghost">จัดการ</button></td>
    `;

    tr.querySelector('button').onclick = () => {
      alert('ฟังก์ชันแก้ไขยังคงเหมือนเดิม');
    };

    listEl.appendChild(tr);
  });
}

/* =========================
   TABS
========================= */
function bindTabs(){
  document.querySelectorAll('.tab').forEach(tab=>{
    tab.onclick = ()=>{
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      selectedStylist = tab.dataset.tab;
    };
  });
}

/* =========================
   UTIL
========================= */
function getTodayISO(){
  return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'});
}

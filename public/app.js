/* =========================
   CONFIG
========================= */
const OWNER_PIN = '1234';
const TZ = 'Asia/Bangkok';
const DAILY_CAPACITY = 20;

/* =========================
   STATE
========================= */
let currentDate;
let viewYear, viewMonth;
let currentStylist = 'Bank'; // ✅ default
let bookings = [];
let calendarMap = {};

/* =========================
   ELEMENTS
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');
const pinInput = document.getElementById('pin');
const logoutBtn = document.getElementById('logoutBtn');

const dateInput = document.getElementById('date');
const calendarDays = document.getElementById('calendarDays');
const calendarTitle = document.getElementById('calendarTitle');
const timeSelect = document.getElementById('time');
const list = document.getElementById('list');

const countBank = document.getElementById('countBank');
const countSindy = document.getElementById('countSindy');
const countAssist = document.getElementById('countAssist');
const countTotal = document.getElementById('countTotal');

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initDate();
  bindUI();
  loadAll();
});

/* =========================
   AUTH
========================= */
function initAuth(){
  if(localStorage.getItem('adore_logged_in') === '1'){
    loginOverlay.classList.add('hidden');
  }

  loginBtn.onclick = () => {
    if(pinInput.value === OWNER_PIN){
      localStorage.setItem('adore_logged_in','1');
      loginOverlay.classList.add('hidden');
      loadAll();
    }else{
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    }
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem('adore_logged_in');
    location.reload();
  };
}

/* =========================
   DATE
========================= */
function initDate(){
  const now = new Date(
    new Date().toLocaleString('en-US',{ timeZone:TZ })
  );
  setDate(now.toISOString().slice(0,10));
}

function setDate(dateStr){
  currentDate = dateStr;
  const d = new Date(dateStr);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();
  dateInput.value = dateStr;
}

/* =========================
   UI
========================= */
function bindUI(){
  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);

  dateInput.onchange = e => {
    setDate(e.target.value);
    loadAll();
  };

  // ✅ เลือกช่าง = ใช้ตอน "บันทึก"
  document.querySelectorAll('.tab').forEach(tab=>{
    tab.onclick = ()=>{
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
    };
  });

  document.getElementById('bookingForm').onsubmit = submitForm;
}

/* =========================
   MONTH
========================= */
function changeMonth(delta){
  viewMonth += delta;
  if(viewMonth < 0){ viewMonth = 11; viewYear--; }
  if(viewMonth > 11){ viewMonth = 0; viewYear++; }
  renderCalendar();
}

/* =========================
   LOAD
========================= */
async function loadAll(){
  await Promise.all([
    loadCalendarMap(),
    loadBookings()
  ]);
  renderCalendar();
  renderTable();
  renderSummary();
}

/* =========================
   DATA
========================= */
async function loadBookings(){
  const r = await fetch(`/bookings?date=${currentDate}`);
  bookings = await r.json();
}

async function loadCalendarMap(){
  const r = await fetch('/calendar-days');
  calendarMap = await r.json();
}

/* =========================
   CALENDAR
========================= */
function renderCalendar(){
  calendarDays.innerHTML = '';
  calendarTitle.textContent =
    new Date(viewYear,viewMonth)
      .toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  const firstDay = new Date(viewYear,viewMonth,1).getDay();
  const total = new Date(viewYear,viewMonth+1,0).getDate();

  for(let i=0;i<firstDay;i++){
    calendarDays.appendChild(document.createElement('div'));
  }

  for(let d=1;d<=total;d++){
    const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count = calendarMap[dateStr] || 0;
    const ratio = count / DAILY_CAPACITY;

    const cell = document.createElement('div');
    cell.className = 'calCell';

    const num = document.createElement('div');
    num.className = 'calNum';
    num.textContent = d;

    if(count){
      if(ratio<=0.3) num.classList.add('density-low');
      else if(ratio<=0.65) num.classList.add('density-mid');
      else if(ratio<1) num.classList.add('density-high');
      else num.classList.add('density-full');
    }

    if(dateStr===currentDate) cell.classList.add('selected');

    cell.onclick = ()=>{
      setDate(dateStr);
      loadAll();
    };

    cell.appendChild(num);
    calendarDays.appendChild(cell);
  }
}

/* =========================
   TABLE (แสดงทุกช่าง)
========================= */
function renderTable(){
  list.innerHTML = '';

  bookings.forEach(b=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time}</td>
      <td>
        <span class="badge stylist-${b.stylist.toLowerCase()}">
          ${b.stylist}
        </span>
      </td>
      <td>${b.gender === 'male' ? '👨' : '👩'}</td>
      <td>${b.name}</td>
      <td>${b.service || ''}</td>
      <td>${b.phone || ''}</td>
      <td></td>
    `;
    list.appendChild(tr);
  });
}

/* =========================
   SUMMARY
========================= */
function renderSummary(){
  const c = s => bookings.filter(b=>b.stylist===s).length;
  countBank.textContent = c('Bank');
  countSindy.textContent = c('Sindy');
  countAssist.textContent = c('Assist');
  countTotal.textContent = bookings.length;
}

/* =========================
   SUBMIT FORM
========================= */
async function submitForm(e){
  e.preventDefault();

  const time = document.getElementById('time').value;
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const service = document.getElementById('service').value.trim();
  const gender = document.querySelector('input[name="gender"]:checked')?.value;

  if(!time || !name || !gender){
    alert('กรุณากรอกข้อมูลให้ครบ');
    return;
  }

  const payload = {
    date: currentDate,
    time,
    stylist: currentStylist, // ✅ ตามแท็บที่เลือก
    name,
    gender,
    phone,
    service
  };

  const r = await fetch('/bookings',{
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });

  if(!r.ok){
    const err = await r.json();
    alert(err.error || 'เกิดข้อผิดพลาด');
    return;
  }

  e.target.reset();
  await loadAll();
}

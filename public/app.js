const OWNER_PIN = '1234';
const TZ = 'Asia/Bangkok';

let currentDate = '';
let viewYear, viewMonth;
let currentStylist = 'Bank';
let calendarMap = {};

const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');
const pinInput = document.getElementById('pin');
const logoutBtn = document.getElementById('logoutBtn');

const dateInput = document.getElementById('date');
const calendarDays = document.getElementById('calendarDays');
const calendarTitle = document.getElementById('calendarTitle');
const timeSelect = document.getElementById('time');

init();

function init(){
  initAuth();
  initDate();
  bindUI();
  loadAll();
}

/* ===== AUTH ===== */
function initAuth(){
  if(localStorage.getItem('adore_logged_in') === '1'){
    loginOverlay.classList.add('hidden');
  }

  loginBtn.onclick = ()=>{
    if(pinInput.value === OWNER_PIN){
      localStorage.setItem('adore_logged_in','1');
      loginOverlay.classList.add('hidden');
    }else{
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    }
  };

  logoutBtn.onclick = ()=>{
    localStorage.removeItem('adore_logged_in');
    location.reload();
  };
}

/* ===== DATE ===== */
function initDate(){
  const now = new Date(
    new Date().toLocaleString('en-US',{ timeZone: TZ })
  );

  currentDate = now.toISOString().slice(0,10);
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  dateInput.value = currentDate;
}

/* ===== UI ===== */
function bindUI(){
  document.getElementById('prevMonth').onclick = ()=>changeMonth(-1);
  document.getElementById('nextMonth').onclick = ()=>changeMonth(1);

  document.querySelectorAll('.tab').forEach(t=>{
    t.onclick = ()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      currentStylist = t.dataset.tab;
      loadSlots();
    };
  });

  document.getElementById('bookingForm').onsubmit = submitForm;
}

/* ===== MONTH ===== */
function changeMonth(d){
  viewMonth += d;
  if(viewMonth < 0){ viewMonth = 11; viewYear--; }
  if(viewMonth > 11){ viewMonth = 0; viewYear++; }
  loadCalendar();
}

/* ===== LOAD ===== */
async function loadAll(){
  await loadCalendar();
  await loadSlots();
}

/* ===== CALENDAR ===== */
async function loadCalendar(){
  const res = await fetch('/calendar-days');
  const { days=[] } = await res.json();

  calendarMap = {};
  days.forEach(d => calendarMap[d.date] = d);

  calendarDays.innerHTML = '';
  calendarTitle.textContent =
    new Date(viewYear,viewMonth)
      .toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth+1, 0).getDate();

  for(let i=0;i<firstDay;i++){
    calendarDays.appendChild(document.createElement('div'));
  }

  for(let d=1; d<=totalDays; d++){
    const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'calCell';

    const info = calendarMap[dateStr];
    if(info){
      const r = info.ratio;
      if(r > 0 && r <= .25) cell.classList.add('lv1');
      else if(r <= .5) cell.classList.add('lv2');
      else if(r <= .75) cell.classList.add('lv3');
      else cell.classList.add('lv4');
    }

    cell.innerHTML = `<div class="calNum">${d}</div>`;

    if(dateStr === currentDate) cell.classList.add('selected');

    cell.onclick = ()=>{
      currentDate = dateStr;
      dateInput.value = dateStr;
      loadSlots();
    };

    calendarDays.appendChild(cell);
  }
}

/* ===== SLOTS ===== */
async function loadSlots(){
  timeSelect.innerHTML = '<option value="">เลือกเวลา</option>';
  const r = await fetch(`/slots?date=${currentDate}`);
  const { slots={} } = await r.json();

  Object.keys(slots).forEach(t=>{
    if(!slots[t][currentStylist]){
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t.slice(0,5);
      timeSelect.appendChild(o);
    }
  });
}

/* ===== FORM ===== */
async function submitForm(e){
  e.preventDefault();

  const body = {
    date: currentDate,
    time: timeSelect.value,
    stylist: currentStylist,
    name: name.value,
    phone: phone.value,
    gender: document.querySelector('[name="gender"]:checked')?.value,
    service: service.value
  };

  const r = await fetch('/bookings',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });

  if(r.ok){
    e.target.reset();
    loadAll();
  }
}

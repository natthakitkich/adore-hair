/* ===== CONFIG ===== */
const OWNER_PIN = '1234';
const TZ = 'Asia/Bangkok';

/* ===== STATE ===== */
let currentDate = '';
let viewYear, viewMonth;
let currentStylist = 'Bank';
let bookings = [];

/* ===== ELEMENTS ===== */
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

/* ===== INIT ===== */
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

/* ===== LOAD ALL ===== */
async function loadAll(){
  await loadBookings();
  await loadCalendar();
  await loadSlots();
  renderTable();
  renderSummary();
}

/* ===== CALENDAR ===== */
async function loadCalendar(){
  calendarDays.innerHTML = '';

  calendarTitle.textContent =
    `${new Date(viewYear,viewMonth)
      .toLocaleDateString('th-TH',{month:'long',year:'numeric'})}`;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth+1, 0).getDate();

  for(let i=0;i<firstDay;i++){
    calendarDays.appendChild(document.createElement('div'));
  }

  for(let d=1; d<=totalDays; d++){
    const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'calCell';
    cell.innerHTML = `<div class="calNum">${d}</div>`;

    /* ===== GRADIENT LOGIC (Bank + Sindy only) ===== */
    const dayBookings = bookings.filter(b =>
      b.date === dateStr &&
      (b.stylist === 'Bank' || b.stylist === 'Sindy')
    );

    const count = dayBookings.length;

    if(count > 0 && count <= 5){
      cell.classList.add('level-low');
    }else if(count <= 10){
      cell.classList.add('level-mid');
    }else if(count < 20){
      cell.classList.add('level-high');
    }else if(count >= 20){
      cell.classList.add('level-full');
    }

    if(dateStr === currentDate){
      cell.classList.add('selected');
    }

    cell.onclick = ()=>{
      currentDate = dateStr;
      dateInput.value = dateStr;
      loadAll();
    };

    calendarDays.appendChild(cell);
  }
}

/* ===== BOOKINGS ===== */
async function loadBookings(){
  const r = await fetch(`/bookings?date=${currentDate}`);
  bookings = await r.json();
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

/* ===== TABLE ===== */
function renderTable(){
  list.innerHTML = '';
  bookings.forEach(b=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time.slice(0,5)}</td>
      <td>${b.stylist}</td>
      <td>${b.gender==='male'?'👨':'👩'}</td>
      <td>${b.name}</td>
      <td>${b.service||'-'}</td>
      <td>${b.phone||'-'}</td>
      <td><button class="smallBtn danger">ลบ</button></td>
    `;
    tr.querySelector('button').onclick = async ()=>{
      await fetch(`/bookings/${b.id}`,{method:'DELETE'});
      loadAll();
    };
    list.appendChild(tr);
  });
}

/* ===== SUMMARY ===== */
function renderSummary(){
  const c = s => bookings.filter(b=>b.stylist===s).length;
  countBank.textContent = c('Bank');
  countSindy.textContent = c('Sindy');
  countAssist.textContent = c('Assist');
  countTotal.textContent = bookings.length;
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
  if(r.ok){ e.target.reset(); loadAll(); }
}

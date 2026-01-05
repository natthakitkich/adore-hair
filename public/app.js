const API = '';
const OWNER_PIN = '1234';
const LOGIN_KEY = 'adore_login';

let bookings = [];
let closedDays = [];
let currentDate = '';
let currentStylist = 'Bank';
let currentMonth = new Date();

/* ===== LOGIN ===== */
const overlay = document.getElementById('loginOverlay');

function requireLogin() {
  if (localStorage.getItem(LOGIN_KEY) === 'true') {
    overlay.classList.add('hidden');
    init();
  } else {
    overlay.classList.remove('hidden');
  }
}

document.getElementById('loginBtn').onclick = () => {
  if (document.getElementById('pin').value === OWNER_PIN) {
    localStorage.setItem(LOGIN_KEY, 'true');
    overlay.classList.add('hidden');
    init();
  } else {
    document.getElementById('loginMsg').textContent = 'PIN ไม่ถูกต้อง';
  }
};

document.getElementById('logoutBtn').onclick = () => {
  localStorage.removeItem(LOGIN_KEY);
  location.reload();
};

requireLogin();

/* ===== INIT ===== */
function init() {
  const today = new Date().toISOString().slice(0,10);
  currentDate = today;
  document.getElementById('date').value = today;

  document.getElementById('date').onchange = e => {
    currentDate = e.target.value;
    loadAll();
  };

  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      t.classList.add('active');
      currentStylist = t.dataset.tab;
      renderTimeOptions();
    };
  });

  document.getElementById('prevMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  };
  document.getElementById('nextMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  };

  document.getElementById('setHoliday').onclick = () => toggleHoliday(true);
  document.getElementById('unsetHoliday').onclick = () => toggleHoliday(false);

  loadAll();
}

async function loadAll(){
  await loadClosedDays();
  await loadBookings();
}

/* ===== DATA ===== */
async function loadBookings(){
  bookings = await fetch(`${API}/bookings?date=${currentDate}`).then(r=>r.json());
  renderTimeOptions();
  renderTable();
  updateSummary();
}

async function loadClosedDays(){
  closedDays = await fetch(`${API}/closed-days`).then(r=>r.json());
  renderCalendar();
  updateDayControl();
}

/* ===== CALENDAR ===== */
function renderCalendar(){
  const grid = document.getElementById('calendarDays');
  const title = document.getElementById('calendarTitle');
  grid.innerHTML = '';
  title.textContent = currentMonth.toLocaleString('th-TH',{month:'long',year:'numeric'});

  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();
  const first = new Date(y,m,1).getDay();
  const days = new Date(y,m+1,0).getDate();

  for(let i=0;i<first;i++) grid.appendChild(document.createElement('div'));

  for(let d=1;d<=days;d++){
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'calCell';
    if(dateStr===currentDate) cell.classList.add('selected');
    if(closedDays.includes(dateStr)) cell.classList.add('closed');

    const num = document.createElement('div');
    num.className = 'calNum';
    if(closedDays.includes(dateStr)) num.classList.add('closed');
    num.textContent = d;

    cell.appendChild(num);
    cell.onclick = () => {
      currentDate = dateStr;
      document.getElementById('date').value = dateStr;
      loadAll();
    };
    grid.appendChild(cell);
  }
}

/* ===== DAY CONTROL ===== */
function updateDayControl(){
  const closed = closedDays.includes(currentDate);
  document.getElementById('dayStatus').textContent =
    closed ? 'วันนี้ปิดทำการ' : 'วันนี้เปิดทำการตามปกติ';
  document.getElementById('setHoliday').classList.toggle('hidden', closed);
  document.getElementById('unsetHoliday').classList.toggle('hidden', !closed);
}

async function toggleHoliday(close){
  await fetch(`${API}/closed-days`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({date:currentDate,action:close?'close':'open'})
  });
  loadClosedDays();
}

/* ===== TIME ===== */
function renderTimeOptions(){
  const sel = document.getElementById('time');
  sel.innerHTML='';
  if(closedDays.includes(currentDate)){
    sel.innerHTML='<option disabled>ร้านปิดทำการ</option>';
    return;
  }
  for(let h=13;h<=22;h++){
    const t=`${String(h).padStart(2,'0')}:00:00`;
    const used = bookings.find(b=>b.time===t && b.stylist===currentStylist);
    const o=document.createElement('option');
    o.value=t; o.textContent=t.slice(0,5);
    if(used) o.disabled=true;
    sel.appendChild(o);
  }
}

/* ===== TABLE ===== */
function renderTable(){
  const list=document.getElementById('list');
  list.innerHTML='';
  bookings.sort((a,b)=>a.time.localeCompare(b.time)).forEach(b=>{
    const cls =
      b.stylist==='Bank'?'stylist-bank':
      b.stylist==='Sindy'?'stylist-sindy':'stylist-assist';

    list.innerHTML+=`
      <tr>
        <td>${b.time.slice(0,5)}</td>
        <td><span class="stylist-badge ${cls}">${b.stylist}</span></td>
        <td>${b.gender==='male'?'👨':'👩'}</td>
        <td>${b.name}</td>
        <td>${b.service||''}</td>
        <td>${b.phone||''}</td>
        <td><button class="ghost">ลบ/แก้ไขคิว</button></td>
      </tr>`;
  });
}

function updateSummary(){
  const c = s => bookings.filter(b=>b.stylist===s).length;
  countBank.textContent=c('Bank');
  countSindy.textContent=c('Sindy');
  countAssist.textContent=c('Assist');
  countTotal.textContent=bookings.length;
}

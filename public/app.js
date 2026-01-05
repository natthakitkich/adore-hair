/* =========================
   AUTH
========================= */

const OWNER_PIN = '1234';
let isAuthed = false;

const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

loginBtn.onclick = () => {
  if (pinInput.value === OWNER_PIN) {
    isAuthed = true;
    loginOverlay.classList.add('hidden');
    bootApp();
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
};

logoutBtn.onclick = () => location.reload();

/* =========================
   APP BOOT
========================= */

function bootApp(){
  renderTopDate();
  renderCalendar();
  renderStylistTabs();
  renderSummary();
  renderQueueTable();
}

/* =========================
   TOP DATE
========================= */

function renderTopDate(){
  document.getElementById('topDate').textContent =
    new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}

/* =========================
   CALENDAR
========================= */

let currentMonth = new Date();

function renderCalendar(){
  const grid = document.getElementById('calendarGrid');
  const title = document.getElementById('calendarTitle');

  grid.innerHTML = '';
  title.textContent = currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year,month,1).getDay();
  const total = new Date(year,month+1,0).getDate();

  for(let i=0;i<firstDay;i++){
    grid.appendChild(document.createElement('div'));
  }

  for(let d=1;d<=total;d++){
    const cell = document.createElement('div');
    cell.className = 'calCell';
    cell.textContent = d;
    grid.appendChild(cell);
  }
}

document.getElementById('prevMonth').onclick = ()=>{
  currentMonth.setMonth(currentMonth.getMonth()-1);
  renderCalendar();
};
document.getElementById('nextMonth').onclick = ()=>{
  currentMonth.setMonth(currentMonth.getMonth()+1);
  renderCalendar();
};

/* =========================
   STYLIST
========================= */

const stylists = ['Bank','Sindy','Assist'];
let activeStylist = 'Bank';

function renderStylistTabs(){
  const wrap = document.getElementById('stylistTabs');
  wrap.innerHTML = '';
  stylists.forEach(s=>{
    const b = document.createElement('div');
    b.className = 'tab'+(s===activeStylist?' active':'');
    b.textContent = s;
    b.onclick = ()=>{ activeStylist=s; renderStylistTabs(); };
    wrap.appendChild(b);
  });
}

/* =========================
   SUMMARY
========================= */

function renderSummary(){
  const el = document.getElementById('summary');
  el.innerHTML = `
    <div class="panel">Bank<br><b>0</b></div>
    <div class="panel">Sindy<br><b>0</b></div>
    <div class="panel">Assist<br><b>0</b></div>
    <div class="panel">รวม<br><b>0</b></div>
  `;
}

/* =========================
   QUEUE TABLE
========================= */

function renderQueueTable(){
  document.getElementById('queueTable').innerHTML = '';
}

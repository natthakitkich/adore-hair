const TZ = 'Asia/Bangkok';
const OWNER_PIN = '1234';

let selectedDate = '';
let todayDate = '';
let viewYear, viewMonth;
let bookings = [];

/* ===== ELEMENTS ===== */
const calendarDays = document.getElementById('calendarDays');
const calendarTitle = document.getElementById('calendarTitle');
const loginOverlay = document.getElementById('loginOverlay');
const pinInput = document.getElementById('pin');

/* ===== INIT ===== */
init();

function init(){
  initDate();
  initAuth();
  loadCalendar();
  loadBookings();
}

/* ===== AUTH ===== */
function initAuth(){
  if(localStorage.getItem('login')==='1'){
    loginOverlay.classList.add('hidden');
  }

  loginBtn.onclick = ()=>{
    if(pinInput.value === OWNER_PIN){
      localStorage.setItem('login','1');
      loginOverlay.classList.add('hidden');
    }else{
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    }
  };

  logoutBtn.onclick = ()=>{
    localStorage.removeItem('login');
    location.reload();
  };
}

/* ===== DATE ===== */
function initDate(){
  const now = new Date(new Date().toLocaleString('en-US',{timeZone:TZ}));
  todayDate = now.toISOString().slice(0,10);
  selectedDate = todayDate;
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
}

/* ===== LOAD BOOKINGS ===== */
async function loadBookings(){
  const r = await fetch(`/bookings?date=${selectedDate}`);
  bookings = await r.json();
  renderTable();
}

/* ===== CALENDAR ===== */
async function loadCalendar(){
  const r = await fetch('/calendar-days');
  const { days } = await r.json();

  calendarTitle.textContent =
    new Date(viewYear,viewMonth)
      .toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  calendarDays.innerHTML = '';

  const firstDay = new Date(viewYear,viewMonth,1).getDay();
  const total = new Date(viewYear,viewMonth+1,0).getDate();

  for(let i=0;i<firstDay;i++) calendarDays.appendChild(document.createElement('div'));

  for(let d=1;d<=total;d++){
    const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'calCell';

    if(dateStr === todayDate) cell.classList.add('today');
    if(dateStr === selectedDate) cell.classList.add('selected');

    const count = days[dateStr] || 0;
    if(count>0) cell.classList.add(levelClass(count));

    cell.textContent = d;
    cell.onclick = ()=>{
      selectedDate = dateStr;
      loadCalendar();
      loadBookings();
    };

    calendarDays.appendChild(cell);
  }
}

function levelClass(c){
  if(c<=5) return 'lv1';
  if(c<=10) return 'lv2';
  if(c<=15) return 'lv3';
  return 'lv4';
}

/* ===== TABLE ===== */
function renderTable(){
  list.innerHTML='';
  bookings.forEach(b=>{
    list.innerHTML+=`
      <tr>
        <td>${b.time}</td>
        <td>${b.stylist}</td>
        <td>${b.gender}</td>
        <td>${b.name}</td>
        <td>${b.service||'-'}</td>
        <td>${b.phone||'-'}</td>
      </tr>`;
  });
}

const OWNER_PIN = '1234';
const TZ = 'Asia/Bangkok';
const DAILY_CAPACITY = 20;

/* ===== STATE ===== */
let selectedDate = '';
let viewYear, viewMonth;
let currentStylist = 'Bank';
let bookings = [];
let calendarMap = {};

/* ===== INIT ===== */
init();

async function init(){
  initAuth();
  initDate();
  bindUI();
  await loadCalendarMap();
  renderCalendar();
  await loadBookings();
  renderAll();
}

/* ===== AUTH ===== */
function initAuth(){
  if(localStorage.getItem('adore_logged_in')==='1'){
    loginOverlay.classList.add('hidden');
  }
  loginBtn.onclick=()=>{
    if(pinInput.value===OWNER_PIN){
      localStorage.setItem('adore_logged_in','1');
      loginOverlay.classList.add('hidden');
    }else{
      loginMsg.textContent='PIN ไม่ถูกต้อง';
    }
  };
  logoutBtn.onclick=()=>{
    localStorage.clear();
    location.reload();
  };
}

/* ===== DATE ===== */
function initDate(){
  const now=new Date(new Date().toLocaleString('en-US',{timeZone:TZ}));
  selectedDate=now.toISOString().slice(0,10);
  viewYear=now.getFullYear();
  viewMonth=now.getMonth();
  dateInput.value=selectedDate;
  dateInput.onchange=()=>{
    selectedDate=dateInput.value;
    loadBookings().then(renderAll);
  };
}

/* ===== UI ===== */
function bindUI(){
  prevMonth.onclick=()=>changeMonth(-1);
  nextMonth.onclick=()=>changeMonth(1);

  document.querySelectorAll('.tab').forEach(t=>{
    t.onclick=()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      currentStylist=t.dataset.tab;
    };
  });

  bookingForm.onsubmit=submitForm;
}

/* ===== MONTH ===== */
function changeMonth(d){
  viewMonth+=d;
  if(viewMonth<0){viewMonth=11;viewYear--}
  if(viewMonth>11){viewMonth=0;viewYear++}
  renderCalendar();
}

/* ===== DATA ===== */
async function loadBookings(){
  const r=await fetch(`/bookings?date=${selectedDate}`);
  bookings=await r.json();
}

async function loadCalendarMap(){
  const r=await fetch('/calendar-days');
  calendarMap=await r.json();
}

/* ===== RENDER ===== */
function renderAll(){
  renderSummary();
  renderTable();
}

function renderCalendar(){
  calendarDays.innerHTML='';
  calendarTitle.textContent =
    new Date(viewYear,viewMonth)
      .toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  const first=new Date(viewYear,viewMonth,1).getDay();
  const total=new Date(viewYear,viewMonth+1,0).getDate();

  for(let i=0;i<first;i++) calendarDays.appendChild(document.createElement('div'));

  for(let d=1;d<=total;d++){
    const dateStr=`${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count=calendarMap[dateStr]||0;
    const ratio=count/DAILY_CAPACITY;

    const cell=document.createElement('div');
    cell.className='calCell';
    if(dateStr===selectedDate) cell.classList.add('selected');

    const num=document.createElement('div');
    num.className='calNum';
    num.textContent=d;

    if(count){
      if(ratio<=.3) num.classList.add('density-low');
      else if(ratio<=.65) num.classList.add('density-mid');
      else if(ratio<1) num.classList.add('density-high');
      else num.classList.add('density-full');
    }

    cell.onclick=()=>{
      selectedDate=dateStr;
      dateInput.value=dateStr;
      loadBookings().then(renderAll);
    };

    cell.appendChild(num);
    calendarDays.appendChild(cell);
  }
}

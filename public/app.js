const OWNER_PIN = '1234';
const TZ = 'Asia/Bangkok';
const DAILY_CAPACITY = 20;

let currentDate = '';
let viewYear, viewMonth;
let currentStylist = 'Bank';
let bookings = [];
let calendarMap = {};

const $ = id => document.getElementById(id);

init();

function init(){
  initAuth();
  initDate();
  bindUI();
  loadAll();
}

/* ===== LOGIN ===== */
function initAuth(){
  if (localStorage.getItem('adore_login') === '1') {
    $('loginOverlay').classList.add('hidden');
  }

  $('loginBtn').onclick = () => {
    if (!/^\d+$/.test($('pin').value)) {
      $('loginMsg').textContent = 'ใส่ตัวเลขเท่านั้น';
      return;
    }
    if ($('pin').value === OWNER_PIN) {
      localStorage.setItem('adore_login','1');
      $('loginOverlay').classList.add('hidden');
    } else {
      $('loginMsg').textContent = 'PIN ไม่ถูกต้อง';
    }
  };

  $('logoutBtn').onclick = () => {
    localStorage.removeItem('adore_login');
    location.reload();
  };
}

/* ===== DATE ===== */
function initDate(){
  const now = new Date(new Date().toLocaleString('en-US',{timeZone:TZ}));
  currentDate = now.toISOString().slice(0,10);
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  $('date').value = currentDate;
}

/* ===== UI ===== */
function bindUI(){
  document.querySelectorAll('.tab').forEach(t=>{
    t.onclick=()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      currentStylist = t.dataset.tab;
      loadSlots();
    };
  });

  $('bookingForm').onsubmit = submitForm;
}

/* ===== LOAD ===== */
async function loadAll(){
  await Promise.all([loadBookings(), loadCalendarMap()]);
  renderCalendar();
  loadSlots();
  renderTable();
  renderSummary();
}

async function loadBookings(){
  bookings = await (await fetch(`/bookings?date=${currentDate}`)).json();
}

async function loadCalendarMap(){
  calendarMap = await (await fetch('/calendar-days')).json();
}

/* ===== CALENDAR ===== */
function renderCalendar(){
  const el = $('calendarDays');
  el.innerHTML = '';
  $('calendarTitle').textContent =
    new Date(viewYear,viewMonth).toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  const first = new Date(viewYear,viewMonth,1).getDay();
  const total = new Date(viewYear,viewMonth+1,0).getDate();
  for(let i=0;i<first;i++) el.appendChild(document.createElement('div'));

  for(let d=1;d<=total;d++){
    const dateStr=`${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count=calendarMap[dateStr]||0;
    const ratio=count/DAILY_CAPACITY;

    const cell=document.createElement('div');
    cell.className='calCell';

    const num=document.createElement('div');
    num.className='calNum';
    num.textContent=d;

    if(count>0){
      if(ratio<=0.3) num.classList.add('density-low');
      else if(ratio<=0.65) num.classList.add('density-mid');
      else if(ratio<1) num.classList.add('density-high');
      else num.classList.add('density-full');
    }

    if(dateStr===currentDate) cell.classList.add('selected');
    cell.onclick=()=>{currentDate=dateStr;$('date').value=dateStr;loadAll();};

    cell.appendChild(num);
    el.appendChild(cell);
  }
}

/* ===== SLOTS ===== */
async function loadSlots(){
  $('time').innerHTML='<option value="">เลือกเวลา</option>';
  const {slots={}}=await (await fetch(`/slots?date=${currentDate}`)).json();
  Object.entries(slots).forEach(([t,s])=>{
    const o=document.createElement('option');
    o.value=t;o.textContent=t.slice(0,5);
    if(s[currentStylist]){o.disabled=true;o.textContent+=' (เต็ม)';}
    $('time').appendChild(o);
  });
}

/* ===== TABLE ===== */
function renderTable(){
  $('list').innerHTML='';
  bookings.forEach(b=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${b.time.slice(0,5)}</td>
      <td><span class="badge stylist-${b.stylist.toLowerCase()}">${b.stylist}</span></td>
      <td>${b.name}</td>
      <td>${b.service||'-'}</td>
      <td><button class="smallBtn danger">ลบ</button></td>`;
    tr.querySelector('button').onclick=async()=>{
      await fetch(`/bookings/${b.id}`,{method:'DELETE'});
      loadAll();
    };
    $('list').appendChild(tr);
  });
}

function renderSummary(){
  $('countBank').textContent=bookings.filter(b=>b.stylist==='Bank').length;
  $('countSindy').textContent=bookings.filter(b=>b.stylist==='Sindy').length;
  $('countAssist').textContent=bookings.filter(b=>b.stylist==='Assist').length;
  $('countTotal').textContent=bookings.length;
}

async function submitForm(e){
  e.preventDefault();
  const body={
    date:currentDate,
    time:$('time').value,
    stylist:currentStylist,
    name:$('name').value,
    phone:$('phone').value,
    service:$('service').value
  };
  const r=await fetch('/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(r.ok){e.target.reset();loadAll();}
  else alert((await r.json()).error);
}

const API = '';

let bookings = [];
let currentStylist = 'Bank';
let calendarDensity = {};
let currentMonth = new Date();
let currentDate = getTodayTH();

/* =========================
   TIME TH
========================= */
function getTodayTH(){
  return new Date(
    new Date().toLocaleString('en-US',{timeZone:'Asia/Bangkok'})
  ).toISOString().slice(0,10);
}

/* =========================
   LOGIN 기억
========================= */
const OWNER_PIN = '1234';
if(localStorage.getItem('adore_login')==='1'){
  document.getElementById('loginOverlay').classList.add('hidden');
  init();
}
document.getElementById('loginBtn').onclick=()=>{
  if(document.getElementById('pin').value===OWNER_PIN){
    localStorage.setItem('adore_login','1');
    location.reload();
  }
};
document.getElementById('logoutBtn').onclick=()=>{
  localStorage.removeItem('adore_login');
  location.reload();
};

/* =========================
   INIT
========================= */
function init(){
  document.getElementById('date').value=currentDate;
  loadCalendarDensity();
  loadBookings();

  document.getElementById('date').onchange=e=>{
    currentDate=e.target.value;
    loadBookings();
    highlightDate();
  };

  document.querySelectorAll('.tab').forEach(t=>{
    t.onclick=()=>{
      document.querySelector('.tab.active').classList.remove('active');
      t.classList.add('active');
      currentStylist=t.dataset.tab;
      renderTime();
      renderTable();
      updateSummary();
    };
  });

  document.getElementById('prevMonth').onclick=()=>{
    currentMonth.setMonth(currentMonth.getMonth()-1);
    renderCalendar();
  };
  document.getElementById('nextMonth').onclick=()=>{
    currentMonth.setMonth(currentMonth.getMonth()+1);
    renderCalendar();
  };
}

/* =========================
   LOAD
========================= */
async function loadBookings(){
  const r=await fetch(`${API}/bookings?date=${currentDate}`);
  bookings=await r.json();
  renderTime();renderTable();updateSummary();
}
async function loadCalendarDensity(){
  const r=await fetch(`${API}/calendar-days`);
  calendarDensity=await r.json();
  renderCalendar();
}

/* =========================
   CALENDAR
========================= */
function renderCalendar(){
  const days=document.getElementById('calendarDays');
  days.innerHTML='';
  document.getElementById('calendarTitle').textContent=
    currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  const y=currentMonth.getFullYear(),m=currentMonth.getMonth();
  const first=new Date(y,m,1).getDay();
  const total=new Date(y,m+1,0).getDate();

  for(let i=0;i<first;i++)days.appendChild(document.createElement('div'));

  for(let d=1;d<=total;d++){
    const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count=calendarDensity[date]||0;
    const pct=(count/20)*100;

    const cell=document.createElement('div');
    cell.className='calCell';
    if(date===currentDate)cell.classList.add('selected');

    const num=document.createElement('div');
    num.className='calNum';
    if(pct>75)num.classList.add('full');
    else if(pct>50)num.classList.add('high');
    else if(pct>20)num.classList.add('mid');
    else if(pct>0)num.classList.add('low');

    num.textContent=d;
    cell.appendChild(num);
    cell.onclick=()=>{
      currentDate=date;
      document.getElementById('date').value=date;
      loadBookings();
      highlightDate();
    };
    days.appendChild(cell);
  }
}
function highlightDate(){
  document.querySelectorAll('.calCell').forEach(c=>c.classList.remove('selected'));
  [...document.querySelectorAll('.calCell')].find(c=>c.textContent==Number(currentDate.slice(-2)))?.classList.add('selected');
}

/* =========================
   BOOKING
========================= */
function renderTime(){
  const sel=document.getElementById('time');
  sel.innerHTML='';
  for(let h=13;h<=22;h++){
    const t=`${String(h).padStart(2,'0')}:00:00`;
    const o=document.createElement('option');
    o.value=t;o.textContent=t.slice(0,5);
    if(bookings.find(b=>b.time===t&&b.stylist===currentStylist))o.disabled=true;
    sel.appendChild(o);
  }
}
document.getElementById('bookingForm').onsubmit=async e=>{
  e.preventDefault();
  const gender=document.querySelector('[name=gender]:checked')?.value;
  await fetch(`${API}/bookings`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      date:currentDate,
      time:time.value,
      stylist:currentStylist,
      name:name.value,
      phone:phone.value,
      gender,
      service:service.value
    })
  });
  e.target.reset();
  loadCalendarDensity();loadBookings();
};

/* =========================
   TABLE / SUMMARY
========================= */
function renderTable(){
  list.innerHTML='';
  bookings.filter(b=>b.stylist===currentStylist).forEach(b=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${b.time.slice(0,5)}</td><td>${b.stylist}</td><td>${b.gender==='male'?'👨':'👩'}</td><td>${b.name}</td><td>${b.service||''}</td><td>${b.phone||''}</td><td><button class="ghost">ลบ/แก้</button></td>`;
    tr.querySelector('button').onclick=()=>openEditModal(b);
    list.appendChild(tr);
  });
}
function updateSummary(){
  const b=bookings.filter(x=>x.stylist==='Bank').length;
  const s=bookings.filter(x=>x.stylist==='Sindy').length;
  const a=bookings.filter(x=>x.stylist==='Assist').length;
  countBank.textContent=b;
  countSindy.textContent=s;
  countAssist.textContent=a;
  countTotal.textContent=b+s+a;
}

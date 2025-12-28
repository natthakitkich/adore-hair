const DAILY_CAPACITY = 20;

let currentDate = '';
let viewYear, viewMonth;
let currentStylist = 'Bank';
let bookings = [];
let calendarMap = {};

const dateInput = document.getElementById('date');
const calendarDays = document.getElementById('calendarDays');
const calendarTitle = document.getElementById('calendarTitle');
const timeSelect = document.getElementById('time');
const list = document.getElementById('list');

const countBank = document.getElementById('countBank');
const countSindy = document.getElementById('countSindy');
const countAssist = document.getElementById('countAssist');
const countTotal = document.getElementById('countTotal');

init();

function init(){
  const now = new Date();
  currentDate = now.toISOString().slice(0,10);
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  dateInput.value = currentDate;

  dateInput.onchange = () => {
    currentDate = dateInput.value;
    loadAll();
  };

  document.querySelectorAll('.tab').forEach(t=>{
    t.onclick=()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      currentStylist = t.dataset.tab;
      loadSlots();
    };
  });

  document.getElementById('bookingForm').onsubmit = submitForm;
  loadAll();
}

async function loadAll(){
  await Promise.all([loadBookings(), loadCalendarMap()]);
  renderCalendar();
  loadSlots();
  renderTable();
  renderSummary();
}

async function loadBookings(){
  const r = await fetch(`/bookings?date=${currentDate}`);
  bookings = await r.json();
}

async function loadCalendarMap(){
  const r = await fetch('/calendar-days');
  calendarMap = await r.json();
}

function renderCalendar(){
  calendarDays.innerHTML='';
  calendarTitle.textContent =
    new Date(viewYear,viewMonth).toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  const firstDay = new Date(viewYear,viewMonth,1).getDay();
  const totalDays = new Date(viewYear,viewMonth+1,0).getDate();

  for(let i=0;i<firstDay;i++) calendarDays.appendChild(document.createElement('div'));

  for(let d=1;d<=totalDays;d++){
    const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count = calendarMap[dateStr] || 0;
    const ratio = count / DAILY_CAPACITY;

    const cell = document.createElement('div');
    cell.className='calCell';

    const num = document.createElement('div');
    num.className='calNum';
    num.textContent=d;

    if(count>0){
      if(ratio<=0.3) num.classList.add('density-low');
      else if(ratio<=0.6) num.classList.add('density-mid');
      else if(ratio<1) num.classList.add('density-high');
      else num.classList.add('density-full');
    }

    if(dateStr===currentDate) cell.classList.add('selected');

    cell.onclick=()=>{
      currentDate=dateStr;
      dateInput.value=dateStr;
      loadAll();
    };

    cell.appendChild(num);
    calendarDays.appendChild(cell);
  }
}

async function loadSlots(){
  timeSelect.innerHTML='<option value="">เลือกเวลา</option>';
  const r = await fetch(`/slots?date=${currentDate}`);
  const { slots } = await r.json();

  Object.entries(slots).forEach(([time,s])=>{
    const opt=document.createElement('option');
    opt.value=time; opt.textContent=time;
    if(s[currentStylist]) opt.disabled=true;
    timeSelect.appendChild(opt);
  });
}

function renderTable(){
  list.innerHTML='';
  bookings.forEach(b=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${b.time}</td>
      <td>${b.stylist}</td>
      <td>${b.name}</td>
      <td>${b.service||'-'}</td>
      <td><button class="smallBtn danger">ลบ</button></td>`;
    tr.querySelector('button').onclick=async()=>{
      await fetch(`/bookings/${b.id}`,{method:'DELETE'});
      loadAll();
    };
    list.appendChild(tr);
  });
}

function renderSummary(){
  const c=s=>bookings.filter(b=>b.stylist===s).length;
  countBank.textContent=c('Bank');
  countSindy.textContent=c('Sindy');
  countAssist.textContent=c('Assist');
  countTotal.textContent=bookings.length;
}

async function submitForm(e){
  e.preventDefault();
  await fetch('/bookings',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      date:currentDate,
      time:timeSelect.value,
      stylist:currentStylist,
      name:document.getElementById('name').value,
      phone:document.getElementById('phone').value,
      service:document.getElementById('service').value
    })
  });
  e.target.reset();
  loadAll();
}

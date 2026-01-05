const API = '';
const OWNER_PIN = '1234';

let bookings = [];
let calendarMap = {};
let currentDate = getTodayTH();
let currentMonth = new Date(currentDate);
let currentStylist = 'Bank';
let editing = null;

/* =========================
   TIMEZONE TH
========================= */
function getTodayTH(){
  return new Date(
    new Date().toLocaleString('en-US',{timeZone:'Asia/Bangkok'})
  ).toISOString().slice(0,10);
}

/* =========================
   LOGIN
========================= */
if(localStorage.getItem('adore_login')==='1'){
  loginOverlay.classList.add('hidden');
  init();
}

loginBtn.onclick = ()=>{
  if(pin.value===OWNER_PIN){
    localStorage.setItem('adore_login','1');
    loginOverlay.classList.add('hidden');
    init();
  }else{
    loginMsg.textContent='PIN ไม่ถูกต้อง';
  }
};

logoutBtn.onclick = ()=>{
  localStorage.removeItem('adore_login');
  location.reload();
};

/* =========================
   INIT
========================= */
function init(){
  loadCalendarDensity();
  loadBookings();

  document.querySelectorAll('.tab').forEach(t=>{
    t.onclick=()=>{
      document.querySelector('.tab.active').classList.remove('active');
      t.classList.add('active');
      currentStylist=t.dataset.tab;
      renderTimeOptions();
    };
  });

  prevMonth.onclick=()=>{
    currentMonth.setMonth(currentMonth.getMonth()-1);
    renderCalendar();
  };
  nextMonth.onclick=()=>{
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
  renderSummary();
  renderTable();
  renderTimeOptions();
}

async function loadCalendarDensity(){
  const r=await fetch(`${API}/calendar-days`);
  calendarMap=await r.json();
  renderCalendar();
}

/* =========================
   CALENDAR (CORRECT LOGIC)
========================= */
function renderCalendar(){
  calendarDays.innerHTML='';
  calendarTitle.textContent=currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  const y=currentMonth.getFullYear();
  const m=currentMonth.getMonth();
  const first=new Date(y,m,1).getDay();
  const total=new Date(y,m+1,0).getDate();

  for(let i=0;i<first;i++) calendarDays.appendChild(document.createElement('div'));

  for(let d=1;d<=total;d++){
    const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count=calendarMap[date]||0;
    const percent=count/20;

    const cell=document.createElement('div');
    cell.className='calCell';
    if(date===currentDate) cell.classList.add('selected');

    const num=document.createElement('div');
    num.className='calNum';

    if(count>0){
      if(percent<=0.25) num.classList.add('density-low');
      else if(percent<=0.5) num.classList.add('density-mid');
      else if(percent<=0.75) num.classList.add('density-high');
      else num.classList.add('density-full');
    }

    num.textContent=d;
    cell.appendChild(num);
    cell.onclick=()=>{
      currentDate=date;
      loadBookings();
      renderCalendar();
    };
    calendarDays.appendChild(cell);
  }
}

/* =========================
   TIME OPTIONS
========================= */
function renderTimeOptions(){
  time.innerHTML='';
  for(let h=13;h<=22;h++){
    const t=`${String(h).padStart(2,'0')}:00:00`;
    const o=document.createElement('option');
    o.value=t;
    o.textContent=t.slice(0,5);
    if(bookings.find(b=>b.time===t&&b.stylist===currentStylist)) o.disabled=true;
    time.appendChild(o);
  }
}

/* =========================
   ADD BOOKING
========================= */
bookingForm.onsubmit=async e=>{
  e.preventDefault();
  await fetch(`${API}/bookings`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      date:currentDate,
      time:time.value,
      stylist:currentStylist,
      name:name.value,
      phone:phone.value,
      gender:document.querySelector('[name=gender]:checked').value,
      service:service.value
    })
  });
  alert('บันทึกคิวเรียบร้อยแล้ว');
  e.target.reset();
  loadCalendarDensity();
  loadBookings();
};

/* =========================
   SUMMARY
========================= */
function renderSummary(){
  countBank.textContent=bookings.filter(b=>b.stylist==='Bank').length;
  countSindy.textContent=bookings.filter(b=>b.stylist==='Sindy').length;
  countAssist.textContent=bookings.filter(b=>b.stylist==='Assist').length;
  countTotal.textContent=bookings.length;
}

/* =========================
   TABLE
========================= */
function renderTable(){
  list.innerHTML='';
  bookings.forEach(b=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${b.time.slice(0,5)}</td>
      <td><span class="stylist ${b.stylist.toLowerCase()}">${b.stylist}</span></td>
      <td>${b.gender==='male'?'👨':'👩'}</td>
      <td>${b.name}</td>
      <td>${b.service||''}</td>
      <td>${b.phone?`<a href="tel:${b.phone}">${b.phone}</a>`:''}</td>
      <td><button class="ghost">แก้ไข</button></td>
    `;
    tr.querySelector('button').onclick=()=>openEdit(b);
    list.appendChild(tr);
  });
}

/* =========================
   EDIT MODAL
========================= */
function openEdit(b){
  editing=b;
  editStylist.value=b.stylist;
  editDate.value=b.date;
  editName.value=b.name;
  editPhone.value=b.phone||'';
  editService.value=b.service||'';
  document.querySelectorAll('[name=editGender]').forEach(r=>r.checked=r.value===b.gender);
  renderEditTime(b);
  editOverlay.classList.remove('hidden');
}

function renderEditTime(b){
  editTime.innerHTML='';
  for(let h=13;h<=22;h++){
    const t=`${String(h).padStart(2,'0')}:00:00`;
    const o=document.createElement('option');
    o.value=t;
    o.textContent=t.slice(0,5);
    if(bookings.find(x=>x.id!==b.id&&x.date===b.date&&x.stylist===b.stylist&&x.time===t)) o.disabled=true;
    if(t===b.time) o.selected=true;
    editTime.appendChild(o);
  }
}

saveEdit.onclick=async()=>{
  await fetch(`${API}/bookings/${editing.id}`,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      name:editName.value,
      phone:editPhone.value,
      gender:document.querySelector('[name=editGender]:checked').value,
      service:editService.value,
      date:editDate.value,
      time:editTime.value
    })
  });
  alert('แก้ไขคิวเรียบร้อยแล้ว');
  closeEdit();
  loadCalendarDensity();
  loadBookings();
};

closeEdit.onclick=closeEdit;
function closeEdit(){
  editOverlay.classList.add('hidden');
  editing=null;
}

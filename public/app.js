document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const API = '';

  const $ = id => document.getElementById(id);

  let currentMonth = new Date();
  let selectedDate = null;
  let bookings = [];
  let closedDays = new Set();
  let calendarDensity = {};
  let activeStylist = 'Bank';

  const stylists = ['Bank','Sindy','Assist'];

  /* ===== LOGIN ===== */
  if (localStorage.getItem(AUTH_KEY)==='true') boot();
  else $('loginOverlay').style.display='flex';

  $('loginBtn').onclick = () => {
    if ($('pinInput').value !== OWNER_PIN) {
      $('loginMsg').textContent = 'PIN ไม่ถูกต้อง';
      return;
    }
    localStorage.setItem(AUTH_KEY,'true');
    $('loginOverlay').style.display='none';
    boot();
  };

  $('logoutBtn').onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ===== BOOT ===== */
  async function boot(){
    $('topDate').textContent =
      new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});

    await loadClosedDays();
    await loadCalendarDensity();
    renderCalendar();
    renderStylistTabs();
  }

  /* ===== LOAD DATA ===== */
  async function loadClosedDays(){
    const res = await fetch(`${API}/closed-days`);
    closedDays = new Set(await res.json());
  }

  async function loadCalendarDensity(){
    const res = await fetch(`${API}/calendar-days`);
    calendarDensity = await res.json();
  }

  /* ===== CALENDAR ===== */
  function renderCalendar(){
    const grid = $('calendarGrid');
    grid.innerHTML='';

    $('calendarTitle').textContent =
      currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

    const y=currentMonth.getFullYear(), m=currentMonth.getMonth();
    const first=new Date(y,m,1).getDay();
    const days=new Date(y,m+1,0).getDate();

    for(let i=0;i<first;i++) grid.appendChild(document.createElement('div'));

    for(let d=1;d<=days;d++){
      const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell=document.createElement('div');
      cell.className='calCell';

      const inner=document.createElement('div');
      inner.className='calCellInner';

      const num=document.createElement('div');
      num.className='calNum';
      num.textContent=d;

      const count=calendarDensity[date]||0;
      if(count<=5 && count>0) num.classList.add('density-low');
      else if(count<=10) num.classList.add('density-mid');
      else if(count<=15) num.classList.add('density-high');
      else if(count>=16) num.classList.add('density-full');

      if(closedDays.has(date)) cell.classList.add('closed');

      inner.appendChild(num);
      cell.appendChild(inner);
      cell.onclick=()=>selectDate(date);
      grid.appendChild(cell);
    }
  }

  $('prevMonth').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()-1);renderCalendar();};
  $('nextMonth').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()+1);renderCalendar();};

  /* ===== DATE SELECT ===== */
  async function selectDate(date){
    selectedDate=date;
    const isClosed=closedDays.has(date);

    $('dayStatus').textContent=isClosed?'วันนี้เป็นวันหยุด':`วันที่ ${date} เปิดทำการ`;
    $('closeDayBtn').classList.toggle('hidden',isClosed);
    $('openDayBtn').classList.toggle('hidden',!isClosed);

    if(isClosed){
      $('queueBody').innerHTML='';
      $('summary').innerHTML='';
      return;
    }

    await loadBookings();
  }

  /* ===== BOOKINGS ===== */
  async function loadBookings(){
    const res=await fetch(`${API}/bookings?date=${selectedDate}`);
    bookings=await res.json();
    renderQueue();
    renderSummary();
  }

  function renderQueue(){
    $('queueBody').innerHTML='';
    bookings
      .filter(b=>b.stylist===activeStylist)
      .sort((a,b)=>a.time.localeCompare(b.time))
      .forEach(b=>{
        const tr=document.createElement('tr');
        tr.innerHTML=`
          <td>${b.time.slice(0,5)}</td>
          <td>${b.stylist}</td>
          <td>${b.gender==='male'?'👨':'👩'}</td>
          <td>${b.name}</td>
          <td>${b.service||''}</td>
          <td>${b.phone||''}</td>
          <td><button class="ghost">ลบ</button></td>
        `;
        tr.querySelector('button').onclick=()=>deleteBooking(b.id);
        $('queueBody').appendChild(tr);
      });
  }

  async function deleteBooking(id){
    if(!confirm('ยืนยันลบคิวนี้?')) return;
    await fetch(`${API}/bookings/${id}`,{method:'DELETE'});
    await loadBookings();
    await loadCalendarDensity();
    renderCalendar();
  }

  /* ===== STYLIST ===== */
  function renderStylistTabs(){
    $('stylistTabs').innerHTML='';
    stylists.forEach(s=>{
      const t=document.createElement('div');
      t.className='tab'+(s===activeStylist?' active':'');
      t.textContent=s;
      t.onclick=()=>{activeStylist=s;renderStylistTabs();renderQueue();};
      $('stylistTabs').appendChild(t);
    });
  }

  /* ===== SUMMARY ===== */
  function renderSummary(){
    const c=s=>bookings.filter(b=>b.stylist===s).length;
    $('summary').innerHTML=`
      <div class="panel">Bank<br><b>${c('Bank')}</b></div>
      <div class="panel">Sindy<br><b>${c('Sindy')}</b></div>
      <div class="panel">Assist<br><b>${c('Assist')}</b></div>
      <div class="panel">รวม<br><b>${bookings.length}</b></div>
    `;
  }

});

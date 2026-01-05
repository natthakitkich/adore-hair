document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const API = '';

  /* ===== ELEMENTS ===== */
  const loginOverlay = document.getElementById('loginOverlay');
  const pinInput = document.getElementById('pinInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const calendarTitle = document.getElementById('calendarTitle');
  const calendarGrid = document.getElementById('calendarGrid');
  const dayStatus = document.getElementById('dayStatus');
  const closeDayBtn = document.getElementById('closeDayBtn');
  const openDayBtn = document.getElementById('openDayBtn');

  const stylistTabs = document.getElementById('stylistTabs');
  const summary = document.getElementById('summary');
  const queueBody = document.getElementById('queueBody');

  /* ===== STATE ===== */
  let currentMonth = new Date();
  let selectedDate = null;
  let closedDays = new Set();
  let bookings = [];
  let activeStylist = 'Bank';

  const stylists = ['Bank','Sindy','Assist'];

  /* ===== AUTH ===== */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    loginOverlay.classList.add('hidden');
    boot();
  }

  loginBtn.onclick = () => {
    if (pinInput.value === OWNER_PIN) {
      localStorage.setItem(AUTH_KEY,'true');
      loginOverlay.classList.add('hidden');
      boot();
    } else {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    }
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ===== BOOT ===== */
  async function boot(){
    await loadClosedDays();
    renderCalendar();
    renderStylistTabs();
    renderSummary();
  }

  /* ===== CLOSED DAYS ===== */
  async function loadClosedDays(){
    const res = await fetch(`${API}/closed-days`);
    const data = await res.json();
    closedDays = new Set(data);
  }

  async function setClosed(date){
    await fetch(`${API}/closed-days`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({date,action:'close'})
    });
    await loadClosedDays();
    selectDate(date);
  }

  async function setOpen(date){
    await fetch(`${API}/closed-days`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({date,action:'open'})
    });
    await loadClosedDays();
    selectDate(date);
  }

  /* ===== CALENDAR ===== */
  document.getElementById('prevMonth').onclick=()=>{
    currentMonth.setMonth(currentMonth.getMonth()-1);
    renderCalendar();
  };
  document.getElementById('nextMonth').onclick=()=>{
    currentMonth.setMonth(currentMonth.getMonth()+1);
    renderCalendar();
  };

  function renderCalendar(){
    calendarGrid.innerHTML='';
    calendarTitle.textContent=currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

    const y=currentMonth.getFullYear();
    const m=currentMonth.getMonth();
    const first=new Date(y,m,1).getDay();
    const days=new Date(y,m+1,0).getDate();

    for(let i=0;i<first;i++) calendarGrid.appendChild(document.createElement('div'));

    for(let d=1;d<=days;d++){
      const key=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell=document.createElement('div');
      cell.className='calCell';

      const num=document.createElement('div');
      num.className='calNum';
      num.textContent=d;

      if(closedDays.has(key)){
        cell.classList.add('closed');
        num.classList.add('closed');
      }

      cell.onclick=()=>selectDate(key);
      cell.appendChild(num);
      calendarGrid.appendChild(cell);
    }
  }

  async function selectDate(key){
    selectedDate=key;
    const isClosed=closedDays.has(key);

    dayStatus.textContent=isClosed?'วันนี้เป็นวันหยุด':'วันนี้เปิดทำการ';
    closeDayBtn.classList.toggle('hidden',isClosed);
    openDayBtn.classList.toggle('hidden',!isClosed);

    closeDayBtn.onclick=()=>setClosed(key);
    openDayBtn.onclick=()=>setOpen(key);

    if(isClosed){
      lockUI();
    }else{
      unlockUI();
      await loadBookings();
      renderSummary();
      renderQueue();
    }
  }

  /* ===== BOOKINGS ===== */
  async function loadBookings(){
    const res=await fetch(`${API}/bookings?date=${selectedDate}`);
    bookings=await res.json();
  }

  /* ===== UI LOCK ===== */
  function lockUI(){
    stylistTabs.classList.add('locked');
    summary.innerHTML='<div class="muted center">ร้านปิดทำการ</div>';
    queueBody.innerHTML='';
  }

  function unlockUI(){
    stylistTabs.classList.remove('locked');
  }

  /* ===== STYLIST ===== */
  function renderStylistTabs(){
    stylistTabs.innerHTML='';
    stylists.forEach(s=>{
      const t=document.createElement('div');
      t.className='tab'+(s===activeStylist?' active':'');
      t.textContent=s;
      t.onclick=()=>{
        if(!closedDays.has(selectedDate)){
          activeStylist=s;
          renderStylistTabs();
          renderQueue();
        }
      };
      stylistTabs.appendChild(t);
    });
  }

  /* ===== SUMMARY ===== */
  function renderSummary(){
    const c=n=>bookings.filter(b=>b.stylist===n).length;
    summary.innerHTML=`
      <div class="panel">Bank<br><b>${c('Bank')}</b></div>
      <div class="panel">Sindy<br><b>${c('Sindy')}</b></div>
      <div class="panel">Assist<br><b>${c('Assist')}</b></div>
      <div class="panel">รวม<br><b>${bookings.length}</b></div>
    `;
  }

  /* ===== QUEUE ===== */
  function renderQueue(){
    queueBody.innerHTML='';
    bookings.filter(b=>b.stylist===activeStylist)
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
        `;
        queueBody.appendChild(tr);
      });
  }

});

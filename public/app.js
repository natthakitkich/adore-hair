document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  const loginOverlay = document.getElementById('loginOverlay');
  const appRoot = document.getElementById('appRoot');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pinInput');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const calendarGrid = document.getElementById('calendarGrid');
  const calendarTitle = document.getElementById('calendarTitle');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const dayStatus = document.getElementById('dayStatus');

  const stylistTabsEl = document.getElementById('stylistTabs');
  const summaryEl = document.getElementById('summary');
  const queueBody = document.getElementById('queueBody');

  let currentMonth = new Date();
  let selectedDate = null;
  let bookings = [];
  const stylists = ['Bank','Sindy','Assist'];

  /* ================= AUTH ================= */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    enterApp();
  } else {
    loginOverlay.classList.remove('hidden');
  }

  loginBtn.onclick = () => {
    if (pinInput.value !== OWNER_PIN) {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }
    localStorage.setItem(AUTH_KEY,'true');
    enterApp();
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  function enterApp(){
    loginOverlay.classList.add('hidden');
    appRoot.classList.remove('hidden');
    initCalendar();
    renderStylistTabs();
    renderTopDate();
  }

  function renderTopDate(){
    document.getElementById('topDate').textContent =
      new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});
  }

  /* ================= CALENDAR ================= */
  function initCalendar(){
    renderCalendar();
    prevMonthBtn.onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()-1);renderCalendar();}
    nextMonthBtn.onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()+1);renderCalendar();}
  }

  async function renderCalendar(){
    calendarGrid.innerHTML='';
    calendarTitle.textContent=currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});
    const y=currentMonth.getFullYear(),m=currentMonth.getMonth();
    const first=new Date(y,m,1).getDay();
    const days=new Date(y,m+1,0).getDate();

    for(let i=0;i<first;i++)calendarGrid.appendChild(document.createElement('div'));

    for(let d=1;d<=days;d++){
      const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell=document.createElement('div');
      cell.className='calCell';
      cell.innerHTML=`<div class="calNum">${d}</div>`;
      cell.onclick=()=>selectDate(date);
      calendarGrid.appendChild(cell);
    }
  }

  async function selectDate(date){
    selectedDate=date;
    dayStatus.textContent='วันที่เลือก: '+date;
    const res=await fetch(`/bookings?date=${date}`);
    bookings=await res.json();
    renderQueue();
    renderSummary();
  }

  /* ================= UI ================= */
  function renderStylistTabs(){
    stylistTabsEl.innerHTML='';
    stylists.forEach(s=>{
      const t=document.createElement('div');
      t.className='tab';
      t.textContent=s;
      stylistTabsEl.appendChild(t);
    });
  }

  function renderQueue(){
    queueBody.innerHTML='';
    bookings.forEach(b=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${b.time.slice(0,5)}</td>
        <td>${b.stylist}</td>
        <td>${b.gender==='male'?'👨':'👩'}</td>
        <td>${b.name}</td>
        <td>${b.service||''}</td>
        <td>${b.phone||''}</td>
        <td></td>`;
      queueBody.appendChild(tr);
    });
  }

  function renderSummary(){
    const c=s=>bookings.filter(b=>b.stylist===s).length;
    summaryEl.innerHTML=`
      <div class="panel">Bank<br><b>${c('Bank')}</b></div>
      <div class="panel">Sindy<br><b>${c('Sindy')}</b></div>
      <div class="panel">Assist<br><b>${c('Assist')}</b></div>
      <div class="panel">รวม<br><b>${bookings.length}</b></div>`;
  }

});

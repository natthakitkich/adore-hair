document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const API = '';

  const el = id => document.getElementById(id);

  let currentMonth = new Date();
  let selectedDate = null;
  let bookings = [];
  let closedDays = new Set();
  let activeStylist = 'Bank';

  const stylists = ['Bank','Sindy','Assist'];
  const START = 13, END = 22;

  /* ===== LOGIN ===== */
  if (localStorage.getItem(AUTH_KEY)==='true') boot();
  else el('loginOverlay').style.display='flex';

  el('loginBtn').onclick = () => {
    if (el('pinInput').value !== OWNER_PIN) {
      el('loginMsg').textContent = 'PIN ไม่ถูกต้อง';
      return;
    }
    localStorage.setItem(AUTH_KEY,'true');
    el('loginOverlay').style.display='none';
    boot();
  };

  el('logoutBtn').onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ===== BOOT ===== */
  async function boot(){
    el('topDate').textContent =
      new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});

    await loadClosedDays();
    renderCalendar();
    renderStylistTabs();
  }

  /* ===== CLOSED DAYS (SERVER) ===== */
  async function loadClosedDays(){
    const res = await fetch(`${API}/closed-days`);
    const list = await res.json();
    closedDays = new Set(list);
  }

  async function setClosed(date, close){
    await fetch(`${API}/closed-days`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        date,
        action: close ? 'close' : 'open'
      })
    });
    await loadClosedDays();
    renderCalendar();
    selectDate(date);
  }

  /* ===== CALENDAR ===== */
  function renderCalendar(){
    el('calendarGrid').innerHTML='';
    el('calendarTitle').textContent =
      currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

    const y=currentMonth.getFullYear(), m=currentMonth.getMonth();
    const first=new Date(y,m,1).getDay();
    const days=new Date(y,m+1,0).getDate();

    for(let i=0;i<first;i++)
      el('calendarGrid').appendChild(document.createElement('div'));

    for(let d=1;d<=days;d++){
      const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell=document.createElement('div');
      cell.className='calCell';

      const inner=document.createElement('div');
      inner.className='calCellInner';

      const num=document.createElement('div');
      num.className='calNum';
      num.textContent=d;

      if(closedDays.has(date)){
        cell.classList.add('closed');
      }

      inner.appendChild(num);
      cell.appendChild(inner);
      cell.onclick=()=>selectDate(date);

      el('calendarGrid').appendChild(cell);
    }
  }

  el('prevMonth').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()-1);renderCalendar();};
  el('nextMonth').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()+1);renderCalendar();};

  /* ===== DATE SELECT ===== */
  async function selectDate(date){
    selectedDate = date;
    const isClosed = closedDays.has(date);

    el('dayStatus').textContent =
      isClosed ? 'วันนี้เป็นวันหยุด' : `วันที่ ${date} เปิดทำการ`;

    el('closeDayBtn').classList.toggle('hidden', isClosed);
    el('openDayBtn').classList.toggle('hidden', !isClosed);

    el('closeDayBtn').onclick = () => setClosed(date,true);
    el('openDayBtn').onclick  = () => setClosed(date,false);

    if(isClosed){
      el('queueBody').innerHTML='';
      el('summary').innerHTML='';
      return;
    }

    await loadBookings();
  }

  /* ===== BOOKINGS ===== */
  async function loadBookings(){
    const res = await fetch(`${API}/bookings?date=${selectedDate}`);
    bookings = await res.json();
    renderQueue();
    renderSummary();
  }

  function renderQueue(){
    el('queueBody').innerHTML='';
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
          <td></td>
        `;
        el('queueBody').appendChild(tr);
      });
  }

  function renderStylistTabs(){
    el('stylistTabs').innerHTML='';
    stylists.forEach(s=>{
      const t=document.createElement('div');
      t.className='tab'+(s===activeStylist?' active':'');
      t.textContent=s;
      t.onclick=()=>{activeStylist=s;renderStylistTabs();renderQueue();};
      el('stylistTabs').appendChild(t);
    });
  }

  function renderSummary(){
    const c=s=>bookings.filter(b=>b.stylist===s).length;
    el('summary').innerHTML=`
      <div class="panel">Bank<br><b>${c('Bank')}</b></div>
      <div class="panel">Sindy<br><b>${c('Sindy')}</b></div>
      <div class="panel">Assist<br><b>${c('Assist')}</b></div>
      <div class="panel">รวม<br><b>${bookings.length}</b></div>
    `;
  }

});

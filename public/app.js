document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const API = '';

  const STYLISTS = ['Bank','Sindy','Assist'];
  const START = 13;
  const END = 22;

  const el = id => document.getElementById(id);

  let currentMonth = new Date();
  let selectedDate = null;
  let bookings = [];
  let activeStylist = 'Bank';

  /* ========= AUTH ========= */
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

  /* ========= BOOT ========= */
  function boot(){
    el('topDate').textContent = new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});
    renderCalendar();
    renderStylistTabs();
  }

  /* ========= CALENDAR ========= */
  function renderCalendar(){
    el('calendarGrid').innerHTML='';
    el('calendarTitle').textContent = currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

    const y=currentMonth.getFullYear(), m=currentMonth.getMonth();
    const first=new Date(y,m,1).getDay();
    const days=new Date(y,m+1,0).getDate();

    for(let i=0;i<first;i++) el('calendarGrid').appendChild(document.createElement('div'));

    for(let d=1;d<=days;d++){
      const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell=document.createElement('div');
      cell.className='calCell';
      const inner=document.createElement('div');
      inner.className='calCellInner';
      const num=document.createElement('div');
      num.className='calNum';
      num.textContent=d;
      inner.appendChild(num);
      cell.appendChild(inner);
      cell.onclick=()=>selectDate(date,cell);
      el('calendarGrid').appendChild(cell);
    }
  }

  el('prevMonth').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()-1);renderCalendar();};
  el('nextMonth').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()+1);renderCalendar();};

  /* ========= DATE ========= */
  async function selectDate(date,cell){
    selectedDate=date;
    document.querySelectorAll('.calCell').forEach(c=>c.classList.remove('selected'));
    cell.classList.add('selected');
    el('dayStatus').textContent=`วันที่ ${date}`;
    el('addBookingPanel').classList.remove('hidden');
    renderAddTimes();
    await loadBookings();
  }

  /* ========= ADD BOOKING ========= */
  function renderAddTimes(){
    const sel=el('addTime');
    sel.innerHTML='';
    for(let h=START;h<=END;h++){
      const t=`${String(h).padStart(2,'0')}:00:00`;
      const opt=document.createElement('option');
      opt.value=t; opt.textContent=t.slice(0,5);
      sel.appendChild(opt);
    }
  }

  el('addBookingBtn').onclick=async()=>{
    const gender=document.querySelector('[name=addGender]:checked')?.value;
    if(!gender){alert('เลือกเพศ');return;}

    const res=await fetch(`${API}/bookings`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        date:selectedDate,
        time:el('addTime').value,
        stylist:el('addStylist').value,
        name:el('addName').value,
        phone:el('addPhone').value,
        gender,
        service:el('addService').value
      })
    });

    if(!res.ok){
      alert('คิวนี้ถูกจองแล้ว');
      return;
    }

    el('addName').value='';
    el('addPhone').value='';
    el('addService').value='';
    document.querySelectorAll('[name=addGender]').forEach(r=>r.checked=false);

    await loadBookings();
    alert('เพิ่มคิวสำเร็จ');
  };

  /* ========= BOOKINGS ========= */
  async function loadBookings(){
    const res=await fetch(`${API}/bookings?date=${selectedDate}`);
    bookings=await res.json();
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
        `;
        el('queueBody').appendChild(tr);
      });
  }

  /* ========= STYLIST ========= */
  function renderStylistTabs(){
    el('stylistTabs').innerHTML='';
    STYLISTS.forEach(s=>{
      const t=document.createElement('div');
      t.className='tab'+(s===activeStylist?' active':'');
      t.textContent=s;
      t.onclick=()=>{activeStylist=s;renderStylistTabs();renderQueue();};
      el('stylistTabs').appendChild(t);
    });
  }

  /* ========= SUMMARY ========= */
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

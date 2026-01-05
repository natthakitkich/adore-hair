document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pin');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  /* ===== AUTH INIT ===== */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    loginOverlay.style.display = 'none';
    boot();
  }

  loginBtn.addEventListener('click', () => {
    const pin = pinInput.value.trim();
    if (pin !== OWNER_PIN) {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }
    localStorage.setItem(AUTH_KEY, 'true');
    loginOverlay.style.display = 'none';
    boot();
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  });

  function boot(){
    renderTopDate();
    initCalendar();
    renderTabs();
    renderSummary();
  }

  function renderTopDate(){
    document.getElementById('topDate').textContent =
      new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  }

  /* ===== CALENDAR ===== */
  let currentMonth = new Date();

  function initCalendar(){
    renderCalendar();
    document.getElementById('prevMonth').addEventListener('click',()=>{
      currentMonth.setMonth(currentMonth.getMonth()-1);
      renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click',()=>{
      currentMonth.setMonth(currentMonth.getMonth()+1);
      renderCalendar();
    });
  }

  function renderCalendar(){
    const grid=document.getElementById('calendarGrid');
    const title=document.getElementById('calendarTitle');
    grid.innerHTML='';

    title.textContent=currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

    const y=currentMonth.getFullYear();
    const m=currentMonth.getMonth();
    const first=new Date(y,m,1).getDay();
    const days=new Date(y,m+1,0).getDate();

    for(let i=0;i<first;i++) grid.appendChild(document.createElement('div'));
    for(let d=1;d<=days;d++){
      const c=document.createElement('div');
      c.className='calCell';
      c.textContent=d;
      grid.appendChild(c);
    }
  }

  /* ===== TABS ===== */
  const stylists=['Bank','Sindy','Assist'];
  let active='Bank';

  function renderTabs(){
    const wrap=document.getElementById('stylistTabs');
    wrap.innerHTML='';
    stylists.forEach(s=>{
      const t=document.createElement('div');
      t.className='tab'+(s===active?' active':'');
      t.textContent=s;
      t.addEventListener('click',()=>{
        active=s;
        renderTabs();
      });
      wrap.appendChild(t);
    });
  }

  function renderSummary(){
    document.getElementById('summary').innerHTML=`
      <div class="panel">Bank<br><b>0</b></div>
      <div class="panel">Sindy<br><b>0</b></div>
      <div class="panel">Assist<br><b>0</b></div>
      <div class="panel">รวม<br><b>0</b></div>
    `;
  }

});

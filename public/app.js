document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pin');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  /* ===== AUTH ===== */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    hideLogin();
    boot();
  } else {
    showLogin();
  }

  loginBtn.onclick = () => {
    if (pinInput.value !== OWNER_PIN) {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }
    localStorage.setItem(AUTH_KEY, 'true');
    hideLogin();
    boot();
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  function showLogin(){ loginOverlay.classList.remove('hidden'); }
  function hideLogin(){ loginOverlay.classList.add('hidden'); }

  /* ===== BOOT ===== */
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
    document.getElementById('prevMonth').onclick=()=>{
      currentMonth.setMonth(currentMonth.getMonth()-1);
      renderCalendar();
    };
    document.getElementById('nextMonth').onclick=()=>{
      currentMonth.setMonth(currentMonth.getMonth()+1);
      renderCalendar();
    };
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
      t.onclick=()=>{active=s;renderTabs();};
      wrap.appendChild(t);
    });
  }

  /* ===== SUMMARY ===== */
  function renderSummary(){
    document.getElementById('summary').innerHTML=`
      <div class="panel">Bank<br><b>0</b></div>
      <div class="panel">Sindy<br><b>0</b></div>
      <div class="panel">Assist<br><b>0</b></div>
      <div class="panel">รวม<br><b>0</b></div>
    `;
  }

});

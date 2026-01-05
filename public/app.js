document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_auth';

  const loginOverlay = document.getElementById('loginOverlay');
  const pinInput = document.getElementById('pinInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const calendarGrid = document.getElementById('calendarGrid');
  const calendarTitle = document.getElementById('calendarTitle');
  const dayHint = document.getElementById('dayHint');
  const stylistTabs = document.getElementById('stylistTabs');
  const summary = document.getElementById('summary');
  const topDate = document.getElementById('topDate');

  let currentMonth = new Date();
  let selectedDate = null;
  let activeStylist = 'Bank';

  /* ===== AUTH ===== */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    loginOverlay.classList.add('hidden');
    boot();
  }

  loginBtn.onclick = () => {
    if (pinInput.value === OWNER_PIN) {
      localStorage.setItem(AUTH_KEY, 'true');
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
  function boot(){
    renderTopDate();
    renderCalendar();
    renderTabs();
    renderSummary();
  }

  function renderTopDate(){
    topDate.textContent = new Date().toLocaleDateString('en-US',{
      month:'short',day:'numeric',year:'numeric'
    });
  }

  /* ===== CALENDAR ===== */
  document.getElementById('prevMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth()-1);
    renderCalendar();
  };
  document.getElementById('nextMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth()+1);
    renderCalendar();
  };

  function renderCalendar(){
    calendarGrid.innerHTML = '';
    calendarTitle.textContent =
      currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y,m,1).getDay();
    const days = new Date(y,m+1,0).getDate();

    for(let i=0;i<first;i++){
      calendarGrid.appendChild(document.createElement('div'));
    }

    for(let d=1;d<=days;d++){
      const cell = document.createElement('div');
      cell.className = 'calCell';
      cell.textContent = d;

      cell.onclick = () => {
        selectedDate = `${y}-${m+1}-${d}`;
        dayHint.textContent = `เลือกวันที่ ${d}`;
      };

      calendarGrid.appendChild(cell);
    }
  }

  /* ===== TABS ===== */
  function renderTabs(){
    stylistTabs.innerHTML='';
    ['Bank','Sindy','Assist'].forEach(name=>{
      const t=document.createElement('div');
      t.className='tab'+(name===activeStylist?' active':'');
      t.textContent=name;
      t.onclick=()=>{activeStylist=name;renderTabs();};
      stylistTabs.appendChild(t);
    });
  }

  /* ===== SUMMARY ===== */
  function renderSummary(){
    summary.innerHTML=`
      <div class="panel">Bank<br><b>0</b></div>
      <div class="panel">Sindy<br><b>0</b></div>
      <div class="panel">Assist<br><b>0</b></div>
      <div class="panel">รวม<br><b>0</b></div>
    `;
  }

});

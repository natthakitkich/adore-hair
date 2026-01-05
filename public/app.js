document.addEventListener('DOMContentLoaded', () => {

  /* =========================
     CONFIG
  ========================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const CLOSED_KEY = 'adore_closed_days';

  /* =========================
     ELEMENTS
  ========================= */
  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pin');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const dayStatus = document.getElementById('dayStatus');
  const toggleClosedBtn = document.getElementById('toggleClosedBtn');

  /* =========================
     STATE
  ========================= */
  let selectedDate = null;
  let closedDays = new Set(JSON.parse(localStorage.getItem(CLOSED_KEY) || '[]'));

  /* =========================
     AUTH CHECK
  ========================= */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    hideLogin();
    bootApp();
  } else {
    showLogin();
  }

  /* =========================
     LOGIN
  ========================= */
  loginBtn.onclick = () => {
    const pin = pinInput.value.trim();
    if (pin !== OWNER_PIN) {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }
    localStorage.setItem(AUTH_KEY, 'true');
    pinInput.value = '';
    loginMsg.textContent = '';
    hideLogin();
    bootApp();
  };

  pinInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') loginBtn.click();
  });

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  function showLogin(){ loginOverlay.classList.remove('hidden'); }
  function hideLogin(){ loginOverlay.classList.add('hidden'); }

  /* =========================
     BOOT
  ========================= */
  function bootApp(){
    renderTopDate();
    initCalendar();
    renderStylistTabs();
    renderSummary();
    lockQueueUI(); // default = lock until date selected
  }

  /* =========================
     TOP DATE
  ========================= */
  function renderTopDate(){
    const el = document.getElementById('topDate');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('en-US',{
      month:'short',day:'numeric',year:'numeric'
    });
  }

  /* =========================
     CALENDAR
  ========================= */
  let currentMonth = new Date();

  function initCalendar(){
    renderCalendar();
    document.getElementById('prevMonth').onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth()-1);
      renderCalendar();
    };
    document.getElementById('nextMonth').onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth()+1);
      renderCalendar();
    };
  }

  function renderCalendar(){
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calendarTitle');
    grid.innerHTML = '';

    title.textContent = currentMonth.toLocaleDateString('th-TH',{
      month:'long',year:'numeric'
    });

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(y,m,1).getDay();
    const daysInMonth = new Date(y,m+1,0).getDate();

    for(let i=0;i<firstDay;i++) grid.appendChild(document.createElement('div'));

    for(let d=1;d<=daysInMonth;d++){
      const key = `${y}-${m+1}-${d}`;
      const cell = document.createElement('div');
      cell.className = 'calCell';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      // ===== density demo (Bank + Sindy max 20)
      const bank = Math.floor(Math.random()*11);
      const sindy = Math.floor(Math.random()*11);
      const total = bank + sindy;

      if(total<=5) num.classList.add('density-low');
      else if(total<=10) num.classList.add('density-mid');
      else if(total<=15) num.classList.add('density-high');
      else num.classList.add('density-full');

      if(closedDays.has(key)){
        cell.classList.add('closed');
        num.classList.add('closed');
      }

      cell.onclick = () => selectDate(key);
      cell.appendChild(num);
      grid.appendChild(cell);
    }
  }

  /* =========================
     DAY CONTROL
  ========================= */
  function selectDate(key){
    selectedDate = key;
    const closed = isClosedDay(key);

    dayStatus.textContent = closed
      ? 'วันนี้เป็นวันหยุด ไม่สามารถจัดการคิวได้'
      : 'วันนี้เปิดทำการตามปกติ';

    toggleClosedBtn.textContent = closed
      ? 'ยกเลิกวันหยุด'
      : 'ตั้งเป็นวันหยุด';

    toggleClosedBtn.classList.remove('hidden');
    toggleClosedBtn.onclick = () => toggleClosed(key);

    closed ? lockQueueUI() : unlockQueueUI();
  }

  function toggleClosed(key){
    if(closedDays.has(key)){
      closedDays.delete(key);
    }else{
      closedDays.add(key);
    }
    localStorage.setItem(CLOSED_KEY, JSON.stringify([...closedDays]));
    renderCalendar();
    selectDate(key);
  }

  function isClosedDay(key){
    return closedDays.has(key);
  }

  /* =========================
     QUEUE LOCK / UNLOCK
  ========================= */
  function lockQueueUI(){
    document.getElementById('stylistTabs')?.classList.add('hidden');
    document.getElementById('summary')?.classList.add('hidden');
  }

  function unlockQueueUI(){
    document.getElementById('stylistTabs')?.classList.remove('hidden');
    document.getElementById('summary')?.classList.remove('hidden');
  }

  /* =========================
     STYLIST TABS
  ========================= */
  const stylists = ['Bank','Sindy','Assist'];
  let activeStylist = 'Bank';

  function renderStylistTabs(){
    const wrap = document.getElementById('stylistTabs');
    if(!wrap) return;
    wrap.innerHTML = '';
    stylists.forEach(name=>{
      const tab = document.createElement('div');
      tab.className = 'tab' + (name===activeStylist?' active':'');
      tab.textContent = name;
      tab.onclick = () => {
        if(isClosedDay(selectedDate)) return;
        activeStylist = name;
        renderStylistTabs();
      };
      wrap.appendChild(tab);
    });
  }

  /* =========================
     SUMMARY
  ========================= */
  function renderSummary(){
    const el = document.getElementById('summary');
    if(!el) return;
    el.innerHTML = `
      <div class="panel">Bank<br><b>0</b></div>
      <div class="panel">Sindy<br><b>0</b></div>
      <div class="panel">Assist<br><b>0</b></div>
      <div class="panel">รวม<br><b>0</b></div>
    `;
  }

});

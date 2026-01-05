document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const CLOSED_KEY = 'adore_closed_days';

  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pin');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const closedOverlay = document.getElementById('closedOverlay');
  const closeClosedOverlay = document.getElementById('closeClosedOverlay');

  const stylistTabsEl = document.getElementById('stylistTabs');
  const summaryEl = document.getElementById('summary');

  const dayStatus = document.getElementById('dayStatus');
  const toggleClosedBtn = document.getElementById('toggleClosedBtn');

  let selectedDate = null;
  let closedDays = new Set(JSON.parse(localStorage.getItem(CLOSED_KEY) || '[]'));
  let calendarDensity = {}; // ✅ NEW

  /* ===== AUTH ===== */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    hideLogin();
    bootApp();
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
    bootApp();
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  function showLogin(){ loginOverlay.classList.remove('hidden'); }
  function hideLogin(){ loginOverlay.classList.add('hidden'); }

  /* ===== BOOT ===== */
  async function bootApp(){
    renderTopDate();
    await loadCalendarDensity();   // ✅ สำคัญ
    initCalendar();
    renderStylistTabs();
    renderSummary();

    dayStatus.textContent = 'ยังไม่ได้เลือกวัน';
    toggleClosedBtn.classList.add('hidden');
    unlockQueueUI();
  }

  function renderTopDate(){
    document.getElementById('topDate').textContent =
      new Date().toLocaleDateString('en-US',{
        month:'short',day:'numeric',year:'numeric'
      });
  }

  /* ===== LOAD DENSITY ===== */
  async function loadCalendarDensity(){
    try{
      const res = await fetch('/calendar-days');
      calendarDensity = await res.json();
    }catch(err){
      console.error('โหลด density ไม่สำเร็จ', err);
      calendarDensity = {};
    }
  }

  /* ===== CALENDAR ===== */
  let currentMonth = new Date();

  function initCalendar(){
    renderCalendar();
    document.getElementById('prevMonth').onclick = async () => {
      currentMonth.setMonth(currentMonth.getMonth()-1);
      await loadCalendarDensity();
      renderCalendar();
    };
    document.getElementById('nextMonth').onclick = async () => {
      currentMonth.setMonth(currentMonth.getMonth()+1);
      await loadCalendarDensity();
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
    const first = new Date(y,m,1).getDay();
    const days = new Date(y,m+1,0).getDate();

    for(let i=0;i<first;i++) grid.appendChild(document.createElement('div'));

    for(let d=1;d<=days;d++){
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const total = calendarDensity[key] || 0;

      const cell = document.createElement('div');
      cell.className = 'calCell';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      // 🎨 density ตาม max 20
      if(total <= 4) num.classList.add('density-low');
      else if(total <= 9) num.classList.add('density-mid');
      else if(total <= 14) num.classList.add('density-high');
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

  /* ===== DAY CONTROL ===== */
  function selectDate(key){
    selectedDate = key;
    const isClosed = closedDays.has(key);

    dayStatus.textContent = isClosed
      ? 'วันนี้เป็นวันหยุด'
      : 'วันนี้เปิดทำการ';

    toggleClosedBtn.textContent = isClosed
      ? 'ยกเลิกวันหยุด'
      : 'ตั้งเป็นวันหยุด';

    toggleClosedBtn.classList.remove('hidden');
    toggleClosedBtn.onclick = () => toggleClosed(key);

    isClosed ? lockQueueUI(true) : unlockQueueUI();
  }

  function toggleClosed(key){
    closedDays.has(key) ? closedDays.delete(key) : closedDays.add(key);
    localStorage.setItem(CLOSED_KEY, JSON.stringify([...closedDays]));
    renderCalendar();
    selectDate(key);
  }

  function lockQueueUI(show=false){
    stylistTabsEl.classList.add('locked');
    summaryEl.classList.add('locked');
    if(show) closedOverlay.classList.remove('hidden');
  }

  function unlockQueueUI(){
    stylistTabsEl.classList.remove('locked');
    summaryEl.classList.remove('locked');
    closedOverlay.classList.add('hidden');
  }

  closeClosedOverlay.onclick = () => closedOverlay.classList.add('hidden');

  /* ===== TABS ===== */
  const stylists=['Bank','Sindy','Assist'];
  let active='Bank';

  function renderStylistTabs(){
    stylistTabsEl.innerHTML='';
    stylists.forEach(s=>{
      const t=document.createElement('div');
      t.className='tab'+(s===active?' active':'');
      t.textContent=s;
      t.onclick=()=>{ if(!isClosedDay()){ active=s; renderStylistTabs(); } };
      stylistTabsEl.appendChild(t);
    });
  }

  function isClosedDay(){
    return selectedDate && closedDays.has(selectedDate);
  }

  /* ===== SUMMARY ===== */
  function renderSummary(){
    summaryEl.innerHTML=`
      <div class="panel">Bank<br><b>0</b></div>
      <div class="panel">Sindy<br><b>0</b></div>
      <div class="panel">Assist<br><b>0</b></div>
      <div class="panel">รวม<br><b>0</b></div>
    `;
  }

});

document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const API = '';

  const loginOverlay = document.getElementById('loginOverlay');
  const editOverlay = document.getElementById('editOverlay');

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

  /* ===== HARD LOCK OVERLAYS ===== */
  loginOverlay.classList.add('hidden');
  editOverlay.classList.add('hidden');

  /* ===== AUTH ===== */
  if (localStorage.getItem(AUTH_KEY) !== 'true') {
    loginOverlay.classList.remove('hidden');
    loginBtn.onclick = () => {
      if (pinInput.value !== OWNER_PIN) {
        loginMsg.textContent = 'PIN ไม่ถูกต้อง';
        return;
      }
      localStorage.setItem(AUTH_KEY, 'true');
      location.reload();
    };
    return;
  }

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ===== TIME (TH) ===== */
  function todayTH() {
    const d = new Date();
    return new Date(d.getTime() + (7 * 60 + d.getTimezoneOffset()) * 60000);
  }

  function key(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  let currentMonth = todayTH();
  let selectedDate = null;

  renderTopDate();
  renderCalendar();

  function renderTopDate() {
    document.getElementById('topDate').textContent =
      todayTH().toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'numeric' });
  }

  async function renderCalendar() {
    calendarGrid.innerHTML = '';
    calendarTitle.textContent = currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y,m,1).getDay();
    const days = new Date(y,m+1,0).getDate();

    for(let i=0;i<first;i++) calendarGrid.appendChild(document.createElement('div'));

    for(let d=1;d<=days;d++){
      const date = new Date(y,m,d);
      const div = document.createElement('div');
      div.className = 'calCell';

      const inner = document.createElement('div');
      inner.className = 'calCellInner';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      inner.onclick = () => {
        selectedDate = key(date);
        dayStatus.textContent = `วันที่ ${selectedDate}`;
      };

      inner.appendChild(num);
      div.appendChild(inner);
      calendarGrid.appendChild(div);
    }
  }

  prevMonthBtn.onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth()-1);
    renderCalendar();
  };

  nextMonthBtn.onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth()+1);
    renderCalendar();
  };

});

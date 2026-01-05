document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  /* ================= ELEMENTS ================= */
  const loginOverlay = document.getElementById('loginOverlay');
  const pinInput = document.getElementById('pinInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const topDate = document.getElementById('topDate');
  const calendarTitle = document.getElementById('calendarTitle');
  const calendarGrid = document.getElementById('calendarGrid');
  const dayHint = document.getElementById('dayHint');
  const stylistTabs = document.getElementById('stylistTabs');
  const summary = document.getElementById('summary');

  /* ================= STATE ================= */
  let currentMonth = new Date();
  let selectedDate = null;
  let activeStylist = 'Bank';

  const stylists = ['Bank', 'Sindy', 'Assist'];

  /* ================= AUTH ================= */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    loginOverlay.classList.add('hidden');
    boot();
  }

  loginBtn.onclick = () => {
    if (pinInput.value === OWNER_PIN) {
      localStorage.setItem(AUTH_KEY, 'true');
      loginOverlay.classList.add('hidden');
      loginMsg.textContent = '';
      boot();
    } else {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    }
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ================= BOOT ================= */
  function boot() {
    renderTopDate();
    renderCalendar();
    renderStylistTabs();
    renderSummary();
  }

  function renderTopDate() {
    topDate.textContent = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /* ================= CALENDAR ================= */
  document.getElementById('prevMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  };

  document.getElementById('nextMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  };

  function renderCalendar() {
    calendarGrid.innerHTML = '';
    calendarTitle.textContent = currentMonth.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric'
    });

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      calendarGrid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'calCell';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      cell.onclick = () => selectDate(d);

      cell.appendChild(num);
      calendarGrid.appendChild(cell);
    }
  }

  function selectDate(day) {
    selectedDate = day;
    dayHint.textContent = `วันที่เลือก: ${day}`;
    renderSummary();
  }

  /* ================= STYLIST TABS ================= */
  function renderStylistTabs() {
    stylistTabs.innerHTML = '';
    stylists.forEach(s => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (s === activeStylist ? ' active' : '');
      tab.textContent = s;
      tab.onclick = () => {
        activeStylist = s;
        renderStylistTabs();
        renderSummary();
      };
      stylistTabs.appendChild(tab);
    });
  }

  /* ================= SUMMARY ================= */
  function renderSummary() {
    summary.innerHTML = `
      <div class="panel">Bank<br><b>0</b></div>
      <div class="panel">Sindy<br><b>0</b></div>
      <div class="panel">Assist<br><b>0</b></div>
      <div class="panel">รวม<br><b>0</b></div>
    `;
  }

});

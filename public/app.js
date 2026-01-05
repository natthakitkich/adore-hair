document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const API = ''; // ใช้ same origin

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

  let densityMap = {}; // { 'YYYY-MM-DD': count }

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
  async function boot() {
    renderTopDate();
    await loadCalendarDensity();
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

  /* ================= DENSITY ================= */
  async function loadCalendarDensity() {
    try {
      const res = await fetch(`${API}/calendar-days`);
      const raw = await res.json();

      /*
        raw = { '2026-01-05': totalBookings }
        → ใช้ตรง ๆ เพราะ backend นับรวมมาแล้ว
      */
      densityMap = raw || {};
    } catch (e) {
      densityMap = {};
    }
  }

  function getDensityClass(dateKey) {
    const count = Math.min(densityMap[dateKey] || 0, 20);

    if (count >= 16) return 'density-full';
    if (count >= 11) return 'density-high';
    if (count >= 6) return 'density-mid';
    if (count >= 1) return 'density-low';
    return '';
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

      const dateKey =
        `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const densityClass = getDensityClass(dateKey);
      if (densityClass) num.classList.add(densityClass);

      cell.onclick = () => selectDate(dateKey);

      cell.appendChild(num);
      calendarGrid.appendChild(cell);
    }
  }

  function selectDate(dateKey) {
    selectedDate = dateKey;
    dayHint.textContent = `วันที่เลือก: ${dateKey}`;
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

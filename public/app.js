document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  /* ================= ELEMENTS ================= */
  const loginOverlay = document.getElementById('loginOverlay');
  const appRoot = document.getElementById('appRoot');

  const pinInput = document.getElementById('pinInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');
  const topDate = document.getElementById('topDate');

  const calendarGrid = document.getElementById('calendarGrid');
  const calendarTitle = document.getElementById('calendarTitle');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const dayHint = document.getElementById('dayHint');

  /* ================= STATE ================= */
  let currentMonth = new Date();
  let selectedDate = null;

  /* ================= INIT ================= */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    showApp();
  } else {
    showLogin();
  }

  /* ================= LOGIN ================= */
  loginBtn.onclick = () => {
    const pin = pinInput.value.replace(/\D/g, '');
    if (pin !== OWNER_PIN) {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }
    localStorage.setItem(AUTH_KEY, 'true');
    pinInput.value = '';
    loginMsg.textContent = '';
    showApp();
  };

  pinInput.addEventListener('input', () => {
    pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 4);
  });

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ================= UI ================= */
  function showLogin() {
    loginOverlay.style.display = 'flex';
    appRoot.style.display = 'none';
  }

  function showApp() {
    loginOverlay.style.display = 'none';
    appRoot.style.display = 'block';
    renderTopDate();
    initCalendar();
  }

  function renderTopDate() {
    if (!topDate) return;
    topDate.textContent = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /* ================= CALENDAR ================= */
  function initCalendar() {
    renderCalendar();

    prevMonthBtn.onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      renderCalendar();
    };

    nextMonthBtn.onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      renderCalendar();
    };
  }

  function renderCalendar() {
    calendarGrid.innerHTML = '';

    calendarTitle.textContent = currentMonth.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric'
    });

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // empty cells
    for (let i = 0; i < firstDay; i++) {
      calendarGrid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const cell = document.createElement('div');
      cell.className = 'calCell';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      if (dateStr === selectedDate) {
        cell.style.outline = '2px solid rgba(110,231,255,.6)';
      }

      cell.onclick = () => {
        selectedDate = dateStr;
        dayHint.textContent = `เลือกวันที่ ${d}`;
        renderCalendar();
      };

      cell.appendChild(num);
      calendarGrid.appendChild(cell);
    }
  }

});

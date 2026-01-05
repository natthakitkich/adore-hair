document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const API = '';

  /* ================= ELEMENTS ================= */
  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pinInput');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const calendarGrid = document.getElementById('calendarGrid');
  const calendarTitle = document.getElementById('calendarTitle');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');

  const stylistTabsEl = document.getElementById('stylistTabs');
  const summaryEl = document.getElementById('summary');
  const queueBody = document.getElementById('queueBody');

  const dayStatus = document.getElementById('dayStatus');
  const closeDayBtn = document.getElementById('closeDayBtn');
  const openDayBtn = document.getElementById('openDayBtn');

  /* ================= STATE ================= */
  let currentMonth = new Date();
  let selectedDate = null;
  let bookings = [];

  const stylists = ['Bank', 'Sindy', 'Assist'];

  /* ================= LOGIN ================= */
  const isAuthed = localStorage.getItem(AUTH_KEY) === 'true';

  if (isAuthed) {
    hideLogin();
    bootApp();
  } else {
    showLogin();
  }

  loginBtn.onclick = tryLogin;

  pinInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') tryLogin();
  });

  function tryLogin() {
    if (pinInput.value !== OWNER_PIN) {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }

    localStorage.setItem(AUTH_KEY, 'true');
    pinInput.value = '';
    loginMsg.textContent = '';
    hideLogin();
    bootApp();
  }

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  function showLogin() {
    loginOverlay.style.display = 'flex';
  }

  function hideLogin() {
    loginOverlay.style.display = 'none';
  }

  /* ================= BOOT ================= */
  function bootApp() {
    renderTopDate();
    initCalendar();
    renderStylistTabs();
    dayStatus.textContent = 'กรุณาเลือกวันจากปฏิทิน';
  }

  function renderTopDate() {
    const el = document.getElementById('topDate');
    el.textContent = new Date().toLocaleDateString('th-TH', {
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

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      calendarGrid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

      const cell = document.createElement('div');
      cell.className = 'calCell';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      cell.onclick = () => selectDate(dateStr, cell);

      cell.appendChild(num);
      calendarGrid.appendChild(cell);
    }
  }

  /* ================= DATE SELECT ================= */
  function selectDate(dateStr, cell) {
    selectedDate = dateStr;

    document
      .querySelectorAll('.calCell')
      .forEach(c => c.classList.remove('selected'));

    cell.classList.add('selected');
    dayStatus.textContent = `เลือกวันที่ ${dateStr}`;
  }

  /* ================= STYLIST ================= */
  function renderStylistTabs() {
    stylistTabsEl.innerHTML = '';
    stylists.forEach(s => {
      const tab = document.createElement('div');
      tab.className = 'tab';
      tab.textContent = s;
      stylistTabsEl.appendChild(tab);
    });
  }

});

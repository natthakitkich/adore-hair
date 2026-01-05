document.addEventListener('DOMContentLoaded', () => {

  /* =====================
     CONFIG
  ===================== */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  /* =====================
     ELEMENTS
  ===================== */
  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pin');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const dayStatus = document.getElementById('dayStatus');
  const calendarGrid = document.getElementById('calendarGrid');
  const calendarTitle = document.getElementById('calendarTitle');

  /* =====================
     STATE
  ===================== */
  let selectedDate = null;   // YYYY-MM-DD
  let currentMonth = new Date();

  /* =====================
     AUTH
  ===================== */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    loginOverlay.style.display = 'none';
    boot();
  }

  loginBtn.addEventListener('click', () => {
    if (pinInput.value.trim() !== OWNER_PIN) {
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

  /* =====================
     BOOT
  ===================== */
  function boot() {
    renderTopDate();
    renderCalendar();
    updateDayStatus();
  }

  function renderTopDate() {
    document.getElementById('topDate').textContent =
      new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
  }

  /* =====================
     CALENDAR
  ===================== */
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  });

  function renderCalendar() {
    calendarGrid.innerHTML = '';

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    calendarTitle.textContent =
      currentMonth.toLocaleDateString('th-TH', {
        month: 'long',
        year: 'numeric'
      });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // ช่องว่างก่อนวันแรก
    for (let i = 0; i < firstDay; i++) {
      calendarGrid.appendChild(document.createElement('div'));
    }

    // วันจริง
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'calCell';
      cell.textContent = d;

      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      if (key === selectedDate) {
        cell.style.outline = '2px solid #6ee7ff';
      }

      cell.addEventListener('click', () => {
        selectedDate = key;
        renderCalendar();
        updateDayStatus();
      });

      calendarGrid.appendChild(cell);
    }
  }

  /* =====================
     DAY STATUS
  ===================== */
  function updateDayStatus() {
    if (!selectedDate) {
      dayStatus.textContent = 'กรุณาเลือกวันจากปฏิทิน';
      return;
    }

    const d = new Date(selectedDate);
    dayStatus.textContent =
      'วันที่เลือก: ' +
      d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
  }

});

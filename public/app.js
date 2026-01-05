document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pinInput');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const calendarGrid = document.getElementById('calendarGrid');
  const calendarTitle = document.getElementById('calendarTitle');
  const prevMonth = document.getElementById('prevMonth');
  const nextMonth = document.getElementById('nextMonth');

  const dayStatus = document.getElementById('dayStatus');
  const stylistTabs = document.getElementById('stylistTabs');
  const summary = document.getElementById('summary');
  const queueBody = document.getElementById('queueBody');

  let currentMonth = new Date();
  let selectedDate = null;

  /* ===== AUTH ===== */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    loginOverlay.classList.add('hidden');
    boot();
  }

  loginBtn.onclick = () => {
    if (pinInput.value !== OWNER_PIN) {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }
    localStorage.setItem(AUTH_KEY, 'true');
    loginOverlay.classList.add('hidden');
    boot();
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ===== BOOT ===== */
  function boot() {
    document.getElementById('topDate').textContent =
      new Date().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

    renderCalendar();
  }

  /* ===== CALENDAR ===== */
  function renderCalendar() {
    calendarGrid.innerHTML = '';
    calendarTitle.textContent =
      currentMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < first; i++) {
      calendarGrid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= days; d++) {
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

      const cell = document.createElement('div');
      cell.className = 'calCell';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      if (selectedDate === dateStr) {
        cell.classList.add('selected');
      }

      cell.onclick = () => {
        selectedDate = dateStr;
        dayStatus.textContent = `เลือกวันที่ ${d}`;
        renderCalendar();
      };

      cell.appendChild(num);
      calendarGrid.appendChild(cell);
    }
  }

  prevMonth.onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  };

  nextMonth.onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  };

});

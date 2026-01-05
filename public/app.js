document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const CLOSED_KEY = 'adore_closed_days';
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

  const dayStatus = document.getElementById('dayStatus');
  const closeDayBtn = document.getElementById('closeDayBtn');
  const openDayBtn = document.getElementById('openDayBtn');

  const stylistTabsEl = document.getElementById('stylistTabs');
  const summaryEl = document.getElementById('summary');
  const queueBody = document.getElementById('queueBody');

  /* ================= STATE ================= */
  let currentMonth = new Date();
  let selectedDate = null;
  let bookings = [];
  let activeStylist = 'Bank';

  let closedDays = new Set(
    JSON.parse(localStorage.getItem(CLOSED_KEY) || '[]')
  );

  const stylists = ['Bank', 'Sindy', 'Assist'];

  /* ================= AUTH ================= */
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
    pinInput.value = '';
    loginMsg.textContent = '';
    hideLogin();
    bootApp();
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  function showLogin() {
    loginOverlay.classList.remove('hidden');
  }

  function hideLogin() {
    loginOverlay.classList.add('hidden');
  }

  /* ================= BOOT ================= */
  function bootApp() {
    renderTopDate();
    initCalendar();
    renderStylistTabs();
    lockUI();
  }

  function renderTopDate() {
    document.getElementById('topDate').textContent =
      new Date().toLocaleDateString('th-TH', {
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

  async function renderCalendar() {
    calendarGrid.innerHTML = '';
    calendarTitle.textContent =
      currentMonth.toLocaleDateString('th-TH', {
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
      const dateStr =
        `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const cell = document.createElement('div');
      cell.className = 'calCell';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      if (selectedDate === dateStr) {
        cell.classList.add('selected');
      }

      if (closedDays.has(dateStr)) {
        cell.classList.add('closed');
        num.classList.add('closed');
      }

      cell.onclick = () => selectDate(dateStr);

      cell.appendChild(num);
      calendarGrid.appendChild(cell);
    }
  }

  /* ================= DATE SELECT ================= */
  async function selectDate(dateStr) {
    selectedDate = dateStr;

    renderCalendar(); // refresh highlight

    const isClosed = closedDays.has(dateStr);

    dayStatus.textContent = isClosed
      ? 'วันนี้เป็นวันหยุด'
      : 'วันนี้เปิดทำการ';

    closeDayBtn.classList.toggle('hidden', isClosed);
    openDayBtn.classList.toggle('hidden', !isClosed);

    if (isClosed) {
      lockUI();
      return;
    }

    unlockUI();
    await loadBookings();

    // 👉 auto scroll ไปส่วนคิว
    document
      .getElementById('stylistTabs')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ================= BOOKINGS ================= */
  async function loadBookings() {
    const res = await fetch(`${API}/bookings?date=${selectedDate}`);
    bookings = await res.json();
    renderQueue();
    renderSummary();
  }

  function renderQueue() {
    queueBody.innerHTML = '';

    bookings
      .sort((a, b) => a.time.localeCompare(b.time))
      .forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${b.time.slice(0, 5)}</td>
          <td>${b.stylist}</td>
          <td>${b.gender === 'male' ? '👨' : '👩'}</td>
          <td>${b.name}</td>
          <td>${b.service || ''}</td>
          <td>${b.phone || ''}</td>
        `;
        queueBody.appendChild(tr);
      });
  }

  /* ================= UI LOCK ================= */
  function lockUI() {
    stylistTabsEl.classList.add('hidden');
    summaryEl.innerHTML = '';
    queueBody.innerHTML = '';
  }

  function unlockUI() {
    stylistTabsEl.classList.remove('hidden');
  }

  /* ================= STYLIST ================= */
  function renderStylistTabs() {
    stylistTabsEl.innerHTML = '';
    stylists.forEach(s => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (s === activeStylist ? ' active' : '');
      tab.textContent = s;
      tab.onclick = () => {
        activeStylist = s;
        renderStylistTabs();
      };
      stylistTabsEl.appendChild(tab);
    });
  }

  /* ================= SUMMARY ================= */
  function renderSummary() {
    const count = s => bookings.filter(b => b.stylist === s).length;
    summaryEl.innerHTML = `
      <div class="panel">Bank<br><b>${count('Bank')}</b></div>
      <div class="panel">Sindy<br><b>${count('Sindy')}</b></div>
      <div class="panel">Assist<br><b>${count('Assist')}</b></div>
      <div class="panel">รวม<br><b>${bookings.length}</b></div>
    `;
  }

});

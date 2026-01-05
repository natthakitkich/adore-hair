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

  const closedOverlay = document.getElementById('closedOverlay');
  const closeClosedOverlay = document.getElementById('closeClosedOverlay');

  const stylistTabsEl = document.getElementById('stylistTabs');
  const summaryEl = document.getElementById('summary');
  const dayStatus = document.getElementById('dayStatus');
  const toggleClosedBtn = document.getElementById('toggleClosedBtn');

  /* =========================
     STATE (สำคัญมาก)
  ========================= */
  let selectedDate = null;            // 🔥 ยังไม่เลือกวัน = null
  let closedDays = new Set(
    JSON.parse(localStorage.getItem(CLOSED_KEY) || '[]')
  );

  /* =========================
     AUTH CHECK
  ========================= */
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

  /* =========================
     BOOT APP
  ========================= */
  function bootApp() {
    renderTopDate();
    initCalendar();
    renderStylistTabs();
    renderSummary();

    // 🔥 สำคัญ: ตอนเริ่มต้น “ยังไม่เลือกวัน”
    resetDayState();
  }

  function renderTopDate() {
    document.getElementById('topDate').textContent =
      new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
  }

  /* =========================
     CALENDAR
  ========================= */
  let currentMonth = new Date();

  function initCalendar() {
    renderCalendar();
    document.getElementById('prevMonth').onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      renderCalendar();
    };
    document.getElementById('nextMonth').onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      renderCalendar();
    };
  }

  function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calendarTitle');
    grid.innerHTML = '';

    title.textContent = currentMonth.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric'
    });

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < first; i++) {
      grid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= days; d++) {
      const key = `${y}-${m + 1}-${d}`;
      const cell = document.createElement('div');
      cell.className = 'calCell';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      // demo density
      const total = Math.floor(Math.random() * 21);
      if (total <= 5) num.classList.add('density-low');
      else if (total <= 10) num.classList.add('density-mid');
      else if (total <= 15) num.classList.add('density-high');
      else num.classList.add('density-full');

      if (closedDays.has(key)) {
        cell.classList.add('closed');
        num.classList.add('closed');
      }

      cell.onclick = () => selectDate(key);

      cell.appendChild(num);
      grid.appendChild(cell);
    }
  }

  /* =========================
     DAY STATE (หัวใจของปัญหา)
  ========================= */
  function resetDayState() {
    selectedDate = null;
    dayStatus.textContent = 'ยังไม่ได้เลือกวัน';
    toggleClosedBtn.classList.add('hidden');
    unlockQueueUI();
  }

  function selectDate(key) {
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

    if (isClosed) {
      lockQueueUI(true);
    } else {
      unlockQueueUI();
    }
  }

  function toggleClosed(key) {
    if (closedDays.has(key)) {
      closedDays.delete(key);
    } else {
      closedDays.add(key);
    }
    localStorage.setItem(CLOSED_KEY, JSON.stringify([...closedDays]));
    renderCalendar();
    selectDate(key);
  }

  /* =========================
     LOCK / UNLOCK UI
  ========================= */
  function lockQueueUI(showOverlay = false) {
    stylistTabsEl.classList.add('locked');
    summaryEl.classList.add('locked');

    // 🔥 overlay โผล่ได้เฉพาะเมื่อ “เลือกวันแล้วจริง ๆ”
    if (showOverlay && selectedDate !== null) {
      closedOverlay.classList.remove('hidden');
    }
  }

  function unlockQueueUI() {
    stylistTabsEl.classList.remove('locked');
    summaryEl.classList.remove('locked');
    closedOverlay.classList.add('hidden');
  }

  closeClosedOverlay.onclick = () => {
    closedOverlay.classList.add('hidden');
  };

  /* =========================
     STYLIST TABS
  ========================= */
  const stylists = ['Bank', 'Sindy', 'Assist'];
  let active = 'Bank';

  function renderStylistTabs() {
    stylistTabsEl.innerHTML = '';
    stylists.forEach(s => {
      const t = document.createElement('div');
      t.className = 'tab' + (s === active ? ' active' : '');
      t.textContent = s;
      t.onclick = () => {
        if (selectedDate && !closedDays.has(selectedDate)) {
          active = s;
          renderStylistTabs();
        }
      };
      stylistTabsEl.appendChild(t);
    });
  }

  /* =========================
     SUMMARY
  ========================= */
  function renderSummary() {
    summaryEl.innerHTML = `
      <div class="panel">Bank<br><b>0</b></div>
      <div class="panel">Sindy<br><b>0</b></div>
      <div class="panel">Assist<br><b>0</b></div>
      <div class="panel">รวม<br><b>0</b></div>
    `;
  }

});

document.addEventListener('DOMContentLoaded', () => {

  /* =========================
     CONFIG
  ========================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  /* =========================
     ELEMENTS
  ========================= */
  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pin');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  /* =========================
     AUTH CHECK (ON LOAD)
  ========================= */
  const isAuthed = localStorage.getItem(AUTH_KEY) === 'true';

  if (isAuthed) {
    hideLogin();
    bootApp();
  } else {
    showLogin();
  }

  /* =========================
     LOGIN
  ========================= */
  loginBtn.addEventListener('click', () => {
    const pin = pinInput.value.trim();

    if (pin.length !== 4) {
      loginMsg.textContent = 'กรุณาใส่ PIN 4 หลัก';
      return;
    }

    if (pin === OWNER_PIN) {
      localStorage.setItem(AUTH_KEY, 'true');
      pinInput.value = '';
      loginMsg.textContent = '';
      hideLogin();
      bootApp();
    } else {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    }
  });

  pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });

  /* =========================
     LOGOUT
  ========================= */
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  });

  /* =========================
     UI HELPERS
  ========================= */
  function showLogin() {
    loginOverlay.classList.remove('hidden');
  }

  function hideLogin() {
    loginOverlay.classList.add('hidden');
  }

  /* =========================
     APP BOOT
  ========================= */
  function bootApp() {
    renderTopDate();
    initCalendar();
    renderStylistTabs();
    renderSummary();
    renderQueueTable();
  }

  /* =========================
     TOP DATE
  ========================= */
  function renderTopDate() {
    const el = document.getElementById('topDate');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('en-US', {
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
    if (!grid || !title) return;

    grid.innerHTML = '';
    title.textContent = currentMonth.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric'
    });

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'calCell';
      cell.textContent = d;
      grid.appendChild(cell);
    }
  }

  /* =========================
     STYLIST TABS
  ========================= */
  const stylists = ['Bank', 'Sindy', 'Assist'];
  let activeStylist = 'Bank';

  function renderStylistTabs() {
    const wrap = document.getElementById('stylistTabs');
    if (!wrap) return;

    wrap.innerHTML = '';
    stylists.forEach(name => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (name === activeStylist ? ' active' : '');
      tab.textContent = name;
      tab.onclick = () => {
        activeStylist = name;
        renderStylistTabs();
        renderQueueTable();
      };
      wrap.appendChild(tab);
    });
  }

  /* =========================
     SUMMARY
  ========================= */
  function renderSummary() {
    const el = document.getElementById('summary');
    if (!el) return;

    el.innerHTML = `
      <div class="panel">Bank<br><b>0</b></div>
      <div class="panel">Sindy<br><b>0</b></div>
      <div class="panel">Assist<br><b>0</b></div>
      <div class="panel">รวม<br><b>0</b></div>
    `;
  }

  /* =========================
     QUEUE TABLE
  ========================= */
  function renderQueueTable() {
    const tbody = document.getElementById('queueTable');
    if (!tbody) return;
    tbody.innerHTML = '';
  }

});

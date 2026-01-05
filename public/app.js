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

  /* ================= STATE ================= */
  let currentMonth;
  let selectedDate = null;
  let bookings = [];
  let calendarDensity = {};
  let activeStylist = 'Bank';

  const stylists = ['Bank', 'Sindy', 'Assist'];

  /* ================= TIMEZONE (TH) ================= */
  function getTodayTH() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 7 * 60 * 60000);
  }

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  /* ================= AUTH (ONE TIME ONLY) ================= */
  const isAuthed = localStorage.getItem(AUTH_KEY) === 'true';

  if (!isAuthed) {
    showLogin();
    bindLogin();
    return; // ⛔ สำคัญ: หยุดตรงนี้
  }

  hideLogin();
  bootApp();

  function bindLogin() {
    loginBtn.onclick = () => {
      if (pinInput.value !== OWNER_PIN) {
        loginMsg.textContent = 'PIN ไม่ถูกต้อง';
        return;
      }
      localStorage.setItem(AUTH_KEY, 'true');
      location.reload(); // clean boot
    };
  }

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
  async function bootApp() {
    renderTopDate();

    currentMonth = getTodayTH();

    calendarDensity = await fetchCalendarDensity();
    renderCalendar();

    renderStylistTabs();

    // เลือกวันนี้อัตโนมัติ (หลัง render เสร็จ)
    const todayKey = dateKey(getTodayTH());
    selectDate(todayKey);
  }

  function renderTopDate() {
    const el = document.getElementById('topDate');
    el.textContent = getTodayTH().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /* ================= CALENDAR ================= */
  async function fetchCalendarDensity() {
    try {
      const res = await fetch(`${API}/calendar-days`);
      const raw = await res.json();

      const map = {};
      Object.keys(raw).forEach(k => {
        map[k] = Math.min(raw[k], 20); // max 20
      });
      return map;
    } catch {
      return {};
    }
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
      const dObj = new Date(y, m, d);
      const key = dateKey(dObj);

      const cell = document.createElement('div');
      cell.className = 'calCell';

      const inner = document.createElement('div');
      inner.className = 'calCellInner';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      const count = calendarDensity[key] || 0;
      if (count > 0) {
        if (count <= 5) num.classList.add('density-low');
        else if (count <= 10) num.classList.add('density-mid');
        else if (count <= 15) num.classList.add('density-high');
        else num.classList.add('density-full');
      }

      inner.onclick = () => selectDate(key);

      inner.appendChild(num);
      cell.appendChild(inner);
      calendarGrid.appendChild(cell);
    }
  }

  prevMonthBtn.onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  };

  nextMonthBtn.onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  };

  /* ================= DATE SELECT ================= */
  async function selectDate(key) {
    selectedDate = key;
    dayStatus.textContent = `วันที่ ${key}`;
    await loadBookings();
  }

  /* ================= BOOKINGS ================= */
  async function loadBookings() {
    const res = await fetch(`${API}/bookings?date=${selectedDate}`);
    bookings = await res.json();
    renderQueue();
    renderSummary();
  }

  function renderQueue() {
    if (!queueBody) return;
    queueBody.innerHTML = '';

    bookings
      .sort((a, b) => a.time.localeCompare(b.time))
      .forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${b.time.slice(0,5)}</td>
          <td>${b.stylist}</td>
          <td>${b.gender === 'male' ? '👨' : '👩'}</td>
          <td>${b.name}</td>
          <td>${b.service || ''}</td>
          <td>${b.phone || ''}</td>
        `;
        queueBody.appendChild(tr);
      });
  }

  /* ================= STYLIST TABS ================= */
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
      <div class="panel stylist-bank">Bank<br><b>${count('Bank')}</b></div>
      <div class="panel stylist-sindy">Sindy<br><b>${count('Sindy')}</b></div>
      <div class="panel stylist-assist">Assist<br><b>${count('Assist')}</b></div>
      <div class="panel">รวม<br><b>${bookings.length}</b></div>
    `;
  }

});

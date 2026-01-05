document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const API = '';

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
  const queueBody = document.getElementById('queueBody');

  /* ================= STATE ================= */
  let currentMonth = new Date();
  let selectedDate = null;
  let activeStylist = 'Bank';
  let densityMap = {};
  let bookings = [];

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
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  /* ================= DENSITY ================= */
  async function loadCalendarDensity() {
    try {
      const res = await fetch(`${API}/calendar-days`);
      densityMap = await res.json() || {};
    } catch {
      densityMap = {};
    }
  }

  function densityClass(dateKey) {
    const c = Math.min(densityMap[dateKey] || 0, 20);
    if (c >= 16) return 'density-full';
    if (c >= 11) return 'density-high';
    if (c >= 6) return 'density-mid';
    if (c >= 1) return 'density-low';
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
      month: 'long', year: 'numeric'
    });

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < first; i++) calendarGrid.appendChild(document.createElement('div'));

    for (let d = 1; d <= days; d++) {
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell = document.createElement('div');
      cell.className = 'calCell';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      const dc = densityClass(key);
      if (dc) num.classList.add(dc);

      cell.onclick = () => selectDate(key);

      cell.appendChild(num);
      calendarGrid.appendChild(cell);
    }
  }

  async function selectDate(dateKey) {
    selectedDate = dateKey;
    dayHint.textContent = `วันที่เลือก: ${dateKey}`;
    await loadBookings();
    renderSummary();
    renderQueue();
  }

  /* ================= BOOKINGS ================= */
  async function loadBookings() {
    if (!selectedDate) return;
    const res = await fetch(`${API}/bookings?date=${selectedDate}`);
    bookings = await res.json();
  }

  /* ================= STYLIST ================= */
  function renderStylistTabs() {
    stylistTabs.innerHTML = '';
    stylists.forEach(s => {
      const t = document.createElement('div');
      t.className = 'tab' + (s === activeStylist ? ' active' : '');
      t.textContent = s;
      t.onclick = () => {
        activeStylist = s;
        renderStylistTabs();
        renderQueue();
      };
      stylistTabs.appendChild(t);
    });
  }

  /* ================= SUMMARY ================= */
  function renderSummary() {
    const count = name =>
      bookings.filter(b => b.stylist === name).length;

    summary.innerHTML = `
      <div class="panel">Bank<br><b>${count('Bank')}</b></div>
      <div class="panel">Sindy<br><b>${count('Sindy')}</b></div>
      <div class="panel">Assist<br><b>${count('Assist')}</b></div>
      <div class="panel">รวม<br><b>${bookings.length}</b></div>
    `;
  }

  /* ================= QUEUE TABLE ================= */
  function renderQueue() {
    queueBody.innerHTML = '';

    bookings
      .filter(b => b.stylist === activeStylist)
      .sort((a,b)=>a.time.localeCompare(b.time))
      .forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${b.time.slice(0,5)}</td>
          <td><span class="stylistBadge ${b.stylist.toLowerCase()}">${b.stylist}</span></td>
          <td>${b.gender === 'male' ? '👨' : '👩'}</td>
          <td>${b.name}</td>
          <td>${b.service || ''}</td>
          <td>${b.phone || ''}</td>
        `;
        queueBody.appendChild(tr);
      });
  }

});

document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const API = '';

  const STYLISTS = ['Bank', 'Sindy', 'Assist'];

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
  let currentMonth = new Date();
  let selectedDate = null;
  let bookings = [];
  let activeStylist = 'Bank';

  /* ================= AUTH ================= */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    hideLogin();
    boot();
  } else {
    showLogin();
  }

  loginBtn.onclick = login;
  pinInput.addEventListener('keydown', e => e.key === 'Enter' && login());

  function login() {
    if (pinInput.value !== OWNER_PIN) {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }
    localStorage.setItem(AUTH_KEY, 'true');
    hideLogin();
    boot();
  }

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  function showLogin() { loginOverlay.style.display = 'flex'; }
  function hideLogin() { loginOverlay.style.display = 'none'; }

  /* ================= BOOT ================= */
  function boot() {
    renderTopDate();
    initCalendar();
    renderStylistTabs();
    dayStatus.textContent = 'กรุณาเลือกวันจากปฏิทิน';
  }

  function renderTopDate() {
    document.getElementById('topDate').textContent =
      new Date().toLocaleDateString('th-TH', {
        day:'numeric', month:'short', year:'numeric'
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
      month:'long', year:'numeric'
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
        `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

      const cell = document.createElement('div');
      cell.className = 'calCell';

      const inner = document.createElement('div');
      inner.className = 'calCellInner';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      inner.appendChild(num);
      cell.appendChild(inner);

      cell.onclick = () => selectDate(dateStr, cell);

      calendarGrid.appendChild(cell);
    }
  }

  /* ================= DATE SELECT ================= */
  async function selectDate(date, cell) {
    selectedDate = date;

    document.querySelectorAll('.calCell')
      .forEach(c => c.classList.remove('selected'));
    cell.classList.add('selected');

    dayStatus.textContent = `วันที่ ${date}`;
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
    queueBody.innerHTML = '';

    const list = bookings
      .filter(b => b.stylist === activeStylist)
      .sort((a, b) => a.time.localeCompare(b.time));

    if (list.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="6" style="text-align:center;color:#9aa6c5">
          ยังไม่มีคิวในวันนี้
        </td>
      `;
      queueBody.appendChild(tr);
      return;
    }

    list.forEach(b => {
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

  /* ================= STYLIST ================= */
  function renderStylistTabs() {
    stylistTabsEl.innerHTML = '';
    STYLISTS.forEach(s => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (s === activeStylist ? ' active' : '');
      tab.textContent = s;
      tab.onclick = () => {
        activeStylist = s;
        renderStylistTabs();
        if (selectedDate) renderQueue();
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

document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const API = ''; // same origin

  /* ================= ELEMENT HELPERS ================= */
  const $ = id => document.getElementById(id);

  /* ================= STATE ================= */
  let currentMonth = new Date();
  let selectedDate = null;
  let bookings = [];
  let closedDays = new Set();
  let calendarDensity = {};
  let activeStylist = 'Bank';

  const stylists = ['Bank', 'Sindy', 'Assist'];

  /* ================= LOGIN ================= */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    boot();
  } else {
    $('loginOverlay').style.display = 'flex';
  }

  $('loginBtn').onclick = () => {
    if ($('pinInput').value !== OWNER_PIN) {
      $('loginMsg').textContent = 'PIN ไม่ถูกต้อง';
      return;
    }
    localStorage.setItem(AUTH_KEY, 'true');
    $('loginOverlay').style.display = 'none';
    $('pinInput').value = '';
    $('loginMsg').textContent = '';
    boot();
  };

  $('logoutBtn').onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ================= BOOT ================= */
  async function boot() {
    renderTopDate();
    await loadClosedDays();
    await loadCalendarDensity();
    renderCalendar();
    renderStylistTabs();
  }

  function renderTopDate() {
    $('topDate').textContent = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /* ================= LOAD DATA ================= */
  async function loadClosedDays() {
    try {
      const res = await fetch(`${API}/closed-days`);
      const list = await res.json();
      closedDays = new Set(list);
    } catch {
      closedDays = new Set();
    }
  }

  async function loadCalendarDensity() {
    try {
      const res = await fetch(`${API}/calendar-days`);
      const raw = await res.json();

      /**
       * raw = { "YYYY-MM-DD": totalBookings }
       * เราจะใช้เฉพาะ Bank + Sindy
       * (server นับรวมมาแล้วทุกช่าง → แต่ตามโจทย์เดิม
       *  Assist ไม่นับ density)
       *
       * สมมติ 1 booking = 1 slot
       */
      calendarDensity = raw || {};
    } catch {
      calendarDensity = {};
    }
  }

  /* ================= CALENDAR ================= */
  $('prevMonth').onclick = async () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    await loadCalendarDensity();
    renderCalendar();
  };

  $('nextMonth').onclick = async () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    await loadCalendarDensity();
    renderCalendar();
  };

  function renderCalendar() {
    const grid = $('calendarGrid');
    grid.innerHTML = '';

    $('calendarTitle').textContent = currentMonth.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric'
    });

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr =
        `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const cell = document.createElement('div');
      cell.className = 'calCell';

      const inner = document.createElement('div');
      inner.className = 'calCellInner';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      /* ===== DENSITY (REAL DATA) ===== */
      const count = calendarDensity[dateStr] || 0;

      if (count >= 1 && count <= 5) num.classList.add('density-low');
      else if (count >= 6 && count <= 10) num.classList.add('density-mid');
      else if (count >= 11 && count <= 15) num.classList.add('density-high');
      else if (count >= 16) num.classList.add('density-full');

      /* ===== CLOSED DAY ===== */
      if (closedDays.has(dateStr)) {
        cell.classList.add('closed');
      }

      inner.appendChild(num);
      cell.appendChild(inner);

      cell.onclick = () => selectDate(dateStr);

      grid.appendChild(cell);
    }
  }

  /* ================= DATE SELECT ================= */
  async function selectDate(date) {
    selectedDate = date;
    const isClosed = closedDays.has(date);

    $('dayStatus').textContent = isClosed
      ? 'วันนี้เป็นวันหยุด'
      : `วันที่ ${date} เปิดทำการ`;

    $('closeDayBtn').classList.toggle('hidden', isClosed);
    $('openDayBtn').classList.toggle('hidden', !isClosed);

    $('closeDayBtn').onclick = () => toggleClosed(date, true);
    $('openDayBtn').onclick = () => toggleClosed(date, false);

    if (isClosed) {
      $('queueBody').innerHTML = '';
      $('summary').innerHTML = '';
      return;
    }

    await loadBookings();
  }

  async function toggleClosed(date, close) {
    await fetch(`${API}/closed-days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        action: close ? 'close' : 'open'
      })
    });

    await loadClosedDays();
    await loadCalendarDensity();
    renderCalendar();
    selectDate(date);
  }

  /* ================= BOOKINGS ================= */
  async function loadBookings() {
    const res = await fetch(`${API}/bookings?date=${selectedDate}`);
    bookings = await res.json();
    renderQueue();
    renderSummary();
  }

  function renderQueue() {
    $('queueBody').innerHTML = '';

    bookings
      .filter(b => b.stylist === activeStylist)
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
          <td></td>
        `;
        $('queueBody').appendChild(tr);
      });
  }

  /* ================= STYLIST TABS ================= */
  function renderStylistTabs() {
    $('stylistTabs').innerHTML = '';
    stylists.forEach(s => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (s === activeStylist ? ' active' : '');
      tab.textContent = s;
      tab.onclick = () => {
        activeStylist = s;
        renderStylistTabs();
        if (selectedDate && !closedDays.has(selectedDate)) {
          renderQueue();
        }
      };
      $('stylistTabs').appendChild(tab);
    });
  }

  /* ================= SUMMARY ================= */
  function renderSummary() {
    const count = s => bookings.filter(b => b.stylist === s).length;

    $('summary').innerHTML = `
      <div class="panel">Bank<br><b>${count('Bank')}</b></div>
      <div class="panel">Sindy<br><b>${count('Sindy')}</b></div>
      <div class="panel">Assist<br><b>${count('Assist')}</b></div>
      <div class="panel">รวม<br><b>${bookings.length}</b></div>
    `;
  }

});

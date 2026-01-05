document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const CLOSED_KEY = 'adore_closed_days';

  const API = ''; // ใช้ path เดิม

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

  const editOverlay = document.getElementById('editOverlay');
  const editDate = document.getElementById('editDate');
  const editTime = document.getElementById('editTime');
  const editStylist = document.getElementById('editStylist');
  const editName = document.getElementById('editName');
  const editPhone = document.getElementById('editPhone');
  const editService = document.getElementById('editService');
  const saveEditBtn = document.getElementById('saveEditBtn');
  const deleteEditBtn = document.getElementById('deleteEditBtn');
  const closeEditBtn = document.getElementById('closeEditBtn');

  /* ================= STATE ================= */
  let currentMonth = new Date();
  let selectedDate = null;
  let bookings = [];
  let activeStylist = 'Bank';
  let editingBooking = null;

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

  async function renderCalendar() {
    calendarGrid.innerHTML = '';
    calendarTitle.textContent = currentMonth.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric'
    });

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const density = await fetchCalendarDensity();

    for (let i = 0; i < firstDay; i++) {
      calendarGrid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const cell = document.createElement('div');
      cell.className = 'calCell';

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      const count = density[dateStr] || 0;

      if (count > 0) {
        if (count <= 5) num.classList.add('density-low');
        else if (count <= 10) num.classList.add('density-mid');
        else if (count <= 15) num.classList.add('density-high');
        else num.classList.add('density-full');
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

  async function fetchCalendarDensity() {
    try {
      const res = await fetch(`${API}/calendar-days`);
      return await res.json();
    } catch {
      return {};
    }
  }

  /* ================= DATE SELECT ================= */
  async function selectDate(dateStr) {
    selectedDate = dateStr;

    const isClosed = closedDays.has(dateStr);

    dayStatus.textContent = isClosed
      ? 'วันนี้เป็นวันหยุด'
      : 'วันนี้เปิดทำการ';

    closeDayBtn.classList.toggle('hidden', isClosed);
    openDayBtn.classList.toggle('hidden', !isClosed);

    closeDayBtn.onclick = () => toggleClosed(dateStr, true);
    openDayBtn.onclick = () => toggleClosed(dateStr, false);

    if (isClosed) {
      lockUI();
      return;
    }

    unlockUI();
    await loadBookings();
  }

  function toggleClosed(dateStr, close) {
    if (close) closedDays.add(dateStr);
    else closedDays.delete(dateStr);

    localStorage.setItem(CLOSED_KEY, JSON.stringify([...closedDays]));
    renderCalendar();
    selectDate(dateStr);
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
          <td>${b.time.slice(0,5)}</td>
          <td>${b.stylist}</td>
          <td>${b.gender === 'male' ? '👨' : '👩'}</td>
          <td>${b.name}</td>
          <td>${b.service || ''}</td>
          <td>${b.phone || ''}</td>
          <td><button class="ghost">แก้ไข</button></td>
        `;
        tr.querySelector('button').onclick = () => openEdit(b);
        queueBody.appendChild(tr);
      });
  }

  /* ================= EDIT ================= */
  function openEdit(b) {
    editingBooking = b;

    editDate.value = b.date;
    editStylist.value = b.stylist;
    editName.value = b.name;
    editPhone.value = b.phone || '';
    editService.value = b.service || '';

    document.querySelectorAll('[name=editGender]').forEach(r => {
      r.checked = r.value === b.gender;
    });

    renderEditTimes(b.date, b.time);
    editOverlay.classList.remove('hidden');
  }

  async function renderEditTimes(date, currentTime) {
    editTime.innerHTML = '';

    const res = await fetch(`${API}/bookings?date=${date}`);
    const list = await res.json();

    for (let h = 13; h <= 22; h++) {
      const t = `${String(h).padStart(2,'0')}:00:00`;

      const clash = list.find(
        x => x.time === t &&
             x.stylist === editingBooking.stylist &&
             x.id !== editingBooking.id
      );

      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t.slice(0,5);

      if (clash) opt.disabled = true;
      if (t === currentTime) opt.selected = true;

      editTime.appendChild(opt);
    }
  }

  saveEditBtn.onclick = async () => {
    const gender = document.querySelector('[name=editGender]:checked')?.value;

    const res = await fetch(`${API}/bookings/${editingBooking.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        date: editDate.value,
        time: editTime.value,
        name: editName.value,
        phone: editPhone.value,
        gender,
        service: editService.value
      })
    });

    if (!res.ok) {
      alert('คิวนี้ถูกจองแล้ว');
      return;
    }

    closeEdit();
    loadBookings();
    alert('แก้ไขคิวสำเร็จ');
  };

  deleteEditBtn.onclick = async () => {
    if (!confirm('ยืนยันลบคิวนี้?')) return;
    await fetch(`${API}/bookings/${editingBooking.id}`, { method:'DELETE' });
    closeEdit();
    loadBookings();
  };

  closeEditBtn.onclick = closeEdit;

  function closeEdit() {
    editOverlay.classList.add('hidden');
    editingBooking = null;
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
      <div class="panel">Bank<br><b>${count('Bank')}</b></div>
      <div class="panel">Sindy<br><b>${count('Sindy')}</b></div>
      <div class="panel">Assist<br><b>${count('Assist')}</b></div>
      <div class="panel">รวม<br><b>${bookings.length}</b></div>
    `;
  }

});

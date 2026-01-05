/* =================================================
   Adore Hair – app.js (Develop + Calendar Density)
================================================= */

const API = '';

/* =========================
   GLOBAL STATE
========================= */
let bookings = [];
let currentDate = '';
let currentStylist = 'Bank';

// DENSITY
let calendarDensity = {};
let currentMonth = new Date();

/* =========================
   LOGIN CONTROL
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

const OWNER_PIN = '1234';

loginBtn.onclick = () => {
  if (pinInput.value === OWNER_PIN) {
    loginOverlay.classList.add('hidden');
    pinInput.value = '';
    loginMsg.textContent = '';
    init();
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
};

logoutBtn.onclick = () => location.reload();

/* =========================
   INIT
========================= */
function init() {
  const dateInput = document.getElementById('date');
  const today = new Date().toISOString().slice(0, 10);

  currentDate = today;
  dateInput.value = today;

  dateInput.onchange = () => {
    currentDate = dateInput.value;
    loadBookings();
    highlightSelectedDate();
  };

  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
      renderTimeOptions();
      renderTable();
      updateSummary();
    };
  });

  // month navigation
  document.getElementById('prevMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  };

  document.getElementById('nextMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  };

  loadCalendarDensity();
  loadBookings();
}

/* =========================
   UTIL
========================= */
function formatTime(time) {
  return time ? time.slice(0, 5) : '';
}

/* =========================
   LOAD BOOKINGS
========================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${currentDate}`);
  bookings = await res.json();

  renderTimeOptions();
  renderTable();
  updateSummary();
}

/* =========================
   LOAD CALENDAR DENSITY
========================= */
async function loadCalendarDensity() {
  try {
    const res = await fetch(`${API}/calendar-days`);
    calendarDensity = await res.json();
  } catch {
    calendarDensity = {};
  }
  renderCalendar();
}

/* =========================
   CALENDAR RENDER
========================= */
function renderCalendar() {
  const calendarDays = document.getElementById('calendarDays');
  const calendarTitle = document.getElementById('calendarTitle');

  if (!calendarDays || !calendarTitle) return;

  calendarDays.innerHTML = '';
  calendarTitle.textContent = currentMonth.toLocaleString('th-TH', {
    month: 'long',
    year: 'numeric'
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarDays.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = calendarDensity[dateStr] || 0;

    const cell = document.createElement('div');
    cell.className = 'calCell';
    if (dateStr === currentDate) cell.classList.add('selected');

    const num = document.createElement('div');
    num.className = 'calNum';

    if (count >= 7) num.classList.add('density-full');
    else if (count >= 5) num.classList.add('density-high');
    else if (count >= 3) num.classList.add('density-mid');
    else if (count >= 1) num.classList.add('density-low');

    num.textContent = day;
    cell.appendChild(num);

    cell.onclick = () => {
      currentDate = dateStr;
      document.getElementById('date').value = dateStr;
      loadBookings();
      highlightSelectedDate();
    };

    calendarDays.appendChild(cell);
  }
}

/* =========================
   HIGHLIGHT SELECTED DATE
========================= */
function highlightSelectedDate() {
  document.querySelectorAll('.calCell').forEach(c =>
    c.classList.remove('selected')
  );

  const target = [...document.querySelectorAll('.calCell')].find(
    c => c.textContent.trim() === String(Number(currentDate.slice(-2)))
  );

  if (target) target.classList.add('selected');
}

/* =========================
   TIME OPTIONS
========================= */
function renderTimeOptions() {
  const timeSelect = document.getElementById('time');
  timeSelect.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;

    const booked = bookings.find(
      b => b.time === time && b.stylist === currentStylist
    );

    const option = document.createElement('option');
    option.value = time;
    option.textContent = formatTime(time);
    if (booked) option.disabled = true;

    timeSelect.appendChild(option);
  }
}

/* =========================
   FORM SUBMIT
========================= */
document.getElementById('bookingForm').onsubmit = async e => {
  e.preventDefault();

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) {
    alert('กรุณาเลือกเพศ');
    return;
  }

  await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: currentDate,
      time: document.getElementById('time').value,
      stylist: currentStylist,
      name: document.getElementById('name').value,
      phone: document.getElementById('phone').value,
      gender,
      service: document.getElementById('service').value
    })
  });

  e.target.reset();
  loadCalendarDensity();
  loadBookings();
};

/* =========================
   TABLE / SUMMARY
========================= */
function renderTable() {
  const list = document.getElementById('list');
  list.innerHTML = '';

  bookings
    .filter(b => b.stylist === currentStylist)
    .forEach(b => {
      const stylistClass =
        b.stylist === 'Bank'
          ? 'stylist-bank'
          : b.stylist === 'Sindy'
          ? 'stylist-sindy'
          : 'stylist-assist';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatTime(b.time)}</td>
        <td><span class="stylist-badge ${stylistClass}">${b.stylist}</span></td>
        <td>${b.gender === 'male' ? '👨' : '👩'}</td>
        <td>${b.name}</td>
        <td>${b.service || ''}</td>
        <td>${b.phone || ''}</td>
        <td><button class="ghost">ลบ/แก้ไขคิว</button></td>
      `;
      tr.querySelector('button').onclick = () => openEditModal(b);
      list.appendChild(tr);
    });
}

function updateSummary() {
  const bank = bookings.filter(b => b.stylist === 'Bank').length;
  const sindy = bookings.filter(b => b.stylist === 'Sindy').length;
  const assist = bookings.filter(b => b.stylist === 'Assist').length;

  document.getElementById('countBank').textContent = bank;
  document.getElementById('countSindy').textContent = sindy;
  document.getElementById('countAssist').textContent = assist;
  document.getElementById('countTotal').textContent =
    bank + sindy + assist;
}

/* =========================
   EDIT MODAL
========================= */
const editOverlay = document.getElementById('editOverlay');
const editTime = document.getElementById('editTime');
const editStylist = document.getElementById('editStylist');
const editName = document.getElementById('editName');
const editPhone = document.getElementById('editPhone');
const editService = document.getElementById('editService');
let editingId = null;

function openEditModal(b) {
  editingId = b.id;
  editTime.value = formatTime(b.time);
  editStylist.value = b.stylist;
  editName.value = b.name;
  editPhone.value = b.phone || '';
  editService.value = b.service || '';

  document.querySelectorAll('[name=editGender]').forEach(r => {
    r.checked = r.value === b.gender;
  });

  editOverlay.classList.remove('hidden');
}

document.getElementById('saveEdit').onclick = async () => {
  const gender = document.querySelector('[name=editGender]:checked')?.value;

  await fetch(`${API}/bookings/${editingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: editName.value,
      phone: editPhone.value,
      gender,
      service: editService.value
    })
  });

  alert('ข้อมูลถูกแก้ไขแล้ว');
  closeEditModal();
  loadCalendarDensity();
  loadBookings();
};

document.getElementById('deleteEdit').onclick = async () => {
  if (!confirm('ยืนยันการลบคิวนี้?')) return;

  await fetch(`${API}/bookings/${editingId}`, { method: 'DELETE' });

  closeEditModal();
  loadCalendarDensity();
  loadBookings();
};

document.getElementById('closeEdit').onclick = closeEditModal;

function closeEditModal() {
  editOverlay.classList.add('hidden');
  editingId = null;
}

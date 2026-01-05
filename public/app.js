/* =================================================
   Adore Hair – app.js (Develop from Basic)
================================================= */

const API = '';

/* =========================
   GLOBAL STATE (BASIC)
========================= */
let bookings = [];
let currentDate = '';
let currentStylist = 'Bank';

/* =========================
   LOGIN CONTROL (DEVELOP)
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

const OWNER_PIN = '1234';

loginBtn.addEventListener('click', () => {
  if (pinInput.value === OWNER_PIN) {
    loginOverlay.classList.add('hidden');
    pinInput.value = '';
    loginMsg.textContent = '';
    init(); // start system only after login
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
});

logoutBtn.addEventListener('click', () => {
  location.reload();
});

/* =========================
   INIT (BASIC)
========================= */
function init() {
  const dateInput = document.getElementById('date');
  const today = new Date().toISOString().slice(0, 10);

  currentDate = today;
  dateInput.value = today;

  dateInput.addEventListener('change', () => {
    currentDate = dateInput.value;
    loadBookings();
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
      renderTimeOptions();
      renderTable();
      updateSummary();
    });
  });

  loadBookings();
}

/* =========================
   UTIL
========================= */
function formatTime(time) {
  return time ? time.slice(0, 5) : '';
}

/* =========================
   LOAD BOOKINGS (BASIC)
========================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${currentDate}`);
  bookings = await res.json();

  renderTimeOptions();
  renderTable();
  updateSummary();
}

/* =========================
   TIME OPTIONS (BASIC)
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
   FORM SUBMIT (BASIC)
========================= */
document.getElementById('bookingForm').addEventListener('submit', async e => {
  e.preventDefault();

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) {
    alert('กรุณาเลือกเพศ');
    return;
  }

  const payload = {
    date: currentDate,
    time: document.getElementById('time').value,
    stylist: currentStylist,
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    gender,
    service: document.getElementById('service').value
  };

  await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  e.target.reset();
  loadBookings();
});

/* =========================
   TABLE RENDER (BASIC + DEVELOP)
========================= */
function renderTable() {
  const list = document.getElementById('list');
  list.innerHTML = '';

  bookings
    .filter(b => b.stylist === currentStylist)
    .forEach(b => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${formatTime(b.time)}</td>
        <td>${b.stylist}</td>
        <td>${b.gender === 'male' ? '👨' : '👩'}</td>
        <td>${b.name}</td>
        <td>${b.service || ''}</td>
        <td>${b.phone || ''}</td>
        <td>
          <button class="ghost">ลบ/แก้ไขคิว</button>
        </td>
      `;

      tr.querySelector('button').addEventListener('click', () => {
        openEditModal(b);
      });

      list.appendChild(tr);
    });
}

/* =========================
   SUMMARY (BASIC)
========================= */
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
   EDIT MODAL (DEVELOP)
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

document.getElementById('saveEdit').addEventListener('click', async () => {
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
  loadBookings();
});

document.getElementById('deleteEdit').addEventListener('click', async () => {
  if (!confirm('ยืนยันการลบคิวนี้?')) return;

  await fetch(`${API}/bookings/${editingId}`, {
    method: 'DELETE'
  });

  closeEditModal();
  loadBookings();
});

document.getElementById('closeEdit').addEventListener('click', closeEditModal);

function closeEditModal() {
  editOverlay.classList.add('hidden');
  editingId = null;
}

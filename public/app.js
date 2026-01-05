/* =========================
   CONFIG / STATE
========================= */
const API = '';

let bookings = [];
let currentDate = '';
let currentStylist = 'Bank';
let editingId = null;

/* =========================
   LOGIN
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

logoutBtn.onclick = () => {
  loginOverlay.classList.remove('hidden');
};

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
  };

  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
      renderTable();
      updateSummary();
    };
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
   LOAD BOOKINGS
========================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${currentDate}`);
  bookings = await res.json();
  renderTable();
  updateSummary();
}

/* =========================
   RENDER TABLE
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
        <td><span class="badge stylist-${b.stylist.toLowerCase()}">${b.stylist}</span></td>
        <td>${b.gender === 'male' ? '👨' : '👩'}</td>
        <td>${b.name}</td>
        <td>${b.service || ''}</td>
        <td>${b.phone || ''}</td>
        <td><button class="ghost">ลบ/แก้ไขคิว</button></td>
      `;
      tr.querySelector('button').onclick = () => openEdit(b);
      list.appendChild(tr);
    });
}

/* =========================
   SUMMARY
========================= */
function updateSummary() {
  const bank = bookings.filter(b => b.stylist === 'Bank').length;
  const sindy = bookings.filter(b => b.stylist === 'Sindy').length;
  const assist = bookings.filter(b => b.stylist === 'Assist').length;

  document.getElementById('countBank').textContent = bank;
  document.getElementById('countSindy').textContent = sindy;
  document.getElementById('countAssist').textContent = assist;
  document.getElementById('countTotal').textContent = bank + sindy + assist;
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
const saveEdit = document.getElementById('saveEdit');
const deleteEdit = document.getElementById('deleteEdit');
const closeEditBtn = document.getElementById('closeEdit');

function openEdit(b) {
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

saveEdit.onclick = async () => {
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
  closeEdit();
  loadBookings();
};

deleteEdit.onclick = async () => {
  if (!confirm('ยืนยันการลบคิวนี้?')) return;

  await fetch(`${API}/bookings/${editingId}`, { method: 'DELETE' });
  closeEdit();
  loadBookings();
};

closeEditBtn.onclick = closeEdit;

function closeEdit() {
  editOverlay.classList.add('hidden');
  editingId = null;
}

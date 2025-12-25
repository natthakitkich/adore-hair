// ===============================
// CONFIG
// ===============================
const API_BASE = '/api/bookings';
const PIN_CODE = '1234'; // แก้เป็น PIN จริงถ้าต้องการ

// ===============================
// STATE
// ===============================
let selectedDate = '';
let selectedStylist = 'Bank';
let selectedGender = '';
let bookings = [];

// ===============================
// ELEMENTS
// ===============================
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');

const dateInput = document.getElementById('date');
const tabs = document.querySelectorAll('.tab');

const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const timeSelect = document.getElementById('time');
const serviceInput = document.getElementById('service');
const submitBtn = document.getElementById('submitBtn');
const refreshBtn = document.getElementById('refreshBtn');

const listEl = document.getElementById('list');
const msgEl = document.getElementById('msg');

const countBank = document.getElementById('countMale') || document.getElementById('countBank');
const countSindy = document.getElementById('countFemale') || document.getElementById('countSindy');
const countAssist = document.getElementById('countAssist');
const countTotal = document.getElementById('countTotal');

const calGrid = document.getElementById('calGrid');
const calTitle = document.getElementById('calTitle');

// ===============================
// LOGIN
// ===============================
loginBtn.onclick = () => {
  if (pinInput.value === PIN_CODE) {
    loginOverlay.style.display = 'none';
    init();
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
};

// ===============================
// INIT
// ===============================
function init() {
  selectedDate = dateInput.value || today();
  dateInput.value = selectedDate;

  buildTimeOptions();
  bindEvents();
  loadBookings();
  buildCalendar();
}

// ===============================
// EVENTS
// ===============================
function bindEvents() {
  dateInput.onchange = () => {
    selectedDate = dateInput.value;
    loadBookings();
  };

  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedStylist = tab.dataset.tab;
      loadBookings();
    };
  });

  document.querySelectorAll('input[name="gender"]').forEach(radio => {
    radio.onchange = () => selectedGender = radio.value;
  });

  refreshBtn.onclick = loadBookings;
}

// ===============================
// TIME OPTIONS
// ===============================
function buildTimeOptions() {
  timeSelect.innerHTML = '<option value="">เลือกเวลา</option>';
  for (let h = 13; h <= 22; h++) {
    const t = `${String(h).padStart(2, '0')}:00`;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  }
}

// ===============================
// LOAD BOOKINGS
// ===============================
async function loadBookings() {
  listEl.innerHTML = '';
  msgEl.textContent = 'กำลังโหลด...';

  try {
    const res = await fetch(`${API_BASE}?date=${selectedDate}`);
    bookings = await res.json();

    renderTable();
    renderSummary();
    renderCalendarDots();

    msgEl.textContent = '';
  } catch (e) {
    msgEl.textContent = 'โหลดข้อมูลไม่สำเร็จ';
  }
}

// ===============================
// RENDER TABLE
// ===============================
function renderTable() {
  listEl.innerHTML = '';

  bookings
    .filter(b => b.stylist === selectedStylist)
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.time}</td>
        <td>
          <span class="badge">${b.stylist}</span>
          <span class="badge">${b.gender === 'male' ? 'ชาย' : 'หญิง'}</span>
        </td>
        <td>${b.name}</td>
        <td>${b.service || '-'}</td>
        <td>
          <a href="tel:${b.phone}">${b.phone}</a>
        </td>
        <td>
          <button onclick="deleteBooking(${b.id})">ลบ</button>
        </td>
      `;
      listEl.appendChild(tr);
    });
}

// ===============================
// SUMMARY
// ===============================
function renderSummary() {
  const bank = bookings.filter(b => b.stylist === 'Bank').length;
  const sindy = bookings.filter(b => b.stylist === 'Sindy').length;
  const assist = bookings.filter(b => b.stylist === 'Assist').length;

  if (countBank) countBank.textContent = bank;
  if (countSindy) countSindy.textContent = sindy;
  if (countAssist) countAssist.textContent = assist;
  if (countTotal) countTotal.textContent = bank + sindy + assist;
}

// ===============================
// SUBMIT
// ===============================
document.getElementById('bookingForm').onsubmit = async e => {
  e.preventDefault();

  if (!nameInput.value || !timeSelect.value || !selectedGender) {
    msgEl.textContent = 'กรอกข้อมูลให้ครบ';
    return;
  }

  const payload = {
    date: selectedDate,
    time: timeSelect.value,
    name: nameInput.value,
    phone: phoneInput.value || '0',
    service: serviceInput.value || '',
    stylist: selectedStylist,
    gender: selectedGender
  };

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error();

    nameInput.value = '';
    phoneInput.value = '';
    serviceInput.value = '';
    timeSelect.value = '';
    document.querySelectorAll('input[name="gender"]').forEach(r => r.checked = false);
    selectedGender = '';

    loadBookings();
  } catch {
    msgEl.textContent = 'บันทึกไม่สำเร็จ';
  }
};

// ===============================
// DELETE
// ===============================
async function deleteBooking(id) {
  if (!confirm('ลบคิวนี้?')) return;
  await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  loadBookings();
}

// ===============================
// CALENDAR (SAFE MODE)
// ===============================
function buildCalendar() {
  if (!calGrid) return;
  calGrid.innerHTML = '';
  calTitle.textContent = 'เดือนปัจจุบัน';
}

function renderCalendarDots() {
  // ใช้ข้อมูล bookings ที่โหลดมา
  // ถ้ามีอย่างน้อย 1 ราย = ถือว่ามีคิว
}

// ===============================
// UTIL
// ===============================
function today() {
  return new Date().toISOString().slice(0, 10);
}

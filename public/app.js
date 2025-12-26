/* =========================
   GLOBAL STATE
========================= */
const TZ = 'Asia/Bangkok';

let todayDate = '';
let selectedDate = '';
let currentStylist = 'Bank';

/* =========================
   ELEMENTS
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const pinInput = document.getElementById('pin');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');

const dateInput = document.getElementById('date');
const calendarTitle = document.getElementById('calendarTitle');
const calendarDays = document.getElementById('calendarDays');

const tabs = document.querySelectorAll('.tab');

const bookingForm = document.getElementById('bookingForm');
const timeSelect = document.getElementById('time');
const listTable = document.getElementById('list');
const msg = document.getElementById('msg');

/* =========================
   INIT
========================= */
init();

function init() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  todayDate = now.toISOString().slice(0, 10);
  selectedDate = todayDate;

  dateInput.value = todayDate;

  buildTimeSlots();
  loadCalendar();
  loadBookings(selectedDate);
}

/* =========================
   LOGIN (simple PIN)
========================= */
loginBtn.onclick = () => {
  if (!pinInput.value || pinInput.value.length < 4) {
    loginMsg.textContent = 'กรุณาใส่ PIN ให้ถูกต้อง';
    return;
  }
  loginOverlay.style.display = 'none';
};

pinInput.addEventListener('input', () => {
  pinInput.value = pinInput.value.replace(/\D/g, '');
});

/* =========================
   TIME SLOTS 13:00–22:00
========================= */
function buildTimeSlots() {
  timeSelect.innerHTML = '<option value="">เลือกเวลา</option>';
  for (let h = 13; h <= 22; h++) {
    const t = String(h).padStart(2, '0') + ':00';
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  }
}

/* =========================
   CALENDAR
========================= */
async function loadCalendar() {
  // ดึง booking ทั้งหมด
  const res = await fetch('/bookings');
  const allBookings = await res.json();

  calendarDays.innerHTML = '';

  const d = new Date(selectedDate);
  const year = d.getFullYear();
  const month = d.getMonth();

  calendarTitle.textContent = d.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric'
  });

  // สร้าง map: date => จำนวนคิว (Bank + Sindy)
  const countMap = {};
  allBookings.forEach(b => {
    if (b.stylist === 'Bank' || b.stylist === 'Sindy') {
      countMap[b.date] = (countMap[b.date] || 0) + 1;
    }
  });

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // ช่องว่างก่อนวันแรก
  for (let i = 0; i < firstDay; i++) {
    calendarDays.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateStr =
      `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const cell = document.createElement('div');
    cell.className = 'calCell';
    cell.innerHTML = `<div class="calNum">${day}</div>`;

    // today / selected
    if (dateStr === todayDate) cell.classList.add('today');
    if (dateStr === selectedDate) cell.classList.add('selected');

    // ✅ density color
    const count = countMap[dateStr] || 0;
    if (count > 0) {
      const level = Math.min(5, Math.ceil((count / 20) * 5));
      cell.dataset.level = level; // ให้ CSS ทำสี
    }

    cell.onclick = () => {
      selectedDate = dateStr;
      dateInput.value = selectedDate;
      loadCalendar();
      loadBookings(selectedDate);
    };

    calendarDays.appendChild(cell);
  }
}


/* =========================
   LOAD BOOKINGS
========================= */
async function loadBookings(date) {
  const res = await fetch(`/bookings?date=${date}`);
  const data = await res.json();

  renderTable(data);
  renderSummary(data);
}

/* =========================
   TABLE
========================= */
function renderTable(list) {
  listTable.innerHTML = '';

  list.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time}</td>
      <td>${b.stylist}</td>
      <td>${b.gender}</td>
      <td>${b.name}</td>
      <td>${b.service || ''}</td>
      <td>${b.phone || ''}</td>
      <td><button data-id="${b.id}">ลบ</button></td>
    `;
    listTable.appendChild(tr);
  });

  // delete
  listTable.querySelectorAll('button').forEach(btn => {
    btn.onclick = async () => {
      await fetch(`/bookings/${btn.dataset.id}`, { method: 'DELETE' });
      loadBookings(selectedDate);
      loadCalendar();
    };
  });
}

/* =========================
   SUMMARY
========================= */
function renderSummary(list) {
  const bank = list.filter(b => b.stylist === 'Bank').length;
  const sindy = list.filter(b => b.stylist === 'Sindy').length;
  const assist = list.filter(b => b.stylist === 'Assist').length;

  document.getElementById('sumBank').textContent = bank;
  document.getElementById('sumSindy').textContent = sindy;
  document.getElementById('sumAssist').textContent = assist;
  document.getElementById('sumTotal').textContent =
    bank + sindy + assist;
}

/* =========================
   STYLIST TAB
========================= */
tabs.forEach(tab => {
  tab.onclick = () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentStylist = tab.dataset.tab;
  };
});

/* =========================
   SUBMIT BOOKING
========================= */
bookingForm.onsubmit = async e => {
  e.preventDefault();

  const gender = bookingForm.gender.value;

  const payload = {
    date: selectedDate,
    time: timeSelect.value,
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    stylist: currentStylist,
    gender,
    service: document.getElementById('service').value
  };

  const res = await fetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    bookingForm.reset();
    buildTimeSlots();
    loadBookings(selectedDate);
    loadCalendar();
    msg.textContent = 'บันทึกแล้ว';
  } else {
    msg.textContent = 'เกิดข้อผิดพลาด';
  }
};

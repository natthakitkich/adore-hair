/* =========================
   CONFIG
========================= */
const PIN_CODE = '1234';
const START_HOUR = 13;
const END_HOUR = 22;

/* =========================
   STATE
========================= */
let selectedDate = null;
let selectedStylist = 'Bank';
let selectedGender = null;
let bookings = [];
let calendarDates = []; // <<< วันที่ที่มีคิว

/* =========================
   ELEMENTS
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');

const dateInput = document.getElementById('date');
const timeSelect = document.getElementById('time');
const form = document.getElementById('bookingForm');
const msg = document.getElementById('msg');

const listEl = document.getElementById('list');
const calendarEl = document.getElementById('calendarDays');

const countBank = document.getElementById('countBank');
const countSindy = document.getElementById('countSindy');
const countAssist = document.getElementById('countAssist');
const countTotal = document.getElementById('countTotal');

const stylistBtns = document.querySelectorAll('.tab');

/* =========================
   LOGIN
========================= */
loginBtn.onclick = () => {
  if (pinInput.value === PIN_CODE) {
    loginOverlay.style.display = 'none';
    init();
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
};

/* =========================
   INIT
========================= */
function init() {
  selectedDate = new Date().toISOString().slice(0, 10);
  dateInput.value = selectedDate;

  bindEvents();
  loadAll();
}

/* =========================
   EVENTS
========================= */
function bindEvents() {
  dateInput.onchange = () => {
    selectedDate = dateInput.value;
    loadAll();
  };

  stylistBtns.forEach(btn => {
    btn.onclick = () => {
      stylistBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedStylist = btn.dataset.tab;
      loadSlots();
    };
  });

  document.querySelectorAll('input[name="gender"]').forEach(r => {
    r.onchange = () => (selectedGender = r.value);
  });

  form.onsubmit = submitBooking;
}

/* =========================
   LOAD DATA
========================= */
async function loadAll() {
  await loadCalendar();
  await loadBookings();
  await loadSlots();
  renderCalendar();
  renderTable();
  renderSummary();
}

/* ---------- CALENDAR ---------- */
async function loadCalendar() {
  const res = await fetch('/calendar');
  calendarDates = await res.json(); // ['2025-12-25', '2025-12-31']
}

/* ---------- BOOKINGS ---------- */
async function loadBookings() {
  const res = await fetch(`/bookings?date=${selectedDate}`);
  bookings = await res.json();
}

/* ---------- SLOTS ---------- */
async function loadSlots() {
  const res = await fetch(`/slots?date=${selectedDate}`);
  const { slots } = await res.json();

  timeSelect.innerHTML = `<option value="">เลือกเวลา</option>`;

  for (let h = START_HOUR; h <= END_HOUR; h++) {
    const t = `${String(h).padStart(2, '0')}:00`;
    const disabled = slots[t]?.[selectedStylist];

    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    if (disabled) opt.disabled = true;

    timeSelect.appendChild(opt);
  }
}

/* =========================
   SUBMIT
========================= */
async function submitBooking(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim() || '0';
  const time = timeSelect.value;
  const service = document.getElementById('service').value.trim();

  if (!name || !time || !selectedGender || !selectedStylist) {
    msg.textContent = 'กรอกข้อมูลไม่ครบ';
    return;
  }

  const res = await fetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: selectedDate,
      time,
      name,
      phone,
      stylist: selectedStylist,
      gender: selectedGender,
      service
    })
  });

  const result = await res.json();
  if (result.error) {
    msg.textContent = result.error;
    return;
  }

  msg.textContent = 'บันทึกสำเร็จ';
  form.reset();
  selectedGender = null;

  loadAll();
}

/* =========================
   RENDER
========================= */

/* ---------- CALENDAR UI ---------- */
function renderCalendar() {
  if (!calendarEl) return;

  calendarEl.querySelectorAll('[data-date]').forEach(el => {
    const d = el.dataset.date;
    el.classList.toggle('has-booking', calendarDates.includes(d));
  });
}

/* ---------- TABLE ---------- */
function renderTable() {
  listEl.innerHTML = '';

  bookings.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time}</td>
      <td>
        <span class="badge">${b.stylist}</span>
        <span class="badge muted">${b.gender}</span>
      </td>
      <td>${b.name}</td>
      <td>${b.service || '-'}</td>
      <td>${b.phone}</td>
      <td>
        <button onclick="deleteBooking('${b.id}')">ลบ</button>
      </td>
    `;
    listEl.appendChild(tr);
  });
}

/* ---------- SUMMARY ---------- */
function renderSummary() {
  const bank = bookings.filter(b => b.stylist === 'Bank').length;
  const sindy = bookings.filter(b => b.stylist === 'Sindy').length;
  const assist = bookings.filter(b => b.stylist === 'Assist').length;

  countBank.textContent = bank;
  countSindy.textContent = sindy;
  countAssist.textContent = assist;
  countTotal.textContent = bookings.length;
}

/* =========================
   DELETE
========================= */
async function deleteBooking(id) {
  await fetch(`/bookings/${id}`, { method: 'DELETE' });
  loadAll();
}

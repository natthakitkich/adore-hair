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
let selectedStylist = null;
let selectedGender = null;
let bookings = [];

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

      // ✅ ใช้ text ปุ่มตรง ๆ (ไม่มีวันพัง)
      selectedStylist = btn.textContent.trim();

      loadSlots();
    };
  });

  document.querySelectorAll('input[name="gender"]').forEach(r => {
    r.onchange = () => {
      selectedGender = r.value;
    };
  });

  form.onsubmit = submitBooking;
}

/* =========================
   LOAD DATA
========================= */
async function loadAll() {
  await loadBookings();
  await loadSlots();
  renderTable();
  renderSummary();
}

async function loadBookings() {
  const res = await fetch(`/bookings?date=${selectedDate}`);
  bookings = await res.json();
}

async function loadSlots() {
  timeSelect.innerHTML = `<option value="">เลือกเวลา</option>`;

  if (!selectedStylist) return;

  const res = await fetch(`/slots?date=${selectedDate}`);
  const { slots } = await res.json();

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

  if (!selectedStylist) {
    msg.textContent = 'กรุณาเลือกช่าง';
    return;
  }

  if (!name || !time || !selectedGender) {
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
  timeSelect.value = '';

  loadAll();
}

/* =========================
   DELETE
========================= */
async function deleteBooking(id) {
  if (!confirm('ลบคิวนี้?')) return;

  await fetch(`/bookings/${id}`, { method: 'DELETE' });
  loadAll();
}

/* =========================
   RENDER
========================= */
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
      <td><a href="tel:${b.phone}">${b.phone}</a></td>
      <td>
        <button onclick="deleteBooking(${b.id})">ลบ</button>
      </td>
    `;
    listEl.appendChild(tr);
  });
}

function renderSummary() {
  countBank.textContent = bookings.filter(b => b.stylist === 'Bank').length;
  countSindy.textContent = bookings.filter(b => b.stylist === 'Sindy').length;
  countAssist.textContent = bookings.filter(b => b.stylist === 'Assist').length;
  countTotal.textContent = bookings.length;
}

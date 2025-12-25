const API_BASE = '';

/* =========================
   STATE
========================= */
let selectedDate = '';
let selectedStylist = 'Bank';
let selectedGender = '';
let editingId = null;

/* =========================
   ELEMENTS
========================= */
const dateEl = document.getElementById('date');
const timeEl = document.getElementById('time');
const nameEl = document.getElementById('name');
const phoneEl = document.getElementById('phone');
const serviceEl = document.getElementById('service');
const formEl = document.getElementById('bookingForm');
const msgEl = document.getElementById('msg');
const listEl = document.getElementById('list');

const countBankEl = document.getElementById('countBank');
const countSindyEl = document.getElementById('countSindy');
const countAssistEl = document.getElementById('countAssist');
const countTotalEl = document.getElementById('countTotal');
const summaryHintEl = document.getElementById('summaryHint');

const calGridEl = document.getElementById('calGrid');
const calTitleEl = document.getElementById('calTitle');

/* =========================
   INIT
========================= */
init();

function init() {
  const today = new Date().toISOString().slice(0, 10);
  dateEl.value = today;
  selectedDate = today;

  renderCalendar();
  loadDay();

  dateEl.addEventListener('change', () => {
    selectedDate = dateEl.value;
    renderCalendar();
    loadDay();
  });

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedStylist = btn.textContent.trim();
      loadSlots();
    });
  });

  document.querySelectorAll('input[name="gender"]').forEach(radio => {
    radio.addEventListener('change', () => {
      selectedGender = radio.value;
    });
  });
}

/* =========================
   CALENDAR
========================= */
async function renderCalendar() {
  calGridEl.innerHTML = '';
  const base = new Date(selectedDate);
  const year = base.getFullYear();
  const month = base.getMonth();

  calTitleEl.textContent = base.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calGridEl.appendChild(document.createElement('div'));
  }

  const { data } = await fetch(`${API_BASE}/bookings`).then(r => r.json());

  const bookedDates = new Set(data.map(b => b.date));

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('button');
    cell.className = 'calDay';
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cell.textContent = d;

    if (bookedDates.has(dateStr)) {
      cell.classList.add('hasBooking');
    }

    if (dateStr === selectedDate) {
      cell.classList.add('active');
    }

    cell.onclick = () => {
      selectedDate = dateStr;
      dateEl.value = dateStr;
      renderCalendar();
      loadDay();
    };

    calGridEl.appendChild(cell);
  }
}

/* =========================
   LOAD DAY
========================= */
async function loadDay() {
  await loadSlots();
  await loadBookings();
}

/* =========================
   TIME SLOTS
========================= */
async function loadSlots() {
  timeEl.innerHTML = '<option value="">เลือกเวลา</option>';

  const res = await fetch(`${API_BASE}/slots?date=${selectedDate}`);
  const { slots } = await res.json();

  Object.keys(slots).forEach(time => {
    const disabled = slots[time][selectedStylist];
    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time;
    if (disabled) opt.disabled = true;
    timeEl.appendChild(opt);
  });
}

/* =========================
   BOOKINGS LIST
========================= */
async function loadBookings() {
  const res = await fetch(`${API_BASE}/bookings?date=${selectedDate}`);
  const data = await res.json();

  listEl.innerHTML = '';

  let countBank = 0;
  let countSindy = 0;
  let countAssist = 0;

  data.forEach(b => {
    if (b.stylist === 'Bank') countBank++;
    if (b.stylist === 'Sindy') countSindy++;
    if (b.stylist === 'Assist') countAssist++;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time}</td>
      <td>
        <span class="badge">${b.stylist}</span>
        <span class="badge muted">${b.gender === 'male' ? 'ชาย' : 'หญิง'}</span>
      </td>
      <td>${b.name}</td>
      <td>${b.service}</td>
      <td><a href="tel:${b.phone}">${b.phone}</a></td>
      <td></td>
    `;
    listEl.appendChild(tr);
  });

  countBankEl.textContent = countBank;
  countSindyEl.textContent = countSindy;
  countAssistEl.textContent = countAssist;
  countTotalEl.textContent = countBank + countSindy + countAssist;
  summaryHintEl.textContent = `${countTotalEl.textContent} คิว`;
}

/* =========================
   SUBMIT
========================= */
formEl.onsubmit = async e => {
  e.preventDefault();
  msg('');

  if (!selectedGender) {
    return msg('กรุณาเลือกเพศลูกค้า');
  }

  const payload = {
    date: selectedDate,
    time: timeEl.value,
    name: nameEl.value.trim(),
    phone: phoneEl.value || '0',
    stylist: selectedStylist,
    gender: selectedGender,
    service: serviceEl.value.trim(),
  };

  if (!payload.time || !payload.name || !payload.service) {
    return msg('กรุณากรอกข้อมูลให้ครบ');
  }

  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await res.json();

  if (!res.ok) {
    return msg(result.error || 'เกิดข้อผิดพลาด');
  }

  formEl.reset();
  selectedGender = '';
  loadDay();
  renderCalendar();
  msg('บันทึกเรียบร้อย');
};

/* =========================
   MSG
========================= */
function msg(text) {
  msgEl.textContent = text;
}

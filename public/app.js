const PIN_CODE = '1234';
const START_HOUR = 13;
const END_HOUR = 22;

let selectedDate = '';
let selectedStylist = 'Bank';
let bookings = [];

/* elements */
const calGrid = document.getElementById('calGrid');
const calTitle = document.getElementById('calTitle');
const dateInput = document.getElementById('date');
const timeSelect = document.getElementById('time');
const listEl = document.getElementById('list');
const msg = document.getElementById('msg');

const stylistBtns = document.querySelectorAll('.tab');

/* init */
document.getElementById('loginBtn').onclick = () => {
  if (document.getElementById('pin').value === PIN_CODE) {
    document.getElementById('loginOverlay').style.display = 'none';
    init();
  }
};

function init() {
  selectedDate = new Date().toISOString().slice(0, 10);
  dateInput.value = selectedDate;

  bindEvents();
  loadAll();
  renderCalendar();
}

/* events */
function bindEvents() {
  dateInput.onchange = () => {
    selectedDate = dateInput.value;
    loadAll();
  };

  stylistBtns.forEach(btn => {
    btn.onclick = () => {
      stylistBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedStylist = btn.textContent.trim();
      loadSlots();
    };
  });

  document.getElementById('bookingForm').onsubmit = submitBooking;
}

/* calendar */
async function renderCalendar() {
  const now = new Date(selectedDate);
  const month = now.toISOString().slice(0, 7);
  calTitle.textContent = month;

  const res = await fetch(`/calendar?month=${month}`);
  const { days } = await res.json();

  calGrid.innerHTML = '';
  const firstDay = new Date(`${month}-01`).getDay();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calGrid.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'calDay';
    cell.textContent = d;

    if (days.includes(dateStr)) cell.classList.add('hasBooking');

    cell.onclick = () => {
      selectedDate = dateStr;
      dateInput.value = dateStr;
      loadAll();
    };

    calGrid.appendChild(cell);
  }
}

/* data */
async function loadAll() {
  await loadBookings();
  await loadSlots();
  renderTable();
}

async function loadBookings() {
  const res = await fetch(`/bookings?date=${selectedDate}`);
  bookings = await res.json();
}

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

/* submit */
async function submitBooking(e) {
  e.preventDefault();

  const gender = document.querySelector('input[name="gender"]:checked')?.value;
  const body = {
    date: selectedDate,
    time: timeSelect.value,
    name: name.value,
    phone: phone.value || '0',
    stylist: selectedStylist,
    gender,
    service: service.value
  };

  const res = await fetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const result = await res.json();
  msg.textContent = result.error || 'บันทึกสำเร็จ';

  loadAll();
  renderCalendar();
}

/* render table */
function renderTable() {
  listEl.innerHTML = '';
  bookings.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time}</td>
      <td>${b.stylist} / ${b.gender}</td>
      <td>${b.name}</td>
      <td>${b.service}</td>
      <td>${b.phone}</td>
      <td><button onclick="deleteBooking(${b.id})">ลบ</button></td>
    `;
    listEl.appendChild(tr);
  });
}

async function deleteBooking(id) {
  await fetch(`/bookings/${id}`, { method: 'DELETE' });
  loadAll();
  renderCalendar();
}

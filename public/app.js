/* =========================
   GLOBAL STATE
========================= */
let selectedDate = null;
let selectedStylist = 'Bank';
let selectedGender = null;

/* =========================
   ELEMENTS
========================= */
const dateInput = document.getElementById('datePicker');
const formEl = document.getElementById('bookingForm');
const timeSelect = document.getElementById('timeSelect');
const summaryBank = document.getElementById('summaryBank');
const summarySindy = document.getElementById('summarySindy');
const summaryAssist = document.getElementById('summaryAssist');
const summaryTotal = document.getElementById('summaryTotal');
const tableBody = document.getElementById('bookingTableBody');

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
  selectedDate = dateInput.value;
  loadAll();
});

/* =========================
   LOAD ALL DATA
========================= */
async function loadAll() {
  if (!selectedDate) return;
  await loadSlots();
  await loadBookings();
}

/* =========================
   DATE CHANGE
========================= */
dateInput.addEventListener('change', e => {
  selectedDate = e.target.value;
  loadAll();
});

/* =========================
   STYLIST BUTTONS
========================= */
document.querySelectorAll('.stylist-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.stylist-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedStylist = btn.dataset.stylist;
    loadSlots();
  });
});

/* =========================
   GENDER RADIO
========================= */
document.querySelectorAll('input[name="gender"]').forEach(radio => {
  radio.addEventListener('change', e => {
    selectedGender = e.target.value;
  });
});

/* =========================
   LOAD SLOTS
========================= */
async function loadSlots() {
  timeSelect.innerHTML = '<option value="">เลือกเวลา</option>';

  const res = await fetch(`/slots?date=${selectedDate}`);
  const { slots } = await res.json();

  Object.keys(slots).forEach(time => {
    if (!slots[time][selectedStylist]) {
      const opt = document.createElement('option');
      opt.value = time;
      opt.textContent = time;
      timeSelect.appendChild(opt);
    }
  });
}

/* =========================
   LOAD BOOKINGS
========================= */
async function loadBookings() {
  tableBody.innerHTML = '';

  const res = await fetch(`/bookings?date=${selectedDate}`);
  const data = await res.json();

  let bank = 0, sindy = 0, assist = 0;

  data.forEach(b => {
    if (b.stylist === 'Bank') bank++;
    if (b.stylist === 'Sindy') sindy++;
    if (b.stylist === 'Assist') assist++;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time}</td>
      <td>
        <span class="badge stylist">${b.stylist}</span>
        <span class="badge gender">${b.gender}</span>
      </td>
      <td>${b.name}</td>
      <td>${b.service || '-'}</td>
      <td>
        ${b.phone && b.phone !== '0'
          ? `<a href="tel:${b.phone}">${b.phone}</a>`
          : '-'}
      </td>
      <td>-</td>
    `;
    tableBody.appendChild(tr);
  });

  summaryBank.textContent = bank;
  summarySindy.textContent = sindy;
  summaryAssist.textContent = assist;
  summaryTotal.textContent = bank + sindy + assist;
}

/* =========================
   SUBMIT BOOKING
========================= */
formEl.addEventListener('submit', async e => {
  e.preventDefault();

  const name = formEl.name.value.trim();
  const phone = formEl.phone.value.trim() || '0';
  const time = formEl.time.value;
  const service = formEl.service.value.trim();

  if (!name || !time || !selectedGender) {
    alert('กรุณากรอกข้อมูลให้ครบ');
    return;
  }

  const payload = {
    date: selectedDate,
    time,
    name,
    phone,
    stylist: selectedStylist,
    gender: selectedGender,
    service
  };

  const res = await fetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await res.json();

  if (result.error) {
    alert(result.error);
    return;
  }

  formEl.reset();
  selectedGender = null;
  loadAll();
});

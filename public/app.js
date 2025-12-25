/* =========================
   ELEMENTS
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

const dateInput = document.getElementById('date');
const formEl = document.getElementById('bookingForm');
const listEl = document.getElementById('list');
const msgEl = document.getElementById('msg');

const countMale = document.getElementById('countMale');
const countFemale = document.getElementById('countFemale');
const countTotal = document.getElementById('countTotal');
const summaryHint = document.getElementById('summaryHint');

/* =========================
   STATE
========================= */
const PIN_CODE = '1234';
let selectedStylist = 'Bank';

/* =========================
   LOGIN
========================= */
loginBtn.onclick = () => {
  if (pinInput.value === PIN_CODE) {
    loginOverlay.style.display = 'none';
    loadBookings();
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
};

logoutBtn.onclick = () => location.reload();

/* =========================
   DATE INIT
========================= */
dateInput.value = new Date().toISOString().slice(0, 10);
dateInput.onchange = loadBookings;

/* =========================
   STYLIST BUTTONS
========================= */
document.querySelectorAll('.tab').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedStylist = btn.textContent.trim();
  };
});

/* =========================
   LOAD BOOKINGS
========================= */
async function loadBookings() {
  listEl.innerHTML = '';
  msgEl.textContent = '';

  try {
    const res = await fetch(`/bookings?date=${dateInput.value}`);
    const data = await res.json();

    let male = 0, female = 0;

    data.forEach(b => {
      if (b.gender === 'male') male++;
      if (b.gender === 'female') female++;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.time.slice(0,5)}</td>
        <td>${b.stylist} / ${b.gender}</td>
        <td>${b.name}</td>
        <td>${b.service}</td>
        <td>${b.phone}</td>
        <td>-</td>
      `;
      listEl.appendChild(tr);
    });

    countMale.textContent = male;
    countFemale.textContent = female;
    countTotal.textContent = data.length;
    summaryHint.textContent = data.length ? 'มีคิว' : '-';

  } catch (err) {
    msgEl.textContent = 'โหลดข้อมูลไม่สำเร็จ';
  }
}

/* =========================
   SUBMIT BOOKING
========================= */
formEl.onsubmit = async e => {
  e.preventDefault();

  const gender = document.querySelector('input[name="gender"]:checked')?.value;
  if (!gender) {
    msgEl.textContent = 'กรุณาเลือกเพศ';
    return;
  }

  const payload = {
    date: dateInput.value,
    time: time.value,
    name: name.value,
    phone: phone.value || '0',
    stylist: selectedStylist,
    gender,
    service: service.value
  };

  const res = await fetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await res.json();
  if (!res.ok) {
    msgEl.textContent = result.error || 'บันทึกไม่สำเร็จ';
    return;
  }

  formEl.reset();
  loadBookings();
};

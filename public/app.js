// =====================
// CONFIG
// =====================
const API_BASE = '/api';
const PIN_CODE = '1234'; // เปลี่ยนได้

// =====================
// ELEMENTS
// =====================
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

const dateInput = document.getElementById('date');
const formEl = document.getElementById('bookingForm');
const listEl = document.getElementById('list');
const msgEl = document.getElementById('msg');

const calGrid = document.getElementById('calGrid');
const calTitle = document.getElementById('calTitle');

const countMale = document.getElementById('countMale');
const countFemale = document.getElementById('countFemale');
const countTotal = document.getElementById('countTotal');
const summaryHint = document.getElementById('summaryHint');

// =====================
// STATE
// =====================
let loggedIn = false;
let selectedStylist = 'Bank';

// =====================
// LOGIN
// =====================
loginBtn.onclick = () => {
  if (pinInput.value === PIN_CODE) {
    loggedIn = true;
    loginOverlay.style.display = 'none';
    loadAll();
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
};

logoutBtn.onclick = () => {
  loggedIn = false;
  location.reload();
};

// =====================
// DATE INIT
// =====================
const today = new Date().toISOString().slice(0, 10);
dateInput.value = today;

// =====================
// STYLIST TABS
// =====================
document.querySelectorAll('.tab').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedStylist = btn.dataset.tab === 'male'
      ? 'Bank'
      : btn.dataset.tab === 'female'
      ? 'Sindy'
      : 'Assist';
  };
});

// =====================
// LOAD ALL
// =====================
async function loadAll() {
  await loadBookings();
  await loadCalendar();
}

// =====================
// LOAD BOOKINGS (TABLE)
// =====================
async function loadBookings() {
  listEl.innerHTML = '';
  msgEl.textContent = '';

  try {
    const res = await fetch(`${API_BASE}/bookings?date=${dateInput.value}`);
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
        <td>${b.note || ''}</td>
        <td>${b.phone}</td>
        <td>
          <button data-id="${b.id}" class="ghost deleteBtn">ลบ</button>
        </td>
      `;
      listEl.appendChild(tr);
    });

    countMale.textContent = male;
    countFemale.textContent = female;
    countTotal.textContent = data.length;
    summaryHint.textContent = data.length ? 'มีคิว' : '-';

    document.querySelectorAll('.deleteBtn').forEach(btn => {
      btn.onclick = async () => {
        await fetch(`${API_BASE}/bookings/${btn.dataset.id}`, { method: 'DELETE' });
        loadAll();
      };
    });

  } catch (e) {
    msgEl.textContent = 'โหลดข้อมูลไม่สำเร็จ';
  }
}

// =====================
// LOAD CALENDAR
// =====================
async function loadCalendar() {
  calGrid.innerHTML = '';
  const month = dateInput.value.slice(0,7);

  const res = await fetch(`${API_BASE}/calendar?month=${month}`);
  const days = await res.json();

  const [y, m] = month.split('-');
  calTitle.textContent = `${new Date(y, m-1).toLocaleString('th-TH', { month: 'long' })} ${parseInt(y)+543}`;

  days.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'calDay';
    if (d.hasBooking) cell.classList.add('hasBooking');
    cell.textContent = d.day;
    calGrid.appendChild(cell);
  });
}

// =====================
// SUBMIT FORM
// =====================
formEl.onsubmit = async (e) => {
  e.preventDefault();

  const payload = {
    date: dateInput.value,
    name: name.value,
    phone: phone.value || '0',
    service: service.value,
    note: note.value,
    time: time.value,
    stylist: selectedStylist,
    gender: document.querySelector('input[name="gender"]:checked')?.value
  };

  if (!payload.gender) {
    msgEl.textContent = 'กรุณาเลือกเพศ';
    return;
  }

  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    msgEl.textContent = err;
    return;
  }

  formEl.reset();
  loadAll();
};

// =====================
// DATE CHANGE
// =====================
dateInput.onchange = loadAll;

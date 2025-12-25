const PIN = '1234';
let selectedDate;
let selectedStylist = 'Bank';
let selectedGender = null;

const loginOverlay = document.getElementById('loginOverlay');
const dateInput = document.getElementById('date');
const timeSelect = document.getElementById('time');
const list = document.getElementById('list');
const calendar = document.getElementById('calendarDays');
const msg = document.getElementById('msg');

document.getElementById('loginBtn').onclick = () => {
  if (document.getElementById('pin').value === PIN) {
    loginOverlay.style.display = 'none';
    init();
  }
};

function init() {
  selectedDate = new Date().toISOString().slice(0,10);
  dateInput.value = selectedDate;

  loadAll();
  bind();
}

function bind() {
  dateInput.onchange = () => {
    selectedDate = dateInput.value;
    loadAll();
  };

  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedStylist = btn.dataset.stylist;
      loadSlots();
    };
  });

  document.querySelectorAll('[name=gender]').forEach(r => {
    r.onchange = () => selectedGender = r.value;
  });

  document.getElementById('bookingForm').onsubmit = submit;
}

async function loadAll() {
  await loadCalendar();
  await loadSlots();
  await loadBookings();
}

async function loadSlots() {
  const res = await fetch(`/slots?date=${selectedDate}`);
  const slots = await res.json();

  timeSelect.innerHTML = '<option value="">เลือกเวลา</option>';
  Object.keys(slots).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    if (slots[t][selectedStylist]) opt.disabled = true;
    timeSelect.appendChild(opt);
  });
}

async function loadBookings() {
  const res = await fetch(`/bookings?date=${selectedDate}`);
  const data = await res.json();

  list.innerHTML = '';
  data.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time}</td>
      <td>${b.stylist}</td>
      <td>${b.name}</td>
      <td>${b.service}</td>
      <td><button onclick="del('${b.id}')">ลบ</button></td>
    `;
    list.appendChild(tr);
  });
}

async function submit(e) {
  e.preventDefault();

  const payload = {
    date: selectedDate,
    time: timeSelect.value,
    name: name.value,
    phone: phone.value || '0',
    stylist: selectedStylist,
    gender: selectedGender,
    service: service.value
  };

  const res = await fetch('/bookings', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });

  const r = await res.json();
  msg.textContent = r.error || 'บันทึกสำเร็จ';
  loadAll();
}

async function del(id) {
  await fetch(`/bookings/${id}`, { method:'DELETE' });
  loadAll();
}

async function loadCalendar() {
  const month = selectedDate.slice(0,7);
  const res = await fetch(`/calendar?month=${month}`);
  const days = await res.json();

  calendar.innerHTML = '';
  days.forEach(d => {
    const div = document.createElement('div');
    div.className = 'day has';
    div.textContent = d.split('-')[2];
    calendar.appendChild(div);
  });
}

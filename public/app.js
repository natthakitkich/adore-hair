const PIN = '1234';
const START = 13;
const END = 22;

let selectedDate;
let selectedStylist = 'Bank';
let bookings = [];

/* ===== LOGIN ===== */
loginBtn.onclick = () => {
  if (pin.value === PIN) {
    loginOverlay.style.display = 'none';
    init();
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
};

/* ===== INIT ===== */
function init() {
  selectedDate = new Date().toISOString().slice(0,10);
  date.value = selectedDate;

  date.onchange = () => {
    selectedDate = date.value;
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

  bookingForm.onsubmit = submitBooking;

  loadAll();
}

/* ===== LOAD ===== */
async function loadAll() {
  await loadBookings();
  await loadSlots();
  await loadCalendar();
  renderTable();
  renderSummary();
}

async function loadBookings() {
  const res = await fetch(`/bookings?date=${selectedDate}`);
  bookings = await res.json();
}

async function loadSlots() {
  const res = await fetch(`/slots?date=${selectedDate}`);
  const { slots } = await res.json();

  time.innerHTML = `<option value="">เลือกเวลา</option>`;
  for (let h = START; h <= END; h++) {
    const t = `${String(h).padStart(2,'0')}:00`;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    if (slots[t]?.[selectedStylist]) opt.disabled = true;
    time.appendChild(opt);
  }
}

/* ===== SUBMIT ===== */
async function submitBooking(e) {
  e.preventDefault();

  const gender = document.querySelector('input[name="gender"]:checked')?.value;
  if (!gender || !time.value) {
    msg.textContent = 'กรอกข้อมูลไม่ครบ';
    return;
  }

  const res = await fetch('/bookings', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      date: selectedDate,
      time: time.value,
      name: name.value,
      phone: phone.value || '0',
      stylist: selectedStylist,
      gender,
      service: service.value
    })
  });

  const r = await res.json();
  if (r.error) msg.textContent = r.error;
  else {
    msg.textContent = 'บันทึกสำเร็จ';
    bookingForm.reset();
    loadAll();
  }
}

/* ===== TABLE ===== */
function renderTable() {
  list.innerHTML = '';
  bookings.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time}</td>
      <td>${b.stylist}/${b.gender}</td>
      <td>${b.name}</td>
      <td>${b.service}</td>
      <td>${b.phone}</td>
      <td><button onclick="deleteBooking(${b.id})">ลบ</button></td>
    `;
    list.appendChild(tr);
  });
}

async function deleteBooking(id) {
  await fetch(`/bookings/${id}`, { method:'DELETE' });
  loadAll();
}

/* ===== SUMMARY ===== */
function renderSummary() {
  countBank.textContent = bookings.filter(b=>b.stylist==='Bank').length;
  countSindy.textContent = bookings.filter(b=>b.stylist==='Sindy').length;
  countAssist.textContent = bookings.filter(b=>b.stylist==='Assist').length;
  countTotal.textContent = bookings.length;
}

/* ===== CALENDAR ===== */
async function loadCalendar() {
  const ym = selectedDate.slice(0,7);
  const res = await fetch(`/calendar?month=${ym}`);
  const days = await res.json();

  calendarDays.innerHTML = '';
  days.forEach(d => {
    const div = document.createElement('div');
    div.textContent = d.day;
    if (d.hasBooking) div.classList.add('hasBooking');
    calendarDays.appendChild(div);
  });
}

const API = '';
const OWNER_PIN = '1234';

let bookings = [];
let calendarDensity = {};
let closedDays = [];

let selectedDate = getTodayTH();
let selectedStylist = 'Bank';

let viewMonth = new Date(selectedDate).getMonth();
let viewYear = new Date(selectedDate).getFullYear();

/* LOGIN */
loginBtn.onclick = () => {
  if (pin.value !== OWNER_PIN) return loginMsg.textContent = 'PIN ผิด';
  localStorage.setItem('login', '1');
  loginOverlay.classList.add('hidden');
  init();
};

logoutBtn.onclick = () => {
  localStorage.removeItem('login');
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('login') === '1') {
    loginOverlay.classList.add('hidden');
    init();
  }
});

async function init() {
  bindTabs();
  await loadClosedDays();
  await loadCalendar();
  await loadBookings();
  initStoreStatus();
}

/* STORE STATUS */
function initStoreStatus() {
  toggleStoreBtn.onclick = async () => {
    await fetch(`${API}/closed-days`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ date: selectedDate })
    });
    await loadClosedDays();
    renderCalendar();
  };
}

/* CALENDAR */
async function loadCalendar() {
  calendarDensity = await (await fetch(`${API}/calendar-days`)).json();
  renderCalendar();
}

async function loadClosedDays() {
  closedDays = await (await fetch(`${API}/closed-days`)).json();
}

function renderCalendar() {
  calendarDays.innerHTML = '';
  const first = new Date(viewYear, viewMonth, 1);
  calendarTitle.textContent = first.toLocaleDateString('th-TH', {month:'long',year:'numeric'});

  for (let i = 0; i < first.getDay(); i++) calendarDays.appendChild(document.createElement('div'));

  const days = new Date(viewYear, viewMonth + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const date = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el = document.createElement('div');
    el.className = 'day';
    el.textContent = d;

    if (date === selectedDate) el.classList.add('today');
    if (closedDays.includes(date)) el.classList.add('closed');

    el.onclick = async () => {
      selectedDate = date;
      await loadBookings();
      renderCalendar();
    };
    calendarDays.appendChild(el);
  }
}

prevMonth.onclick = () => { viewMonth--; renderCalendar(); };
nextMonth.onclick = () => { viewMonth++; renderCalendar(); };

/* BOOKINGS */
async function loadBookings() {
  bookings = await (await fetch(`${API}/bookings?date=${selectedDate}`)).json();
  renderSummary();
  renderTimes();
  renderTable();
}

function renderTimes() {
  time.innerHTML = '';
  for (let h = 13; h <= 22; h++) {
    const t = `${String(h).padStart(2,'0')}:00:00`;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.slice(0,5);
    if (bookings.find(b => b.time === t && b.stylist === selectedStylist)) opt.disabled = true;
    time.appendChild(opt);
  }
}

bookingForm.onsubmit = async e => {
  e.preventDefault();
  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!gender) return alert('เลือกเพศ');

  await fetch(`${API}/bookings`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      date:selectedDate,
      time:time.value,
      stylist:selectedStylist,
      name:name.value,
      phone:phone.value,
      gender,
      service:service.value
    })
  });

  bookingForm.reset();
  alert('บันทึกคิวเรียบร้อย');
  loadBookings();
  loadCalendar();
};

/* SUMMARY */
function renderSummary() {
  countBank.textContent = bookings.filter(b=>b.stylist==='Bank').length;
  countSindy.textContent = bookings.filter(b=>b.stylist==='Sindy').length;
  countAssist.textContent = bookings.filter(b=>b.stylist==='Assist').length;
  countTotal.textContent = bookings.length;
}

/* TABLE */
function renderTable() {
  list.innerHTML = '';
  bookings.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time.slice(0,5)}</td>
      <td>${b.stylist}</td>
      <td>${b.gender==='male'?'👨':'👩'}</td>
      <td>${b.name}</td>
      <td>${b.service||''}</td>
      <td>${b.phone||''}</td>
      <td></td>`;
    list.appendChild(tr);
  });
}

/* TABS */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(t=>{
    t.onclick=()=>{
      document.querySelector('.tab.active').classList.remove('active');
      t.classList.add('active');
      selectedStylist=t.dataset.tab;
      renderTimes();
    };
  });
}

function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'});
}

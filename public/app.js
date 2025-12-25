let currentDate = '';
let viewYear, viewMonth;
let currentStylist = 'Bank';
let bookings = [];

const dateInput = document.getElementById('date');
const calendarDays = document.getElementById('calendarDays');
const timeSelect = document.getElementById('time');
const list = document.getElementById('list');

init();

function init(){
  const today = new Date();
  currentDate = today.toISOString().slice(0,10);
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();

  dateInput.value = currentDate;

  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);

  bindTabs();
  bindForm();
  loadAll();
}

function changeMonth(delta){
  viewMonth += delta;
  if(viewMonth < 0){ viewMonth = 11; viewYear--; }
  if(viewMonth > 11){ viewMonth = 0; viewYear++; }
  loadCalendar();
}

/* ===== LOAD ===== */
async function loadAll(){
  await loadCalendar();
  await loadBookings();
  await loadSlots();
  renderTable();
  renderSummary();
}

/* ===== CALENDAR ===== */
async function loadCalendar(){
  const res = await fetch('/calendar-days');
  const { days=[] } = await res.json();

  calendarDays.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth+1, 0).getDate();

  for(let i=0;i<firstDay;i++){
    calendarDays.appendChild(document.createElement('div'));
  }

  for(let d=1; d<=totalDays; d++){
    const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    const cell = document.createElement('div');
    cell.className = 'calCell';
    cell.innerHTML = `<div class="calNum">${d}</div>`;

    if(days.includes(dateStr)) cell.classList.add('hasBookings');
    if(dateStr === currentDate) cell.classList.add('selected');

    cell.onclick = () => {
      currentDate = dateStr;
      dateInput.value = dateStr;
      loadAll();
    };

    calendarDays.appendChild(cell);
  }
}

/* ===== BOOKINGS ===== */
async function loadBookings(){
  const res = await fetch(`/bookings?date=${currentDate}`);
  bookings = await res.json();
}

/* ===== SLOTS ===== */
async function loadSlots(){
  timeSelect.innerHTML = '<option value="">เลือกเวลา</option>';
  const res = await fetch(`/slots?date=${currentDate}`);
  const { slots={} } = await res.json();

  Object.keys(slots).forEach(t=>{
    if(!slots[t][currentStylist]){
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      timeSelect.appendChild(o);
    }
  });
}

/* ===== TABLE ===== */
function renderTable(){
  list.innerHTML = '';

  bookings.forEach(b=>{
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${b.time}</td>
      <td><span class="badge stylist-${b.stylist.toLowerCase()}">${b.stylist}</span></td>
      <td><span class="gender ${b.gender}">${b.gender === 'male' ? '♂' : '♀'}</span></td>
      <td>${b.name}</td>
      <td>${b.service || '-'}</td>
      <td>${b.phone || '-'}</td>
      <td><button class="smallBtn danger">ลบ</button></td>
    `;

    tr.querySelector('button').onclick = async ()=>{
      await fetch(`/bookings/${b.id}`, { method:'DELETE' });
      loadAll();
    };

    list.appendChild(tr);
  });
}

/* ===== SUMMARY ===== */
function renderSummary(){
  const c = s => bookings.filter(b=>b.stylist===s).length;
  document.getElementById('countBank').textContent = c('Bank');
  document.getElementById('countSindy').textContent = c('Sindy');
  document.getElementById('countAssist').textContent = c('Assist');
  document.getElementById('countTotal').textContent = bookings.length;
}

/* ===== FORM ===== */
function bindForm(){
  document.getElementById('bookingForm').onsubmit = async e=>{
    e.preventDefault();
    const body = {
      date: currentDate,
      time: timeSelect.value,
      stylist: currentStylist,
      name: name.value,
      phone: phone.value,
      gender: document.querySelector('input[name="gender"]:checked')?.value,
      service: service.value
    };

    const r = await fetch('/bookings',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });

    if(r.ok){ e.target.reset(); loadAll(); }
  };
}

/* ===== TABS ===== */
function bindTabs(){
  document.querySelectorAll('.tab').forEach(t=>{
    t.onclick = ()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      currentStylist = t.dataset.tab;
      loadSlots();
    };
  });
}

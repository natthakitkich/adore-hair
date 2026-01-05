const API = '';
const OWNER_PIN = '1234';

let bookings = [];
let currentDate = todayTH();
let currentMonth = new Date(currentDate);
let currentStylist = 'Bank';

/* =========================
   TIME (TH)
========================= */
function todayTH(){
  return new Date(
    new Date().toLocaleString('en-US',{ timeZone:'Asia/Bangkok' })
  ).toISOString().slice(0,10);
}

/* =========================
   LOGIN
========================= */
if(localStorage.getItem('adore_login') === '1'){
  loginOverlay.classList.add('hidden');
  init();
}

loginBtn.onclick = () => {
  if(pin.value === OWNER_PIN){
    localStorage.setItem('adore_login','1');
    loginOverlay.classList.add('hidden');
    init();
  }else{
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
};

logoutBtn.onclick = () => {
  localStorage.removeItem('adore_login');
  location.reload();
};

/* =========================
   INIT
========================= */
function init(){
  loadCalendarDensity();
  loadBookings();

  document.querySelectorAll('.tab').forEach(tab=>{
    tab.onclick = ()=>{
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
      renderTimeOptions();
    };
  });

  prevMonth.onclick = ()=>{
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  };

  nextMonth.onclick = ()=>{
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  };
}

/* =========================
   LOAD
========================= */
async function loadBookings(){
  const res = await fetch(`${API}/bookings?date=${currentDate}`);
  bookings = await res.json();
  renderTimeOptions();
  renderTable();
}

async function loadCalendarDensity(){
  const res = await fetch(`${API}/calendar-days`);
  window.allDays = await res.json();
  renderCalendar();
}

/* =========================
   CALENDAR
========================= */
function renderCalendar(){
  calendarDays.innerHTML = '';
  calendarTitle.textContent =
    currentMonth.toLocaleDateString('th-TH',{ month:'long', year:'numeric' });

  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();
  const firstDay = new Date(y,m,1).getDay();
  const totalDays = new Date(y,m+1,0).getDate();

  for(let i=0;i<firstDay;i++){
    calendarDays.appendChild(document.createElement('div'));
  }

  for(let d=1; d<=totalDays; d++){
    const date = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    const count = bookings.filter(b =>
      b.date === date &&
      (b.stylist === 'Bank' || b.stylist === 'Sindy')
    ).length;

    const cell = document.createElement('div');
    cell.className = 'calCell';
    if(date === currentDate) cell.classList.add('selected');

    const num = document.createElement('div');
    num.className = 'calNum';

    if(count >= 1 && count <= 5) num.classList.add('density-low');
    else if(count <= 10) num.classList.add('density-mid');
    else if(count <= 15) num.classList.add('density-high');
    else if(count >= 16) num.classList.add('density-full');

    num.textContent = d;
    cell.appendChild(num);

    cell.onclick = ()=>{
      currentDate = date;
      loadBookings();
      renderCalendar();
    };

    calendarDays.appendChild(cell);
  }
}

/* =========================
   TIME OPTIONS
========================= */
function renderTimeOptions(){
  time.innerHTML = '';
  for(let h=13; h<=22; h++){
    const t = `${String(h).padStart(2,'0')}:00:00`;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.slice(0,5);
    if(bookings.find(b=>b.time===t && b.stylist===currentStylist)){
      opt.disabled = true;
    }
    time.appendChild(opt);
  }
}

/* =========================
   FORM
========================= */
bookingForm.onsubmit = async e => {
  e.preventDefault();
  const gender = document.querySelector('[name=gender]:checked')?.value;

  await fetch(`${API}/bookings`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      date: currentDate,
      time: time.value,
      stylist: currentStylist,
      name: name.value,
      phone: phone.value,
      gender,
      service: service.value
    })
  });

  e.target.reset();
  loadCalendarDensity();
  loadBookings();
};

/* =========================
   TABLE (tel:)
========================= */
function renderTable(){
  list.innerHTML = '';
  bookings.forEach(b=>{
    const phone = b.phone
      ? `<a href="tel:${b.phone.replace(/[^0-9+]/g,'')}">${b.phone}</a>`
      : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.time.slice(0,5)}</td>
      <td>${b.stylist}</td>
      <td>${b.gender === 'male' ? '👨' : '👩'}</td>
      <td>${b.name}</td>
      <td>${b.service || ''}</td>
      <td>${phone}</td>
      <td><button class="ghost">แก้ไข</button></td>
    `;
    tr.querySelector('button').onclick = ()=>openEditModal(b);
    list.appendChild(tr);
  });
}

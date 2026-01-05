/* =================================================
   Adore Hair – app.js (FINAL)
   - Login overlay ก่อนเห็นหน้าเว็บ
   - Calendar density (Bank + Sindy, 20 slots)
   - Summary รวมทุกช่าง (ไม่เปลี่ยนตาม tab)
   - Tabs ใช้เลือกช่างสำหรับจอง
   - Booking + Edit modal (กันคิวชน)
   - tel: link สำหรับ iOS
   - Timezone: Asia/Bangkok
================================================= */

const API = '';
const OWNER_PIN = '1234';

/* =========================
   GLOBAL STATE
========================= */
let bookings = [];
let currentStylist = 'Bank';
let currentDate = getTodayTH();
let currentMonth = new Date(currentDate);
let editingBooking = null;

/* =========================
   TIMEZONE (TH)
========================= */
function getTodayTH(){
  return new Date(
    new Date().toLocaleString('en-US',{ timeZone:'Asia/Bangkok' })
  ).toISOString().slice(0,10);
}

/* =========================
   LOGIN FLOW
========================= */
if (localStorage.getItem('adore_login') === '1') {
  loginOverlay.classList.add('hidden');
  init();
}

loginBtn.onclick = () => {
  if (pin.value === OWNER_PIN) {
    localStorage.setItem('adore_login','1');
    loginOverlay.classList.add('hidden');
    init();
  } else {
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

  // tabs = เลือกช่างสำหรับจอง
  document.querySelectorAll('.tab').forEach(tab=>{
    tab.onclick = ()=>{
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
      renderTimeOptions();
    };
  });

  prevMonth.onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  };

  nextMonth.onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  };
}

/* =========================
   LOAD DATA
========================= */
async function loadBookings(){
  const res = await fetch(`${API}/bookings?date=${currentDate}`);
  bookings = await res.json();

  renderTimeOptions();
  renderSummary();
  renderTable();
}

async function loadCalendarDensity(){
  const res = await fetch(`${API}/calendar-days`);
  window.calendarMap = await res.json();
  renderCalendar();
}

/* =========================
   CALENDAR (DENSITY)
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

    const count = countDensity(date);

    const cell = document.createElement('div');
    cell.className = 'calCell';
    if(date === currentDate) cell.classList.add('selected');

    const num = document.createElement('div');
    num.className = 'calNum';

    // 0 = ไม่มีสี
    if(count >= 1 && count <= 5) num.classList.add('density-low');
    else if(count <= 10) num.classList.add('density-mid');
    else if(count <= 15) num.classList.add('density-high');
    else if(count >= 16) num.classList.add('density-full');

    num.textContent = d;
    cell.appendChild(num);

    cell.onclick = () => {
      currentDate = date;
      loadBookings();
      renderCalendar();
    };

    calendarDays.appendChild(cell);
  }
}

/* นับเฉพาะ Bank + Sindy */
function countDensity(date){
  return bookings.filter(b =>
    b.date === date &&
    (b.stylist === 'Bank' || b.stylist === 'Sindy')
  ).length;
}

/* =========================
   TIME OPTIONS (BOOKING)
========================= */
function renderTimeOptions(){
  time.innerHTML = '';
  for(let h=13; h<=22; h++){
    const t = `${String(h).padStart(2,'0')}:00:00`;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.slice(0,5);

    if(bookings.find(b => b.time === t && b.stylist === currentStylist)){
      opt.disabled = true;
    }
    time.appendChild(opt);
  }
}

/* =========================
   CREATE BOOKING
========================= */
bookingForm.onsubmit = async e => {
  e.preventDefault();
  const gender = document.querySelector('[name=gender]:checked')?.value;
  if(!gender) return alert('กรุณาเลือกเพศ');

  await fetch(`${API}/bookings`,{
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
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
   SUMMARY (ALL STYLISTS)
========================= */
function renderSummary(){
  const bank = bookings.filter(b=>b.stylist==='Bank').length;
  const sindy = bookings.filter(b=>b.stylist==='Sindy').length;
  const assist = bookings.filter(b=>b.stylist==='Assist').length;

  sumBank.textContent = bank;
  sumSindy.textContent = sindy;
  sumAssist.textContent = assist;
  sumTotal.textContent = bank + sindy + assist;
}

/* =========================
   TABLE (ALL BOOKINGS)
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
      <td>${b.gender==='male'?'👨':'👩'}</td>
      <td>${b.name}</td>
      <td>${b.service || ''}</td>
      <td>${phone}</td>
      <td><button class="ghost">แก้ไข</button></td>
    `;
    tr.querySelector('button').onclick = ()=>openEditModal(b);
    list.appendChild(tr);
  });
}

/* =========================
   EDIT MODAL
========================= */
function openEditModal(b){
  editingBooking = b;

  editStylist.value = b.stylist;
  editDate.value = b.date;
  editName.value = b.name;
  editPhone.value = b.phone || '';
  editService.value = b.service || '';

  document.querySelectorAll('[name=editGender]').forEach(r=>{
    r.checked = r.value === b.gender;
  });

  renderEditTimeOptions(b.stylist, b.date, b.time);
  editOverlay.classList.remove('hidden');
}

function renderEditTimeOptions(stylist, date, currentTime){
  editTime.innerHTML = '';
  for(let h=13; h<=22; h++){
    const t = `${String(h).padStart(2,'0')}:00:00`;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.slice(0,5);

    const clash = bookings.find(b =>
      b.date === date &&
      b.stylist === stylist &&
      b.time === t &&
      b.id !== editingBooking.id
    );

    if(clash) opt.disabled = true;
    if(t === currentTime) opt.selected = true;

    editTime.appendChild(opt);
  }
}

saveEdit.onclick = async () => {
  const gender = document.querySelector('[name=editGender]:checked')?.value;

  // เช็กชนซ้ำ
  const clash = bookings.find(b =>
    b.date === editDate.value &&
    b.stylist === editingBooking.stylist &&
    b.time === editTime.value &&
    b.id !== editingBooking.id
  );

  if(clash){
    alert('เวลานี้มีคิวแล้ว กรุณาเลือกใหม่');
    return;
  }

  await fetch(`${API}/bookings/${editingBooking.id}`,{
    method:'PUT',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
      name: editName.value,
      phone: editPhone.value,
      gender,
      service: editService.value,
      date: editDate.value,
      time: editTime.value
    })
  });

  closeEdit();
  loadCalendarDensity();
  loadBookings();
};

closeEdit.onclick = closeEdit;

function closeEdit(){
  editOverlay.classList.add('hidden');
  editingBooking = null;
}

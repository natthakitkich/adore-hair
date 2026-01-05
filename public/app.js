document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_auth';

  /* ================= ELEMENTS ================= */
  const loginOverlay = document.getElementById('loginOverlay');
  const pinInput = document.getElementById('pinInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const calendarGrid = document.getElementById('calendarGrid');
  const calendarTitle = document.getElementById('calendarTitle');
  const dayHint = document.getElementById('dayHint');
  const stylistTabs = document.getElementById('stylistTabs');
  const summary = document.getElementById('summary');
  const topDate = document.getElementById('topDate');

  /* ================= STATE ================= */
  let currentMonth = new Date();
  let selectedDate = null;
  let activeStylist = 'Bank';
  let bookings = [];
  let dayDensityMap = {}; // { '2026-01-05': 7 }

  /* ================= AUTH ================= */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    loginOverlay.classList.add('hidden');
    boot();
  }

  loginBtn.onclick = () => {
    if (pinInput.value === OWNER_PIN) {
      localStorage.setItem(AUTH_KEY, 'true');
      loginOverlay.classList.add('hidden');
      boot();
    } else {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
    }
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ================= BOOT ================= */
  async function boot(){
    renderTopDate();
    await fetchCalendarDensity();
    renderCalendar();
    renderTabs();
    renderEmptySummary();
  }

  function renderTopDate(){
    topDate.textContent = new Date().toLocaleDateString('en-US',{
      month:'short',day:'numeric',year:'numeric'
    });
  }

  /* ================= CALENDAR DENSITY ================= */
  async function fetchCalendarDensity(){
    try{
      const res = await fetch('/calendar-days');
      dayDensityMap = await res.json();
    }catch(e){
      console.error('density error',e);
      dayDensityMap = {};
    }
  }

  function getDensityClass(count){
    if(count >= 20) return 'density-full';
    if(count >= 15) return 'density-high';
    if(count >= 8) return 'density-mid';
    if(count >= 1) return 'density-low';
    return '';
  }

  /* ================= CALENDAR ================= */
  document.getElementById('prevMonth').onclick = async () => {
    currentMonth.setMonth(currentMonth.getMonth()-1);
    await fetchCalendarDensity();
    renderCalendar();
  };

  document.getElementById('nextMonth').onclick = async () => {
    currentMonth.setMonth(currentMonth.getMonth()+1);
    await fetchCalendarDensity();
    renderCalendar();
  };

  function renderCalendar(){
    calendarGrid.innerHTML = '';
    calendarTitle.textContent =
      currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y,m,1).getDay();
    const days = new Date(y,m+1,0).getDate();

    for(let i=0;i<first;i++){
      calendarGrid.appendChild(document.createElement('div'));
    }

    for(let d=1; d<=days; d++){
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const count = dayDensityMap[key] || 0;

      const cell = document.createElement('div');
      cell.className = 'calCell';

      const num = document.createElement('div');
      num.className = 'calNum ' + getDensityClass(count);
      num.textContent = d;

      cell.onclick = () => {
        selectedDate = key;
        dayHint.textContent = `วันที่เลือก: ${d}`;
        fetchBookings();
      };

      cell.appendChild(num);
      calendarGrid.appendChild(cell);
    }
  }

  /* ================= BOOKINGS ================= */
  async function fetchBookings(){
    try{
      const res = await fetch(`/bookings?date=${selectedDate}`);
      bookings = await res.json();
      renderTabs();
      renderSummary();
      renderBookingTable();
    }catch(err){
      console.error(err);
    }
  }

  /* ================= TABS ================= */
  function renderTabs(){
    stylistTabs.innerHTML='';
    ['Bank','Sindy','Assist'].forEach(name=>{
      const t=document.createElement('div');
      t.className='tab'+(name===activeStylist?' active':'');
      t.textContent=name;
      t.onclick=()=>{activeStylist=name;renderBookingTable();renderTabs();};
      stylistTabs.appendChild(t);
    });
  }

  /* ================= SUMMARY ================= */
  function renderEmptySummary(){
    summary.innerHTML = `<div class="center muted">ยังไม่มีข้อมูล</div>`;
  }

  function renderSummary(){
    const count = { Bank:0, Sindy:0, Assist:0 };
    bookings.forEach(b => count[b.stylist]++);

    summary.innerHTML = `
      <div class="panel">Bank<br><b>${count.Bank}</b></div>
      <div class="panel">Sindy<br><b>${count.Sindy}</b></div>
      <div class="panel">Assist<br><b>${count.Assist}</b></div>
      <div class="panel">รวม<br><b>${bookings.length}</b></div>
    `;
  }

  /* ================= TABLE ================= */
  function renderBookingTable(){
    document.querySelectorAll('.bookingTable').forEach(e=>e.remove());

    const list = bookings.filter(b => b.stylist === activeStylist);
    const section = document.createElement('section');
    section.className = 'panel bookingTable';

    let html = `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="color:#9aa6c5;text-align:left">
            <th>เวลา</th><th>ช่าง</th><th>เพศ</th><th>ชื่อ</th>
          </tr>
        </thead><tbody>
    `;

    if(list.length === 0){
      html += `<tr><td colspan="4" class="muted">ไม่มีคิว</td></tr>`;
    }else{
      list.forEach(b=>{
        html += `
          <tr>
            <td>${b.time}</td>
            <td>${b.stylist}</td>
            <td>${b.gender}</td>
            <td>${b.name}</td>
          </tr>`;
      });
    }

    html += `</tbody></table>`;
    section.innerHTML = html;
    summary.insertAdjacentElement('afterend', section);
  }

});

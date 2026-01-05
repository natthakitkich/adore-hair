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
  function boot(){
    renderTopDate();
    renderCalendar();
    renderTabs();
    renderEmptySummary();
  }

  function renderTopDate(){
    topDate.textContent = new Date().toLocaleDateString('en-US',{
      month:'short',day:'numeric',year:'numeric'
    });
  }

  /* ================= CALENDAR ================= */
  document.getElementById('prevMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth()-1);
    renderCalendar();
  };

  document.getElementById('nextMonth').onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth()+1);
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
      const cell = document.createElement('div');
      cell.className = 'calCell';
      cell.textContent = d;

      cell.onclick = () => {
        selectedDate = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        dayHint.textContent = `วันที่เลือก: ${d}`;
        fetchBookings();
      };

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
    const list = bookings.filter(b => b.stylist === activeStylist);

    let html = `
      <section class="panel">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="color:#9aa6c5;text-align:left">
              <th>เวลา</th>
              <th>ช่าง</th>
              <th>เพศ</th>
              <th>ชื่อ</th>
            </tr>
          </thead>
          <tbody>
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
          </tr>
        `;
      });
    }

    html += `</tbody></table></section>`;
    summary.insertAdjacentHTML('afterend', html);
  }

});

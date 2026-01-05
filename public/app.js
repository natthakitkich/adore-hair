document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';
  const API = '';

  const STYLISTS = ['Bank','Sindy','Assist'];

  /* ================= ELEMENTS ================= */
  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pinInput');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const calendarGrid = document.getElementById('calendarGrid');
  const calendarTitle = document.getElementById('calendarTitle');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');

  const dayStatus = document.getElementById('dayStatus');
  const stylistTabsEl = document.getElementById('stylistTabs');
  const summaryEl = document.getElementById('summary');
  const queueBody = document.getElementById('queueBody');

  const editOverlay = document.getElementById('editOverlay');
  const editDate = document.getElementById('editDate');
  const editTime = document.getElementById('editTime');
  const editStylist = document.getElementById('editStylist');
  const editName = document.getElementById('editName');
  const editPhone = document.getElementById('editPhone');
  const editService = document.getElementById('editService');
  const saveEditBtn = document.getElementById('saveEditBtn');
  const deleteEditBtn = document.getElementById('deleteEditBtn');
  const closeEditBtn = document.getElementById('closeEditBtn');

  /* ================= STATE ================= */
  let todayTH = new Date(new Date().toLocaleString('en-US',{ timeZone:'Asia/Bangkok' }));
  let currentMonth = new Date(todayTH.getFullYear(), todayTH.getMonth(), 1);
  let selectedDate = null;
  let bookings = [];
  let editingBooking = null;

  /* ================= AUTH ================= */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    hideLogin();
    boot();
  } else {
    showLogin();
  }

  loginBtn.onclick = () => {
    if (pinInput.value !== OWNER_PIN) {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }
    localStorage.setItem(AUTH_KEY,'true');
    pinInput.value = '';
    loginMsg.textContent = '';
    hideLogin();
    boot();
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  function showLogin(){
    loginOverlay.classList.remove('hidden');
  }
  function hideLogin(){
    loginOverlay.classList.add('hidden');
  }

  /* ================= BOOT ================= */
  async function boot(){
    renderTopDate();
    await renderCalendar();
    autoSelectToday();
  }

  function renderTopDate(){
    document.getElementById('topDate').textContent =
      todayTH.toLocaleDateString('th-TH',{ day:'numeric',month:'short',year:'numeric' });
  }

  /* ================= CALENDAR ================= */
  prevMonthBtn.onclick = async () => {
    currentMonth.setMonth(currentMonth.getMonth()-1);
    await renderCalendar();
  };

  nextMonthBtn.onclick = async () => {
    currentMonth.setMonth(currentMonth.getMonth()+1);
    await renderCalendar();
  };

  async function renderCalendar(){
    calendarGrid.innerHTML = '';
    calendarTitle.textContent =
      currentMonth.toLocaleDateString('th-TH',{ month:'long',year:'numeric' });

    const density = await fetch(`${API}/calendar-days`).then(r=>r.json()).catch(()=>({}));

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(y,m,1).getDay();
    const daysInMonth = new Date(y,m+1,0).getDate();

    for(let i=0;i<firstDay;i++){
      calendarGrid.appendChild(document.createElement('div'));
    }

    for(let d=1; d<=daysInMonth; d++){
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell = document.createElement('div');
      cell.className = 'calCell';
      if(dateStr === selectedDate) cell.classList.add('selected');

      const num = document.createElement('div');
      num.className = 'calNum';
      num.textContent = d;

      const count = density[dateStr] || 0;
      if(count>=10) cell.style.background='rgba(255,92,122,.35)';
      else if(count>=5) cell.style.background='rgba(255,193,7,.35)';
      else if(count>=1) cell.style.background='rgba(110,231,255,.25)';

      cell.onclick = () => selectDate(dateStr);
      cell.appendChild(num);
      calendarGrid.appendChild(cell);
    }
  }

  function autoSelectToday(){
    const d = todayTH;
    selectedDate =
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    selectDate(selectedDate);
  }

  /* ================= DATE SELECT ================= */
  async function selectDate(dateStr){
    selectedDate = dateStr;
    dayStatus.textContent = `วันที่ ${new Date(dateStr).toLocaleDateString('th-TH')}`;
    await loadBookings();
    await renderCalendar();
  }

  /* ================= BOOKINGS ================= */
  async function loadBookings(){
    const res = await fetch(`${API}/bookings?date=${selectedDate}`);
    bookings = await res.json();
    renderQueue();
    renderSummary();
  }

  function renderQueue(){
    queueBody.innerHTML = '';
    bookings.forEach(b=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.time.slice(0,5)}</td>
        <td>${b.stylist}</td>
        <td>${b.gender==='male'?'👨':'👩'}</td>
        <td>${b.name}</td>
        <td>${b.service||''}</td>
        <td>${b.phone||''}</td>
        <td><button class="ghost">แก้ไข</button></td>
      `;
      tr.querySelector('button').onclick = ()=>openEdit(b);
      queueBody.appendChild(tr);
    });
  }

  /* ================= EDIT ================= */
  function openEdit(b){
    editingBooking = b;
    editDate.value = b.date;
    editStylist.value = b.stylist;
    editName.value = b.name;
    editPhone.value = b.phone||'';
    editService.value = b.service||'';
    document.querySelectorAll('[name=editGender]').forEach(r=>{
      r.checked = r.value===b.gender;
    });
    renderEditTimes();
    editOverlay.classList.remove('hidden');
  }

  async function renderEditTimes(){
    editTime.innerHTML='';
    const res = await fetch(`${API}/bookings?date=${editDate.value}`);
    const list = await res.json();
    for(let h=13; h<=22; h++){
      const t = `${String(h).padStart(2,'0')}:00:00`;
      const clash = list.find(x=>x.time===t && x.stylist===editingBooking.stylist && x.id!==editingBooking.id);
      const opt=document.createElement('option');
      opt.value=t; opt.textContent=t.slice(0,5);
      if(clash) opt.disabled=true;
      if(t===editingBooking.time) opt.selected=true;
      editTime.appendChild(opt);
    }
  }

  saveEditBtn.onclick = async ()=>{
    const gender = document.querySelector('[name=editGender]:checked')?.value;
    const res = await fetch(`${API}/bookings/${editingBooking.id}`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        date:editDate.value,
        time:editTime.value,
        name:editName.value,
        phone:editPhone.value,
        gender,
        service:editService.value
      })
    });
    if(!res.ok){ alert('คิวนี้ถูกจองแล้ว'); return; }
    closeEdit();
    loadBookings();
    alert('แก้ไขคิวสำเร็จ');
  };

  deleteEditBtn.onclick = async ()=>{
    if(!confirm('ลบคิวนี้?')) return;
    await fetch(`${API}/bookings/${editingBooking.id}`,{method:'DELETE'});
    closeEdit();
    loadBookings();
  };

  closeEditBtn.onclick = closeEdit;
  function closeEdit(){
    editOverlay.classList.add('hidden');
    editingBooking=null;
  }

  /* ================= SUMMARY ================= */
  function renderSummary(){
    const count = s => bookings.filter(b=>b.stylist===s).length;
    summaryEl.innerHTML = `
      <div class="panel">Bank<br><b>${count('Bank')}</b></div>
      <div class="panel">Sindy<br><b>${count('Sindy')}</b></div>
      <div class="panel">Assist<br><b>${count('Assist')}</b></div>
      <div class="panel">รวม<br><b>${bookings.length}</b></div>
    `;
  }

});

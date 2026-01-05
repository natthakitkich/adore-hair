/* =========================
   GLOBAL STATE
========================= */
const TZ = 'Asia/Bangkok';
const PIN_CODE = '1234'; // เปลี่ยนได้

let state = {
  currentDate: today(),
  selectedDate: today(),
  queues: loadQueues(),
  editIndex: null,
  activeTab: 'all'
};

/* =========================
   LOGIN
========================= */
function checkLogin(){
  if(localStorage.getItem('logged') === '1'){
    hideLogin();
  }else{
    showLogin();
  }
}

function showLogin(){
  document.getElementById('loginOverlay').classList.remove('hidden');
}

function hideLogin(){
  document.getElementById('loginOverlay').classList.add('hidden');
}

function login(){
  const pin = document.getElementById('pin').value;
  if(pin === PIN_CODE){
    localStorage.setItem('logged','1');
    hideLogin();
    renderAll();
  }else{
    alert('รหัสไม่ถูกต้อง');
  }
}

function logout(){
  localStorage.removeItem('logged');
  location.reload();
}

/* =========================
   DATE HELPERS
========================= */
function today(){
  return new Date(new Date().toLocaleString('en-US',{timeZone:TZ}));
}

function formatDate(d){
  return d.toISOString().split('T')[0];
}

function sameDay(a,b){
  return formatDate(a) === formatDate(b);
}

/* =========================
   STORAGE
========================= */
function loadQueues(){
  return JSON.parse(localStorage.getItem('queues') || '[]');
}

function saveQueues(){
  localStorage.setItem('queues',JSON.stringify(state.queues));
}

/* =========================
   CALENDAR
========================= */
function renderCalendar(){
  const y = state.currentDate.getFullYear();
  const m = state.currentDate.getMonth();

  document.getElementById('monthTitle').innerText =
    state.currentDate.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  const firstDay = new Date(y,m,1).getDay();
  const daysInMonth = new Date(y,m+1,0).getDate();

  for(let i=0;i<firstDay;i++){
    grid.appendChild(document.createElement('div'));
  }

  for(let d=1;d<=daysInMonth;d++){
    const cell = document.createElement('div');
    cell.className = 'calCell';

    const date = new Date(y,m,d);
    const num = document.createElement('div');
    num.className = 'calNum';

    const count = countDensity(date);
    num.classList.add(densityClass(count));
    num.innerText = d;

    if(sameDay(date,state.selectedDate)){
      cell.classList.add('selected');
    }

    cell.onclick = ()=>{
      state.selectedDate = date;
      renderAll();
    };

    cell.appendChild(num);
    grid.appendChild(cell);
  }
}

function countDensity(date){
  return state.queues.filter(q =>
    q.date === formatDate(date) &&
    (q.stylist === 'Bank' || q.stylist === 'Sindy')
  ).length;
}

function densityClass(n){
  if(n === 0) return 'd0';
  if(n <= 5) return 'd1';
  if(n <= 10) return 'd2';
  if(n <= 15) return 'd3';
  return 'd4';
}

/* =========================
   SUMMARY
========================= */
function renderSummary(){
  const d = formatDate(state.selectedDate);
  const list = state.queues.filter(q=>q.date===d);

  const b = list.filter(q=>q.stylist==='Bank').length;
  const s = list.filter(q=>q.stylist==='Sindy').length;
  const a = list.filter(q=>q.stylist==='Assist').length;

  document.getElementById('sumBank').innerText = b;
  document.getElementById('sumSindy').innerText = s;
  document.getElementById('sumAssist').innerText = a;
  document.getElementById('sumTotal').innerText = b+s+a;
}

/* =========================
   TABLE
========================= */
function renderTable(){
  const d = formatDate(state.selectedDate);
  let list = state.queues.filter(q=>q.date===d);

  if(state.activeTab !== 'all'){
    list = list.filter(q=>q.stylist===state.activeTab);
  }

  list.sort((a,b)=>a.time.localeCompare(b.time));

  const tbody = document.getElementById('queueBody');
  tbody.innerHTML = '';

  list.forEach((q,i)=>{
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${q.time}</td>
      <td><span class="badge ${q.stylist.toLowerCase()}">${q.stylist}</span></td>
      <td>${q.gender==='male'?'👦':'👩'}</td>
      <td>${q.name}</td>
      <td>${q.service}</td>
      <td><a href="tel:${q.phone}">${q.phone}</a></td>
      <td><button class="ghost" onclick="editQueue(${i})">แก้ไข</button></td>
    `;
    tbody.appendChild(tr);
  });
}

/* =========================
   ADD QUEUE
========================= */
function addQueue(){
  const q = getFormData();
  if(hasConflict(q)){
    alert('เวลานี้มีคิวแล้ว');
    return;
  }
  state.queues.push(q);
  saveQueues();
  alert('บันทึกคิวเรียบร้อยแล้ว');
  renderAll();
}

/* =========================
   EDIT QUEUE
========================= */
function editQueue(i){
  state.editIndex = i;
  const q = state.queues[i];
  fillEditForm(q);
  document.getElementById('editOverlay').classList.remove('hidden');
}

function saveEdit(){
  const q = getEditData();
  if(hasConflict(q,true)){
    alert('เวลานี้มีคิวแล้ว');
    return;
  }
  state.queues[state.editIndex] = q;
  saveQueues();
  alert('แก้ไขคิวเรียบร้อยแล้ว');
  closeEdit();
  renderAll();
}

function closeEdit(){
  document.getElementById('editOverlay').classList.add('hidden');
}

/* =========================
   HELPERS
========================= */
function hasConflict(q,isEdit=false){
  return state.queues.some((x,i)=>{
    if(isEdit && i===state.editIndex) return false;
    return x.date===q.date && x.time===q.time && x.stylist===q.stylist;
  });
}

/* =========================
   RENDER ALL
========================= */
function renderAll(){
  renderCalendar();
  renderSummary();
  renderTable();
}

/* =========================
   INIT
========================= */
checkLogin();
renderAll();

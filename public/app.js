document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_auth';

  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pin');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const calendarGrid = document.getElementById('calendarGrid');
  const calendarTitle = document.getElementById('calendarTitle');
  const dayStatus = document.getElementById('dayStatus');
  const toggleClosedBtn = document.getElementById('toggleClosedBtn');

  const closedOverlay = document.getElementById('closedOverlay');
  const closeClosedOverlay = document.getElementById('closeClosedOverlay');

  let selectedDate = null;
  let currentMonth = new Date();

  /* AUTH */
  if(localStorage.getItem(AUTH_KEY)==='1'){
    loginOverlay.classList.add('hidden');
    boot();
  }

  loginBtn.onclick=()=>{
    if(pinInput.value==='1234'){
      localStorage.setItem(AUTH_KEY,'1');
      loginOverlay.classList.add('hidden');
      boot();
    }else{
      loginMsg.textContent='PIN ไม่ถูกต้อง';
    }
  };

  logoutBtn.onclick=()=>{
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  function boot(){
    renderCalendar();
  }

  function renderCalendar(){
    calendarGrid.innerHTML='';
    calendarTitle.textContent=currentMonth.toLocaleDateString('th-TH',{month:'long',year:'numeric'});

    const y=currentMonth.getFullYear();
    const m=currentMonth.getMonth();
    const first=new Date(y,m,1).getDay();
    const days=new Date(y,m+1,0).getDate();

    for(let i=0;i<first;i++) calendarGrid.appendChild(document.createElement('div'));

    for(let d=1;d<=days;d++){
      const cell=document.createElement('div');
      cell.className='calCell';
      cell.textContent=d;
      cell.onclick=()=>{
        selectedDate=`${y}-${m+1}-${d}`;
        dayStatus.textContent='วันนี้เปิดทำการ';
        toggleClosedBtn.classList.remove('hidden');
        toggleClosedBtn.textContent='ตั้งเป็นวันหยุด';
      };
      calendarGrid.appendChild(cell);
    }
  }

  toggleClosedBtn.onclick=()=>{
    closedOverlay.classList.remove('hidden');
  };

  closeClosedOverlay.onclick=()=>{
    closedOverlay.classList.add('hidden');
  };

});

const TZ='Asia/Bangkok';
let currentDate='';
let todayDate='';

const calendarDays=document.getElementById('calendarDays');
const calendarTitle=document.getElementById('calendarTitle');

init();

function init(){
  const now=new Date(new Date().toLocaleString('en-US',{timeZone:TZ}));
  todayDate=now.toISOString().slice(0,10);
  currentDate=todayDate;
  loadCalendar();
}

async function loadCalendar(){
  const res=await fetch('/calendar-days');
  const {days=[]}=await res.json();

  calendarDays.innerHTML='';
  calendarTitle.textContent=new Date(currentDate)
    .toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  days.forEach(d=>{
    const cell=document.createElement('div');
    cell.className='calCell';
    cell.textContent=Number(d.slice(-2));

    if(d===todayDate) cell.classList.add('today');
    if(d===currentDate) cell.classList.add('selected');

    const count=days.filter(x=>x===d).length;
    const level=Math.min(5,Math.ceil((count/20)*5));
    if(level>0) cell.dataset.level=level;

    cell.onclick=()=>{
      currentDate=d;
      loadCalendar();
    };

    calendarDays.appendChild(cell);
  });
}

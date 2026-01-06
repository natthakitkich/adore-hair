/* =========================
   CONFIG
========================= */
const API = ''; // ใช้ origin เดียวกัน
const OPEN_HOUR = 13;
const CLOSE_HOUR = 22;
const MAX_BOOK_DAYS = 30;
const STYLISTS = ['Bank', 'Sindy'];

/* =========================
   STATE
========================= */
let selectedDate = '';
let selectedStylist = 'Bank';
let selectedTime = '';
let availability = {};

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
  initCalendar();
  initStylistTabs();
  initForm();
});

/* =========================
   CALENDAR
========================= */
function initCalendar() {
  const today = new Date();
  selectedDate = toDateString(today);
  renderCalendar(today);
  loadAvailability();
}

function renderCalendar(baseDate) {
  const calendar = document.getElementById('calendarDays');
  const title = document.getElementById('calendarTitle');
  calendar.innerHTML = '';

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  title.textContent = baseDate.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric'
  });

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  for (let d = 1; d <= end.getDate(); d++) {
    const date = new Date(year, month, d);
    const dateStr = toDateString(date);

    const btn = document.createElement('div');
    btn.className = 'day';
    btn.textContent = d;

    const diffDays = diffFromToday(date);

    if (diffDays < 0 || diffDays > MAX_BOOK_DAYS) {
      btn.classList.add('disabled');
    } else {
      btn.onclick = () => {
        selectedDate = dateStr;
        document.querySelectorAll('.day').forEach(el =>
          el.classList.remove('active')
        );
        btn.classList.add('active');
        loadAvailability();
      };
    }

    if (dateStr === selectedDate) {
      btn.classList.add('active');
    }

    calendar.appendChild(btn);
  }
}

/* =========================
   STYLIST TABS
========================= */
function initStylistTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      selectedStylist = tab.dataset.stylist;
      renderTimeSlots();
    };
  });
}

/* =========================
   LOAD AVAILABILITY
========================= */
async function loadAvailability() {
  selectedTime = '';
  const res = await fetch(
    `${API}/public/availability?date=${selectedDate}`
  );
  availability = await res.json();
  renderTimeSlots();
}

/* =========================
   TIME SLOTS
========================= */
function renderTimeSlots() {
  const box = document.getElementById('timeSlots');
  box.innerHTML = '';

  for (let h = OPEN_HOUR; h <= CLOSE_HOUR; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = time.slice(0, 5);
    btn.className = 'ghost';

    const availableTimes = availability[selectedStylist] || [];
    const isAvailable = availableTimes.includes(time);

    if (!isAvailable) {
      btn.disabled = true;
      btn.style.opacity = 0.4;
    } else {
      btn.onclick = () => {
        selectedTime = time;
        document
          .querySelectorAll('#timeSlots button')
          .forEach(b => b.classList.remove('primary'));
        btn.classList.add('primary');
      };
    }

    box.appendChild(btn);
  }
}

/* =========================
   FORM SUBMIT
========================= */
function initForm() {
  const form = document.getElementById('customerBookingForm');

  form.onsubmit = async e => {
    e.preventDefault();

    if (!selectedTime) {
      alert('กรุณาเลือกเวลา');
      return;
    }

    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();

    const res = await fetch(`${API}/public/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedDate,
        time: selectedTime,
        stylist: selectedStylist,
        name,
        phone
      })
    });

    if (!res.ok) {
      alert('ไม่สามารถจองคิวได้ กรุณาลองใหม่');
      return;
    }

    showConfirm(name);
    form.reset();
    loadAvailability();
  };
}

/* =========================
   CONFIRMATION
========================= */
function showConfirm(name) {
  const box = document.getElementById('confirmBox');
  const text = document.getElementById('confirmText');

  text.textContent = `คุณ ${name}  
วันที่ ${selectedDate}  
เวลา ${selectedTime.slice(0, 5)}  
ช่าง ${selectedStylist}`;

  box.classList.remove('hidden');
}

/* =========================
   UTIL
========================= */
function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function diffFromToday(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = date - today;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

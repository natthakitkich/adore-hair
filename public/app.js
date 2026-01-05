/* =========================
   ADORE HAIR – APP.JS
   Phase 4.2 (Safari iOS safe)
========================= */

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);

const LS = {
  AUTH: 'adore_auth',
  DATE: 'adore_selected_date'
};

const MAX_QUEUE_PER_DAY = 20; // ช่าง 2 คน รวมสูงสุด

/* ---------- State ---------- */
let isAuthed = false;
let currentDate = null;   // Date object (วันที่ที่เลือก)
let viewYear = null;
let viewMonth = null;     // 0-11

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  restoreAuth();
  bindAuthUI();
  initDate();
  bindCalendarNav();
  renderAll();
});

/* ---------- Auth ---------- */
function restoreAuth() {
  isAuthed = localStorage.getItem(LS.AUTH) === '1';
  toggleAuthUI();
}

function bindAuthUI() {
  const loginBtn = $('loginBtn');
  const logoutBtn = $('logoutBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const pin = ($('pinInput')?.value || '').trim();
      if (pin.length === 4) {
        localStorage.setItem(LS.AUTH, '1');
        isAuthed = true;
        toggleAuthUI();
        renderAll();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem(LS.AUTH);
      isAuthed = false;
      toggleAuthUI();
    });
  }
}

function toggleAuthUI() {
  const overlay = $('loginOverlay');
  if (!overlay) return;
  overlay.classList.toggle('hidden', isAuthed);
}

/* ---------- Date ---------- */
function initDate() {
  const saved = localStorage.getItem(LS.DATE);
  currentDate = saved ? new Date(saved) : new Date();

  // normalize (ตัดเวลา)
  currentDate.setHours(0,0,0,0);

  viewYear = currentDate.getFullYear();
  viewMonth = currentDate.getMonth();
}

function setSelectedDate(d) {
  currentDate = new Date(d);
  currentDate.setHours(0,0,0,0);
  localStorage.setItem(LS.DATE, currentDate.toISOString());
  updateDateBox();
  renderCalendar();
}

/* ---------- Top Date Box ---------- */
function updateDateBox() {
  const box = $('dateBox');
  if (!box || !currentDate) return;
  const opts = { year:'numeric', month:'short', day:'numeric' };
  box.textContent = currentDate.toLocaleDateString('en-US', opts);
}

/* ---------- Calendar Nav ---------- */
function bindCalendarNav() {
  $('prevMonthBtn')?.addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });

  $('nextMonthBtn')?.addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });
}

/* ---------- Render ---------- */
function renderAll() {
  updateDateBox();
  renderCalendar();
}

/* ---------- Calendar ---------- */
function renderCalendar() {
  const grid = $('calendarGrid');
  const title = $('calendarTitle');
  if (!grid || !title) return;

  // Title
  title.textContent =
    new Date(viewYear, viewMonth, 1)
      .toLocaleDateString('th-TH', { month:'long', year:'numeric' });

  // Clear grid
  grid.innerHTML = '';

  // First day offset (Sun=0)
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Padding before month
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(makeEmptyCell());
  }

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(viewYear, viewMonth, d);
    const cell = makeDayCell(dateObj);
    grid.appendChild(cell);
  }

  // Padding after (ให้ครบแถว)
  const totalCells = firstDay + daysInMonth;
  const pad = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < pad; i++) {
    grid.appendChild(makeEmptyCell());
  }
}

function makeEmptyCell() {
  const c = document.createElement('div');
  c.className = 'calCell';
  c.style.visibility = 'hidden';
  return c;
}

function makeDayCell(dateObj) {
  const c = document.createElement('div');
  c.className = 'calCell';

  const n = document.createElement('div');
  n.className = 'calNum';
  n.textContent = dateObj.getDate();

  // Selected
  if (currentDate && sameDate(dateObj, currentDate)) {
    c.classList.add('selected');
  }

  // Density color
  const q = getQueueCountForDate(dateObj); // 0..20
  const densityClass = densityFromQueue(q);
  if (densityClass) n.classList.add(densityClass);

  c.appendChild(n);

  c.addEventListener('click', () => {
    setSelectedDate(dateObj);
  });

  return c;
}

/* ---------- Density ---------- */
/*
  Mapping (0–20):
  0           -> none
  1–5         -> density-low
  6–10        -> density-mid
  11–15       -> density-high
  16–20       -> density-full
*/
function densityFromQueue(q) {
  if (!q || q <= 0) return '';
  if (q <= 5) return 'density-low';
  if (q <= 10) return 'density-mid';
  if (q <= 15) return 'density-high';
  return 'density-full';
}

/* ---------- Data (stub-safe) ---------- */
/*
  IMPORTANT:
  - ฟังก์ชันนี้ “ไม่พังของเดิม”
  - ถ้ามีระบบดึงคิวจริง ให้แทนที่ body ข้างใน
*/
function getQueueCountForDate(dateObj) {
  // TODO: เชื่อมข้อมูลจริง
  // ชั่วคราว: demo ปลอดภัย
  return 0;
}

/* ---------- Utils ---------- */
function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

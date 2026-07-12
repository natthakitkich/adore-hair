const API = '';

/* =========================
   ELEMENTS
========================= */
const calendarTitle = document.getElementById('calendarTitle');
const calendarDaysEl = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const todayBtn = document.getElementById('todayBtn');

const selectedDateLabel =
  document.getElementById('selectedDateLabel');

const selectedStatusDot =
  document.getElementById('selectedStatusDot');

const selectedStatusTitle =
  document.getElementById('selectedStatusTitle');

const selectedStatusText =
  document.getElementById('selectedStatusText');

/* =========================
   STATE
========================= */
let calendarStatus = {};
let selectedDate = getTodayTH();

const initialDate = parseDate(selectedDate);

let viewMonth = initialDate.getMonth();
let viewYear = initialDate.getFullYear();

/* =========================
   STATUS CONTENT
========================= */
const statusContent = {
  /*
   * available = ไม่มีคิว
   * แสดงให้ลูกค้าเห็นเป็น "คิวว่าง"
   */
  available: {
    title: 'คิวว่าง',
    text: 'สามารถโทรสอบถามช่วงเวลาที่สะดวกกับทางร้านได้'
  },

  /*
   * low = มีคิวเล็กน้อย
   * ใช้หัวข้อและสีเดียวกับ available
   * แต่คงคำอธิบายที่ต่างกัน
   */
  low: {
    title: 'คิวว่าง',
    text: 'ยังมีโอกาสเลือกช่วงเวลาได้ กรุณาโทรสอบถามกับทางร้าน'
  },

  medium: {
    title: 'คิวปานกลาง',
    text: 'แนะนำให้โทรสอบถามช่วงเวลาว่างก่อนเข้ารับบริการ'
  },

  high: {
    title: 'คิวค่อนข้างแน่น',
    text: 'กรุณาโทรตรวจสอบช่วงเวลาว่างกับทางร้านก่อนเดินทาง'
  },

  closed: {
    title: 'ร้านปิด',
    text: 'กรุณาเลือกวันอื่นเพื่อตรวจสอบความหนาแน่นของคิว'
  },

  unavailable: {
    title: 'ยังไม่มีข้อมูลคิว',
    text: 'กรุณาโทรสอบถามกับทางร้านเพื่อยืนยันช่วงเวลาว่าง'
  }
};

/* =========================
   INIT
========================= */
async function init() {
  await loadCalendarStatus();
  renderCalendar();
  renderSelectedStatus();
}

/* =========================
   LOAD PUBLIC CALENDAR
========================= */
async function loadCalendarStatus() {
  try {
    const res = await fetch(`${API}/public-calendar`);

    if (!res.ok) {
      throw new Error('Unable to load public calendar');
    }

    const data = await res.json();

    calendarStatus =
      data && typeof data === 'object'
        ? data
        : {};
  } catch (error) {
    console.error(
      '[PublicQueue] Load error',
      error
    );

    calendarStatus = {};
  }
}

/* =========================
   CALENDAR
========================= */
function renderCalendar() {
  calendarDaysEl.innerHTML = '';

  const firstDay = new Date(
    viewYear,
    viewMonth,
    1
  );

  const startDay = firstDay.getDay();

  const daysInMonth = new Date(
    viewYear,
    viewMonth + 1,
    0
  ).getDate();

  calendarTitle.textContent =
    firstDay.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric'
    });

  /* ช่องว่างก่อนวันที่ 1 */
  for (let i = 0; i < startDay; i++) {
    const blank =
      document.createElement('div');

    blank.className = 'day-blank';

    calendarDaysEl.appendChild(blank);
  }

  /* วันที่ในเดือน */
  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    const date = formatDate(
      viewYear,
      viewMonth + 1,
      day
    );

    const status = getStatus(date);

    const button =
      document.createElement('button');

    button.type = 'button';
    button.className = `day ${status}`;

    button.setAttribute(
      'aria-label',
      `${formatDisplayDate(date)} ` +
      `${statusContent[status].title}`
    );

    if (date === selectedDate) {
      button.classList.add('selected');
    }

    if (status === 'closed') {
      button.innerHTML = `
        <span class="day-number">
          ${day}
        </span>

        <span class="closed-label">
          ปิด
        </span>
      `;
    } else {
      button.innerHTML = `
        <span class="day-number">
          ${day}
        </span>

        <span
          class="density-mark"
          aria-hidden="true"
        ></span>
      `;
    }

    button.onclick = () => {
      selectedDate = date;

      renderCalendar();
      renderSelectedStatus();
    };

    calendarDaysEl.appendChild(button);
  }

  todayBtn.classList.toggle(
    'hidden',
    viewMonth === initialDate.getMonth() &&
    viewYear === initialDate.getFullYear()
  );
}

/* =========================
   SELECTED STATUS
========================= */
function renderSelectedStatus() {
  const status = getStatus(selectedDate);
  const content = statusContent[status];

  selectedDateLabel.textContent =
    formatDisplayDate(selectedDate);

  selectedStatusTitle.textContent =
    content.title;

  selectedStatusText.textContent =
    content.text;

  /*
   * available และ low ใช้สีเดียวกัน
   * จึงเปลี่ยน class ของ low เป็น available
   * เฉพาะส่วนจุดแสดงสถานะด้านบน
   */
  const visualStatus =
    status === 'low'
      ? 'available'
      : status;

  selectedStatusDot.className =
    `status-dot ${visualStatus}`;
}

/* =========================
   STATUS
========================= */
function getStatus(date) {
  if (calendarStatus[date]) {
    return calendarStatus[date];
  }

  /*
   * วันที่ที่ไม่มีข้อมูลจาก API
   * หมายถึงไม่มีคิว
   * หน้าเว็บลูกค้าจะแสดงเป็นคิวว่าง
   */
  return 'available';
}

/* =========================
   MONTH NAVIGATION
========================= */
prevMonthBtn.onclick = () => {
  viewMonth--;

  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear--;
  }

  renderCalendar();
};

nextMonthBtn.onclick = () => {
  viewMonth++;

  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }

  renderCalendar();
};

todayBtn.onclick = () => {
  selectedDate = getTodayTH();

  const today = parseDate(selectedDate);

  viewMonth = today.getMonth();
  viewYear = today.getFullYear();

  renderCalendar();
  renderSelectedStatus();
};

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString(
    'sv-SE',
    {
      timeZone: 'Asia/Bangkok'
    }
  );
}

function parseDate(dateString) {
  const [
    year,
    month,
    day
  ] = dateString
    .split('-')
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function formatDate(
  year,
  month,
  day
) {
  return (
    `${year}-` +
    `${String(month).padStart(2, '0')}-` +
    `${String(day).padStart(2, '0')}`
  );
}

function formatDisplayDate(dateString) {
  return parseDate(dateString)
    .toLocaleDateString(
      'th-TH',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    );
}

init();

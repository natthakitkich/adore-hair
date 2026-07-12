const API = '';

/* =========================
   ELEMENTS
========================= */
const calendarTitle =
  document.getElementById('calendarTitle');

const calendarDaysEl =
  document.getElementById('calendarDays');

const prevMonthBtn =
  document.getElementById('prevMonth');

const nextMonthBtn =
  document.getElementById('nextMonth');

const todayBtn =
  document.getElementById('todayBtn');

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
   * ไม่มีคิว
   * ลูกค้าเห็นเป็นสถานะคิวว่างสีเขียว
   */
  available: {
    title: 'คิวว่าง',
    text: 'วันนี้ยังไม่มีคิว สามารถโทรสอบถามช่วงเวลาที่สะดวกกับทางร้านได้'
  },

  /*
   * มีคิวเล็กน้อย
   * ใช้สถานะและสีเดียวกับวันที่ไม่มีคิว
   */
  low: {
    title: 'คิวว่าง',
    text: 'ยังมีช่วงเวลาให้เลือก กรุณาโทรสอบถามช่วงเวลาว่างกับทางร้าน'
  },

  /*
   * คิวระดับปานกลาง
   * ใช้สีส้ม
   */
  medium: {
    title: 'คิวปานกลาง',
    text: 'ช่วงเวลาว่างเริ่มมีจำกัด แนะนำให้โทรสอบถามก่อนเข้ารับบริการ'
  },

  /*
   * คิวแน่น
   * ใช้สีแดง
   */
  high: {
    title: 'คิวค่อนข้างแน่น',
    text: 'คิววันนี้ค่อนข้างแน่น กรุณาโทรตรวจสอบก่อนหรือเลือกวันอื่น'
  },

  /*
   * ร้านปิด
   * ใช้สีเทา
   */
  closed: {
    title: 'ร้านปิด',
    text: 'วันนี้ร้านปิด กรุณาเลือกวันอื่นเพื่อตรวจสอบคิว'
  },

  unavailable: {
    title: 'ยังไม่สามารถตรวจสอบคิวได้',
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
    const res = await fetch(
      `${API}/public-calendar`
    );

    if (!res.ok) {
      throw new Error(
        'Unable to load public calendar'
      );
    }

    const data = await res.json();

    calendarStatus =
      data &&
      typeof data === 'object' &&
      !Array.isArray(data)
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

  const startDay =
    firstDay.getDay();

  const daysInMonth = new Date(
    viewYear,
    viewMonth + 1,
    0
  ).getDate();

  calendarTitle.textContent =
    firstDay.toLocaleDateString(
      'th-TH',
      {
        month: 'long',
        year: 'numeric'
      }
    );

  /* ช่องว่างก่อนวันที่ 1 */
  for (
    let index = 0;
    index < startDay;
    index++
  ) {
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

    const status =
      getStatus(date);

    const visualStatus =
      getVisualStatus(status);

    const button =
      document.createElement('button');

    button.type = 'button';

    /*
     * เก็บ class สถานะจริงไว้
     * แต่ available กับ low จะใช้ visual เป็น available เหมือนกัน
     */
    button.className =
      `day ${visualStatus}`;

    button.dataset.status =
      status;

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

  const isViewingCurrentMonth =
    viewMonth === initialDate.getMonth() &&
    viewYear === initialDate.getFullYear();

  todayBtn.classList.toggle(
    'hidden',
    isViewingCurrentMonth
  );
}

/* =========================
   SELECTED STATUS
========================= */
function renderSelectedStatus() {
  const status =
    getStatus(selectedDate);

  const visualStatus =
    getVisualStatus(status);

  const content =
    statusContent[status] ||
    statusContent.unavailable;

  selectedDateLabel.textContent =
    formatDisplayDate(selectedDate);

  selectedStatusTitle.textContent =
    content.title;

  selectedStatusText.textContent =
    content.text;

  selectedStatusDot.className =
    `status-dot ${visualStatus}`;
}

/* =========================
   STATUS
========================= */
function getStatus(date) {
  const status =
    calendarStatus[date];

  if (
    status === 'available' ||
    status === 'low' ||
    status === 'medium' ||
    status === 'high' ||
    status === 'closed'
  ) {
    return status;
  }

  /*
   * วันที่ไม่มีข้อมูลจาก API
   * หมายถึงไม่มีคิว
   */
  return 'available';
}

/*
 * available และ low
 * ใช้สีและรูปแบบเดียวกัน
 */
function getVisualStatus(status) {
  if (
    status === 'available' ||
    status === 'low'
  ) {
    return 'available';
  }

  if (
    status === 'medium' ||
    status === 'high' ||
    status === 'closed'
  ) {
    return status;
  }

  return 'unavailable';
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

  const today =
    parseDate(selectedDate);

  viewMonth =
    today.getMonth();

  viewYear =
    today.getFullYear();

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

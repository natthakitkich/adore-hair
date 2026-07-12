const API = '';
const OWNER_PIN = '1234';

/* =========================
   ELEMENTS
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

/* 🔊 SOUND BANNER (NEW) */
const soundBanner = document.getElementById('soundBanner');
const enableSoundBtn = document.getElementById('enableSoundBtn');

const calendarTitle = document.getElementById('calendarTitle');
const calendarDaysEl = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

const weekCustomerCountEl = document.getElementById('weekCustomerCount');
const monthCustomerCountEl = document.getElementById('monthCustomerCount');

const bookingForm = document.getElementById('bookingForm');
const bookingSubmitBtn = document.getElementById('bookingSubmitBtn');
const timeSelect = document.getElementById('time');
const listEl = document.getElementById('list');

/* CLOSED DAY */
const manageClosedDaysBtn = document.getElementById('manageClosedDaysBtn');
const closedDayBanner = document.getElementById('closedDayBanner');
const closedDayBannerText = document.getElementById('closedDayBannerText');
const closureOverlay = document.getElementById('closureOverlay');
const closureDate = document.getElementById('closureDate');
const closureStatus = document.getElementById('closureStatus');
const toggleClosureBtn = document.getElementById('toggleClosureBtn');
const publicClosureStatus = document.getElementById('publicClosureStatus');
const togglePublicClosureBtn = document.getElementById(
  'togglePublicClosureBtn'
);
const closeClosure = document.getElementById('closeClosure');

/* EDIT MODAL */
const editOverlay = document.getElementById('editOverlay');
const editDate = document.getElementById('editDate');
const editTime = document.getElementById('editTime');
const editStylist = document.getElementById('editStylist');
const editName = document.getElementById('editName');
const editPhone = document.getElementById('editPhone');
const editService = document.getElementById('editService');
const editNote = document.getElementById('editNote');

/* =========================
   STATE
========================= */
let bookings = [];
let calendarDensity = {};
let closedDays = new Set();
let publicClosedDays = new Set();
let selectedStylist = 'Bank';
let selectedDate = getTodayTH();
let editingBooking = null;

let viewMonth = new Date(selectedDate).getMonth();
let viewYear = new Date(selectedDate).getFullYear();

/* =========================
   🔊 SOUND ENABLE (NEW)
========================= */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function showSoundBannerIfNeeded() {
  if (!isIOS()) return;
  soundBanner?.classList.remove('hidden');
}

enableSoundBtn?.addEventListener('click', () => {
  if (typeof window.enableAdoreAudio === 'function') {
    window.enableAdoreAudio();
  }

  soundBanner.classList.add('hidden');
});

/* =========================
   LOGIN
========================= */
loginBtn.onclick = () => {
  const pin = pinInput.value.trim();
  loginMsg.textContent = '';

  if (pin.length !== 4) {
    loginMsg.textContent = 'กรุณาใส่ PIN 4 หลัก';
    return;
  }

  if (pin !== OWNER_PIN) {
    loginMsg.textContent = 'รหัสผ่านไม่ถูกต้อง';
    return;
  }

  localStorage.setItem('adore_logged_in', '1');
  loginOverlay.classList.add('hidden');
  init();

  showSoundBannerIfNeeded();
};

logoutBtn.onclick = () => {
  localStorage.removeItem('adore_logged_in');
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('adore_logged_in') === '1') {
    loginOverlay.classList.add('hidden');
    init();
    showSoundBannerIfNeeded();
  }
});

/* =========================
   INIT
========================= */
async function init() {
  bindStylistTabs();

  await Promise.all([
    loadClosedDays(),
    loadPublicClosedDays()
  ]);

  loadCalendar();
  loadBookings();
}

/* =========================
   CLOSED DAYS
========================= */
async function loadClosedDays() {
  try {
    const res = await fetch(`${API}/closed-days`);

    if (!res.ok) {
      throw new Error('Unable to load closed days');
    }

    const data = await res.json();
    closedDays = new Set(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('[ClosedDays] Load error', error);
    closedDays = new Set();
  }
}

async function loadPublicClosedDays() {
  try {
    const res = await fetch(`${API}/public-closed-days`);

    if (!res.ok) {
      throw new Error('Unable to load public closed days');
    }

    const data = await res.json();

    publicClosedDays = new Set(
      Array.isArray(data) ? data : []
    );
  } catch (error) {
    console.error('[PublicClosedDays] Load error', error);
    publicClosedDays = new Set();
  }
}

function isSelectedDateClosed() {
  return closedDays.has(selectedDate);
}

function isSelectedDatePublicClosed() {
  return publicClosedDays.has(selectedDate);
}

function renderBookingAvailability() {
  const isClosed = isSelectedDateClosed();

  closedDayBanner.classList.toggle('hidden', !isClosed);
  bookingForm.classList.toggle('shop-closed', isClosed);

  if (isClosed) {
    closedDayBannerText.textContent =
      `ร้านปิดวันที่ ${formatDisplayDate(selectedDate)} ไม่สามารถเพิ่มคิวใหม่ได้`;
  }

  bookingForm
    .querySelectorAll('input, select, textarea, button')
    .forEach(element => {
      element.disabled = isClosed;
    });

  bookingSubmitBtn.textContent =
    isClosed ? 'ร้านปิด' : 'จองคิว';
}

function openClosureModal() {
  closureDate.value = selectedDate;
  renderClosureModalState();
  closureOverlay.classList.remove('hidden');
}

function renderClosureModalState() {
  const date = closureDate.value;

  if (!date) {
    closureStatus.textContent = 'สถานะ: กรุณาเลือกวันที่';
    publicClosureStatus.textContent =
      'สถานะหน้าลูกค้า: กรุณาเลือกวันที่';

    toggleClosureBtn.disabled = true;
    togglePublicClosureBtn.disabled = true;
    return;
  }

  toggleClosureBtn.disabled = false;
  togglePublicClosureBtn.disabled = false;

  const isClosed = closedDays.has(date);
  const isPublicClosed = publicClosedDays.has(date);

  /* ปิดร้านทั้งระบบ */
  closureStatus.textContent = isClosed
    ? `สถานะ: ปิดร้านทั้งระบบ · ${formatDisplayDate(date)}`
    : `สถานะ: เปิดรับคิว · ${formatDisplayDate(date)}`;

  closureStatus.classList.toggle('closed', isClosed);
  closureStatus.classList.toggle('open', !isClosed);

  toggleClosureBtn.textContent = isClosed
    ? 'เปิดร้านทั้งระบบ'
    : 'ปิดร้านทั้งระบบ';

  toggleClosureBtn.classList.toggle('open-shop', isClosed);
  toggleClosureBtn.classList.toggle('close-shop', !isClosed);

  /* ปิดเฉพาะหน้าลูกค้า */
  publicClosureStatus.textContent = isPublicClosed
    ? `สถานะหน้าลูกค้า: แสดงว่าปิด · ${formatDisplayDate(date)}`
    : `สถานะหน้าลูกค้า: แสดงว่าเปิด · ${formatDisplayDate(date)}`;

  publicClosureStatus.classList.toggle(
    'closed',
    isPublicClosed
  );

  publicClosureStatus.classList.toggle(
    'open',
    !isPublicClosed
  );

  togglePublicClosureBtn.textContent = isPublicClosed
    ? 'กลับมาแสดงว่าเปิด'
    : 'แสดงว่าปิดเฉพาะหน้าลูกค้า';

  togglePublicClosureBtn.classList.toggle(
    'public-open-shop',
    isPublicClosed
  );

  togglePublicClosureBtn.classList.toggle(
    'public-close-shop',
    !isPublicClosed
  );
}

async function getBookingCountForDate(date) {
  if (date === selectedDate) {
    return bookings.length;
  }

  try {
    const res = await fetch(
      `${API}/bookings?date=${date}`
    );

    if (!res.ok) return 0;

    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

async function saveClosureState(date, shouldClose) {
  try {
    const res = await fetch(
      shouldClose
        ? `${API}/closed-days`
        : `${API}/closed-days/${encodeURIComponent(date)}`,
      {
        method: shouldClose ? 'POST' : 'DELETE',

        headers: shouldClose
          ? {
              'Content-Type': 'application/json'
            }
          : undefined,

        body: shouldClose
          ? JSON.stringify({ date })
          : undefined
      }
    );

    if (!res.ok) {
      showToast('บันทึกสถานะร้านไม่สำเร็จ');
      return;
    }

    if (shouldClose) {
      closedDays.add(date);
    } else {
      closedDays.delete(date);
    }

    renderCalendar();
    renderCalendarStats();
    renderBookingAvailability();
    renderClosureModalState();

    showToast(
      shouldClose
        ? 'ปิดร้านทั้งระบบเรียบร้อยแล้ว'
        : 'เปิดร้านทั้งระบบเรียบร้อยแล้ว'
    );
  } catch (error) {
    console.error('[ClosedDays] Save error', error);
    showToast('บันทึกสถานะร้านไม่สำเร็จ');
  }
}

async function savePublicClosureState(
  date,
  shouldClose
) {
  try {
    const res = await fetch(
      shouldClose
        ? `${API}/public-closed-days`
        : `${API}/public-closed-days/${encodeURIComponent(date)}`,
      {
        method: shouldClose ? 'POST' : 'DELETE',

        headers: shouldClose
          ? {
              'Content-Type': 'application/json'
            }
          : undefined,

        body: shouldClose
          ? JSON.stringify({ date })
          : undefined
      }
    );

    if (!res.ok) {
      showToast(
        'บันทึกสถานะหน้าลูกค้าไม่สำเร็จ'
      );
      return;
    }

    if (shouldClose) {
      publicClosedDays.add(date);
    } else {
      publicClosedDays.delete(date);
    }

    renderClosureModalState();

    showToast(
      shouldClose
        ? 'หน้าลูกค้าแสดงว่าปิดเรียบร้อยแล้ว'
        : 'หน้าลูกค้ากลับมาแสดงว่าเปิดแล้ว'
    );
  } catch (error) {
    console.error(
      '[PublicClosedDays] Save error',
      error
    );

    showToast(
      'บันทึกสถานะหน้าลูกค้าไม่สำเร็จ'
    );
  }
}

manageClosedDaysBtn.onclick = () => {
  openClosureModal();
};

closureDate.onchange = () => {
  renderClosureModalState();
};

toggleClosureBtn.onclick = async () => {
  const date = closureDate.value;

  if (!date) {
    showToast('กรุณาเลือกวันที่');
    return;
  }

  const isClosed = closedDays.has(date);

  if (isClosed) {
    openConfirm({
      title: 'เปิดร้านทั้งระบบ',

      message:
        `ยืนยันเปิดร้านทั้งระบบวันที่ ` +
        `${formatDisplayDate(date)} ใช่หรือไม่`,

      onConfirm: () =>
        saveClosureState(date, false)
    });

    return;
  }

  const bookingCount =
    await getBookingCountForDate(date);

  const message = bookingCount > 0
    ? (
        `วันที่นี้มีคิวอยู่แล้ว ${bookingCount} คิว ` +
        `การปิดร้านทั้งระบบจะไม่ลบคิวเดิม ` +
        `และจะไม่อนุญาตให้เพิ่มคิวใหม่ ` +
        `ยืนยันปิดร้านใช่หรือไม่`
      )
    : (
        `ยืนยันปิดร้านทั้งระบบวันที่ ` +
        `${formatDisplayDate(date)} ใช่หรือไม่`
      );

  openConfirm({
    title: 'ปิดร้านทั้งระบบ',
    message,

    onConfirm: () =>
      saveClosureState(date, true)
  });
};

togglePublicClosureBtn.onclick = () => {
  const date = closureDate.value;

  if (!date) {
    showToast('กรุณาเลือกวันที่');
    return;
  }

  const isPublicClosed =
    publicClosedDays.has(date);

  if (isPublicClosed) {
    openConfirm({
      title: 'แสดงว่าเปิดบนหน้าลูกค้า',

      message:
        `ยืนยันให้หน้าลูกค้ากลับมาแสดงว่าเปิด ` +
        `ในวันที่ ${formatDisplayDate(date)} ใช่หรือไม่`,

      onConfirm: () =>
        savePublicClosureState(date, false)
    });

    return;
  }

  openConfirm({
    title: 'ปิดเฉพาะหน้าลูกค้า',

    message:
      `หน้าลูกค้าจะแสดงว่าร้านปิดในวันที่ ` +
      `${formatDisplayDate(date)} ` +
      `แต่ระบบหลังบ้านยังสามารถเพิ่มและจัดการคิวได้ตามปกติ ` +
      `ยืนยันดำเนินการใช่หรือไม่`,

    onConfirm: () =>
      savePublicClosureState(date, true)
  });
};

closeClosure.onclick = () => {
  closureOverlay.classList.add('hidden');
};

/* =========================
   CALENDAR
========================= */
async function loadCalendar() {
  const res = await fetch(`${API}/calendar-days`);
  calendarDensity = await res.json();

  renderCalendar();
  renderCalendarStats();
}

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

  for (let i = 0; i < startDay; i++) {
    calendarDaysEl.appendChild(
      document.createElement('div')
    );
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date =
      `${viewYear}-` +
      `${String(viewMonth + 1).padStart(2, '0')}-` +
      `${String(d).padStart(2, '0')}`;

    const count = calendarDensity[date] || 0;
    const isClosed = closedDays.has(date);

    const el = document.createElement('div');
    el.className = 'day';

    /*
     * ปฏิทินหน้าแอดมินแสดงว่าปิด
     * เฉพาะกรณีปิดร้านทั้งระบบเท่านั้น
     *
     * publicClosedDays จะไม่เปลี่ยน
     * สีหรือสถานะปฏิทินหน้าแอดมิน
     */
    if (isClosed) {
      el.innerHTML = `
        <span class="day-number">${d}</span>
        <span class="day-closed-label">ปิด</span>
      `;

      el.classList.add('closed');

      el.setAttribute(
        'aria-label',
        `${formatDisplayDate(date)} ร้านปิด`
      );
    } else {
      el.textContent = d;
    }

    if (date === selectedDate) {
      el.classList.add('today');
    }

    if (
      !isClosed &&
      count > 0 &&
      count <= 5
    ) {
      el.classList.add('low');
    }

    if (
      !isClosed &&
      count > 5 &&
      count <= 10
    ) {
      el.classList.add('mid');
    }

    if (
      !isClosed &&
      count > 10
    ) {
      el.classList.add('high');
    }

    el.onclick = () => {
      selectedDate = date;

      loadBookings();
      renderCalendar();
      renderCalendarStats();
      renderBookingAvailability();
    };

    calendarDaysEl.appendChild(el);
  }
}

function renderCalendarStats() {
  if (
    !weekCustomerCountEl ||
    !monthCustomerCountEl
  ) {
    return;
  }

  const viewMonthStart =
    `${viewYear}-` +
    `${String(viewMonth + 1).padStart(2, '0')}-01`;

  const viewMonthEndDate = new Date(
    viewYear,
    viewMonth + 1,
    0
  );

  const viewMonthEnd =
    formatDateTH(viewMonthEndDate);

  const selected =
    new Date(`${selectedDate}T00:00:00`);

  const selectedIsInViewMonth =
    selected.getFullYear() === viewYear &&
    selected.getMonth() === viewMonth;

  const baseDate = selectedIsInViewMonth
    ? selected
    : new Date(viewYear, viewMonth, 1);

  const dayOfWeek = baseDate.getDay();

  const weekStart = new Date(baseDate);

  weekStart.setDate(
    baseDate.getDate() - dayOfWeek
  );

  const weekEnd = new Date(weekStart);

  weekEnd.setDate(
    weekStart.getDate() + 6
  );

  const weekStartText =
    formatDateTH(weekStart);

  const weekEndText =
    formatDateTH(weekEnd);

  let weekTotal = 0;
  let monthTotal = 0;

  Object.entries(calendarDensity)
    .forEach(([date, count]) => {
      if (
        date >= weekStartText &&
        date <= weekEndText
      ) {
        weekTotal += count;
      }

      if (
        date >= viewMonthStart &&
        date <= viewMonthEnd
      ) {
        monthTotal += count;
      }
    });

  weekCustomerCountEl.textContent =
    weekTotal;

  monthCustomerCountEl.textContent =
    monthTotal;
}

prevMonthBtn.onclick = () => {
  viewMonth--;

  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear--;
  }

  renderCalendar();
  renderCalendarStats();
};

nextMonthBtn.onclick = () => {
  viewMonth++;

  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }

  renderCalendar();
  renderCalendarStats();
};

/* =========================
   BOOKINGS
========================= */
async function loadBookings() {
  const res = await fetch(
    `${API}/bookings?date=${selectedDate}`
  );

  bookings = await res.json();

  renderSummary();
  renderTimeOptions();
  renderTable();
  renderBookingAvailability();
}

function bindStylistTabs() {
  document
    .querySelectorAll('.tab')
    .forEach(tab => {
      tab.onclick = () => {
        document
          .querySelector('.tab.active')
          .classList.remove('active');

        tab.classList.add('active');

        selectedStylist =
          tab.dataset.tab;

        renderTimeOptions();
        renderBookingAvailability();
      };
    });
}

function renderTimeOptions() {
  timeSelect.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time =
      `${String(h).padStart(2, '0')}:00:00`;

    const booked = bookings.find(
      booking =>
        booking.time === time &&
        booking.stylist === selectedStylist
    );

    const opt =
      document.createElement('option');

    opt.value = time;
    opt.textContent = time.slice(0, 5);

    if (booked) {
      opt.disabled = true;
    }

    timeSelect.appendChild(opt);
  }
}

/* =========================
   BOOKING SUBMIT
========================= */
bookingForm.onsubmit = async event => {
  event.preventDefault();

  /*
   * ปิดเฉพาะหน้าลูกค้า
   * ไม่กระทบการจองหลังบ้าน
   */
  if (isSelectedDateClosed()) {
    showToast(
      'ร้านปิด กรุณาเลือกวันอื่น'
    );

    return;
  }

  const gender =
    document.querySelector(
      '[name=gender]:checked'
    )?.value;

  if (
    !timeSelect.value ||
    !gender
  ) {
    showToast(
      'กรุณากรอกข้อมูลให้ครบถ้วน'
    );

    return;
  }

  const payload = {
    date: selectedDate,
    time: timeSelect.value,
    stylist: selectedStylist,

    name:
      document
        .getElementById('name')
        .value
        .trim(),

    phone:
      document
        .getElementById('phone')
        .value
        .trim(),

    gender,

    service:
      document
        .getElementById('service')
        .value
        .trim(),

    note:
      document
        .getElementById('note')
        .value
        .trim() || null
  };

  const res = await fetch(
    `${API}/bookings`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify(payload)
    }
  );

  if (res.status === 403) {
    closedDays.add(selectedDate);

    renderCalendar();
    renderBookingAvailability();

    showToast(
      'ร้านปิด กรุณาเลือกวันอื่น'
    );

    return;
  }

  if (res.status === 409) {
    showToast(
      'เวลานี้ถูกจองแล้ว'
    );

    return;
  }

  if (!res.ok) {
    showToast(
      'เกิดข้อผิดพลาด'
    );

    return;
  }

  showToast(
    'จองคิวสำเร็จแล้ว'
  );

  bookingForm.reset();

  document
    .querySelectorAll('[name=gender]')
    .forEach(radio => {
      radio.checked = false;
    });

  loadBookings();
  loadCalendar();
};

/* =========================
   SUMMARY
========================= */
function renderSummary() {
  const bank = bookings.filter(
    booking =>
      booking.stylist === 'Bank'
  ).length;

  const sindy = bookings.filter(
    booking =>
      booking.stylist === 'Sindy'
  ).length;

  const assist = bookings.filter(
    booking =>
      booking.stylist === 'Assist'
  ).length;

  document
    .getElementById('countBank')
    .textContent = bank;

  document
    .getElementById('countSindy')
    .textContent = sindy;

  document
    .getElementById('countAssist')
    .textContent = assist;

  document
    .getElementById('countTotal')
    .textContent =
      bank + sindy + assist;
}

/* =========================
   TABLE
========================= */
function renderTable() {
  listEl.innerHTML = '';

  bookings.forEach(booking => {
    const card =
      document.createElement('div');

    card.className = 'booking-card';

    card.innerHTML = `
      <div class="card-main">
        <div class="time-pill">
          ${booking.time.slice(0, 5)}
        </div>

        <div class="card-main-info">
          <span class="badge ${booking.stylist}">
            ${booking.stylist}
          </span>

          ${booking.gender === 'male' ? '👨' : '👩'}
        </div>

        <button class="ghost toggle-detail">
          ดู
        </button>
      </div>

      <div class="card-sub">
        ${booking.name}
        ${
          booking.service
            ? ` · ${booking.service}`
            : ''
        }
      </div>

      <div class="card-detail">
        ${
          booking.phone
            ? `
              <a
                href="tel:${booking.phone}"
                class="phone-call"
              >
                โทร: ${booking.phone}
              </a>
            `
            : `
              <div class="muted">
                ไม่มีเบอร์โทร
              </div>
            `
        }

        ${
          booking.note
            ? `
              <div class="card-sub">
                หมายเหตุ: ${booking.note}
              </div>
            `
            : ''
        }

        <div class="card-actions">
          <button class="ghost manage-btn">
            จัดการ
          </button>
        </div>
      </div>
    `;

    const toggleBtn =
      card.querySelector('.toggle-detail');

    toggleBtn.onclick = event => {
      event.stopPropagation();

      card.classList.toggle('expanded');

      toggleBtn.textContent =
        card.classList.contains('expanded')
          ? 'ย่อ'
          : 'ดู';
    };

    card
      .querySelector('.manage-btn')
      .onclick = event => {
        event.stopPropagation();
        openEditModal(booking);
      };

    listEl.appendChild(card);
  });
}

/* =========================
   EDIT MODAL
========================= */
function openEditModal(booking) {
  editingBooking = booking;

  editDate.value = booking.date;
  editStylist.value = booking.stylist;
  editName.value = booking.name;
  editPhone.value = booking.phone || '';
  editService.value = booking.service || '';
  editNote.value = booking.note || '';

  document
    .querySelectorAll('[name=editGender]')
    .forEach(radio => {
      radio.checked =
        radio.value === booking.gender;
    });

  generateEditTimeOptions(
    booking.date
  );

  editOverlay.classList.remove('hidden');
}

function generateEditTimeOptions(date) {
  editTime.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time =
      `${String(h).padStart(2, '0')}:00:00`;

    const conflict = bookings.find(
      booking =>
        booking.date === date &&
        booking.time === time &&
        booking.stylist ===
          editingBooking.stylist &&
        booking.id !==
          editingBooking.id
    );

    const opt =
      document.createElement('option');

    opt.value = time;
    opt.textContent = time.slice(0, 5);

    if (conflict) {
      opt.disabled = true;
    }

    if (time === editingBooking.time) {
      opt.selected = true;
    }

    editTime.appendChild(opt);
  }
}

document
  .getElementById('saveEdit')
  .onclick = async () => {
    const gender =
      document.querySelector(
        '[name=editGender]:checked'
      )?.value;

    /*
     * ตรวจเฉพาะวันปิดทั้งระบบ
     * วันปิดเฉพาะหน้าลูกค้า
     * ยังสามารถย้ายคิวเข้าได้
     */
    if (
      editDate.value !==
        editingBooking.date &&
      closedDays.has(editDate.value)
    ) {
      showToast(
        'วันที่เลือกเป็นวันปิดร้าน กรุณาเลือกวันอื่น'
      );

      return;
    }

    const res = await fetch(
      `${API}/bookings/${editingBooking.id}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          date: editDate.value,
          time: editTime.value,
          name: editName.value,
          phone: editPhone.value,
          gender,
          service: editService.value,
          note: editNote.value
        })
      }
    );

    if (res.status === 403) {
      closedDays.add(editDate.value);

      renderCalendar();

      showToast(
        'วันที่เลือกเป็นวันปิดร้าน กรุณาเลือกวันอื่น'
      );

      return;
    }

    if (res.status === 409) {
      showToast(
        'เวลานี้ถูกจองแล้ว'
      );

      return;
    }

    if (!res.ok) {
      showToast(
        'เกิดข้อผิดพลาด'
      );

      return;
    }

    showToast(
      'บันทึกเรียบร้อยแล้ว'
    );

    editOverlay.classList.add('hidden');

    loadBookings();
    loadCalendar();
  };

document
  .getElementById('deleteEdit')
  .onclick = () => {
    openConfirm({
      title: 'ลบคิว',

      message:
        'ยืนยันการลบคิวนี้ใช่หรือไม่',

      onConfirm: async () => {
        await fetch(
          `${API}/bookings/${editingBooking.id}`,
          {
            method: 'DELETE'
          }
        );

        showToast(
          'ลบคิวเรียบร้อยแล้ว'
        );

        editOverlay.classList.add('hidden');

        loadBookings();
        loadCalendar();
      }
    });
  };

document
  .getElementById('closeEdit')
  .onclick = () => {
    editOverlay.classList.add('hidden');
  };

/* =========================
   TOAST
========================= */
const toastEl =
  document.getElementById('toast');

let toastTimer = null;

function showToast(message) {
  toastEl.textContent = message;

  toastEl.classList.add('show');
  toastEl.classList.remove('hidden');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2200);
}

/* =========================
   CONFIRM
========================= */
const confirmOverlay =
  document.getElementById('confirmOverlay');

const confirmTitle =
  document.getElementById('confirmTitle');

const confirmMessage =
  document.getElementById('confirmMessage');

const confirmOk =
  document.getElementById('confirmOk');

const confirmCancel =
  document.getElementById('confirmCancel');

let confirmCallback = null;

function openConfirm({
  title,
  message,
  onConfirm
}) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmCallback = onConfirm;

  confirmOverlay.classList.remove('hidden');
}

confirmCancel.onclick = () => {
  confirmOverlay.classList.add('hidden');
  confirmCallback = null;
};

confirmOk.onclick = () => {
  const callback = confirmCallback;

  confirmOverlay.classList.add('hidden');
  confirmCallback = null;

  if (callback) {
    callback();
  }
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

function formatDateTH(date) {
  return date.toLocaleDateString(
    'sv-SE',
    {
      timeZone: 'Asia/Bangkok'
    }
  );
}

function formatDisplayDate(dateString) {
  const [
    year,
    month,
    day
  ] = dateString
    .split('-')
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return date.toLocaleDateString(
    'th-TH',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  );
}

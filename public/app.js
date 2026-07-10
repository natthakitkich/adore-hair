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
  await loadClosedDays();
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

function isSelectedDateClosed() {
  return closedDays.has(selectedDate);
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

  bookingSubmitBtn.textContent = isClosed ? 'ร้านปิด' : 'จองคิว';
}

function openClosureModal() {
  closureDate.value = selectedDate;
  renderClosureModalState();
  closureOverlay.classList.remove('hidden');
}

function renderClosureModalState() {
  const date = closureDate.value;
  const isClosed = closedDays.has(date);

  closureStatus.textContent = isClosed
    ? `สถานะ: ปิดร้าน · ${formatDisplayDate(date)}`
    : `สถานะ: เปิดร้าน · ${formatDisplayDate(date)}`;

  closureStatus.classList.toggle('closed', isClosed);
  closureStatus.classList.toggle('open', !isClosed);

  toggleClosureBtn.textContent = isClosed
    ? 'เปิดร้านวันที่นี้'
    : 'ปิดร้านวันที่นี้';

  toggleClosureBtn.classList.toggle('open-shop', isClosed);
  toggleClosureBtn.classList.toggle('close-shop', !isClosed);
}

async function getBookingCountForDate(date) {
  if (date === selectedDate) {
    return bookings.length;
  }

  try {
    const res = await fetch(`${API}/bookings?date=${date}`);
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
          ? { 'Content-Type': 'application/json' }
          : undefined,
        body: shouldClose ? JSON.stringify({ date }) : undefined
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
    closureOverlay.classList.add('hidden');

    showToast(shouldClose ? 'ปิดร้านเรียบร้อยแล้ว' : 'เปิดร้านเรียบร้อยแล้ว');
  } catch (error) {
    console.error('[ClosedDays] Save error', error);
    showToast('บันทึกสถานะร้านไม่สำเร็จ');
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
      title: 'เปิดร้าน',
      message: `ยืนยันเปิดร้านวันที่ ${formatDisplayDate(date)} ใช่หรือไม่`,
      onConfirm: () => saveClosureState(date, false)
    });
    return;
  }

  const bookingCount = await getBookingCountForDate(date);
  const message = bookingCount > 0
    ? `วันที่นี้มีคิวอยู่แล้ว ${bookingCount} คิว การปิดร้านจะไม่ลบคิวเดิม ยืนยันปิดร้านใช่หรือไม่`
    : `ยืนยันปิดร้านวันที่ ${formatDisplayDate(date)} ใช่หรือไม่`;

  openConfirm({
    title: 'ปิดร้าน',
    message,
    onConfirm: () => saveClosureState(date, true)
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

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  calendarTitle.textContent =
    firstDay.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  for (let i = 0; i < startDay; i++) {
    calendarDaysEl.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = calendarDensity[date] || 0;
    const isClosed = closedDays.has(date);

    const el = document.createElement('div');
    el.className = 'day';

    if (isClosed) {
      el.innerHTML = `
        <span class="day-number">${d}</span>
        <span class="day-closed-label">ปิด</span>
      `;
      el.classList.add('closed');
      el.setAttribute('aria-label', `${formatDisplayDate(date)} ร้านปิด`);
    } else {
      el.textContent = d;
    }

    if (date === selectedDate) el.classList.add('today');
    if (!isClosed && count > 0 && count <= 5) el.classList.add('low');
    if (!isClosed && count > 5 && count <= 10) el.classList.add('mid');
    if (!isClosed && count > 10) el.classList.add('high');

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
  if (!weekCustomerCountEl || !monthCustomerCountEl) return;

  const viewMonthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
  const viewMonthEndDate = new Date(viewYear, viewMonth + 1, 0);
  const viewMonthEnd = formatDateTH(viewMonthEndDate);

  const selected = new Date(`${selectedDate}T00:00:00`);
  const selectedIsInViewMonth =
    selected.getFullYear() === viewYear &&
    selected.getMonth() === viewMonth;

  const baseDate = selectedIsInViewMonth
    ? selected
    : new Date(viewYear, viewMonth, 1);

  const dayOfWeek = baseDate.getDay();
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() - dayOfWeek);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekStartText = formatDateTH(weekStart);
  const weekEndText = formatDateTH(weekEnd);

  let weekTotal = 0;
  let monthTotal = 0;

  Object.entries(calendarDensity).forEach(([date, count]) => {
    if (date >= weekStartText && date <= weekEndText) {
      weekTotal += count;
    }

    if (date >= viewMonthStart && date <= viewMonthEnd) {
      monthTotal += count;
    }
  });

  weekCustomerCountEl.textContent = weekTotal;
  monthCustomerCountEl.textContent = monthTotal;
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
  const res = await fetch(`${API}/bookings?date=${selectedDate}`);
  bookings = await res.json();

  renderSummary();
  renderTimeOptions();
  renderTable();
  renderBookingAvailability();
}

function bindStylistTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      selectedStylist = tab.dataset.tab;
      renderTimeOptions();
      renderBookingAvailability();
    };
  });
}

function renderTimeOptions() {
  timeSelect.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;
    const booked = bookings.find(
      b => b.time === time && b.stylist === selectedStylist
    );

    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0, 5);
    if (booked) opt.disabled = true;

    timeSelect.appendChild(opt);
  }
}

/* =========================
   BOOKING SUBMIT
========================= */
bookingForm.onsubmit = async (e) => {
  e.preventDefault();

  if (isSelectedDateClosed()) {
    showToast('ร้านปิด กรุณาเลือกวันอื่น');
    return;
  }

  const gender = document.querySelector('[name=gender]:checked')?.value;
  if (!timeSelect.value || !gender) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }

  const payload = {
    date: selectedDate,
    time: timeSelect.value,
    stylist: selectedStylist,
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    gender,
    service: document.getElementById('service').value.trim(),
    note: document.getElementById('note').value.trim() || null
  };

  const res = await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.status === 403) {
    closedDays.add(selectedDate);
    renderCalendar();
    renderBookingAvailability();
    showToast('ร้านปิด กรุณาเลือกวันอื่น');
    return;
  }

  if (res.status === 409) {
    showToast('เวลานี้ถูกจองแล้ว');
    return;
  }

  if (!res.ok) {
    showToast('เกิดข้อผิดพลาด');
    return;
  }

  showToast('จองคิวสำเร็จแล้ว');
  bookingForm.reset();
  document.querySelectorAll('[name=gender]').forEach(r => r.checked = false);
  loadBookings();
  loadCalendar();
};

/* =========================
   SUMMARY
========================= */
function renderSummary() {
  const bank = bookings.filter(b => b.stylist === 'Bank').length;
  const sindy = bookings.filter(b => b.stylist === 'Sindy').length;
  const assist = bookings.filter(b => b.stylist === 'Assist').length;

  document.getElementById('countBank').textContent = bank;
  document.getElementById('countSindy').textContent = sindy;
  document.getElementById('countAssist').textContent = assist;
  document.getElementById('countTotal').textContent = bank + sindy + assist;
}

/* =========================
   TABLE
========================= */
function renderTable() {
  listEl.innerHTML = '';

  bookings.forEach(b => {
    const card = document.createElement('div');
    card.className = 'booking-card';

    card.innerHTML = `
      <div class="card-main">
        <div class="time-pill">${b.time.slice(0,5)}</div>
        <div class="card-main-info">
          <span class="badge ${b.stylist}">${b.stylist}</span>
          ${b.gender === 'male' ? '👨' : '👩'}
        </div>
        <button class="ghost toggle-detail">ดู</button>
      </div>

      <div class="card-sub">${b.name}${b.service ? ' · ' + b.service : ''}</div>

      <div class="card-detail">
        ${b.phone
          ? `<a href="tel:${b.phone}" class="phone-call">โทร: ${b.phone}</a>`
          : `<div class="muted">ไม่มีเบอร์โทร</div>`}

        ${b.note ? `<div class="card-sub">หมายเหตุ: ${b.note}</div>` : ''}

        <div class="card-actions">
          <button class="ghost manage-btn">จัดการ</button>
        </div>
      </div>
    `;

    const toggleBtn = card.querySelector('.toggle-detail');
    toggleBtn.onclick = e => {
      e.stopPropagation();
      card.classList.toggle('expanded');
      toggleBtn.textContent = card.classList.contains('expanded') ? 'ย่อ' : 'ดู';
    };

    card.querySelector('.manage-btn').onclick = e => {
      e.stopPropagation();
      openEditModal(b);
    };

    listEl.appendChild(card);
  });
}

/* =========================
   EDIT MODAL
========================= */
function openEditModal(b) {
  editingBooking = b;

  editDate.value = b.date;
  editStylist.value = b.stylist;
  editName.value = b.name;
  editPhone.value = b.phone || '';
  editService.value = b.service || '';
  editNote.value = b.note || '';

  document.querySelectorAll('[name=editGender]').forEach(r => {
    r.checked = r.value === b.gender;
  });

  generateEditTimeOptions(b.date);
  editOverlay.classList.remove('hidden');
}

function generateEditTimeOptions(date) {
  editTime.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, '0')}:00:00`;

    const conflict = bookings.find(x =>
      x.date === date &&
      x.time === time &&
      x.stylist === editingBooking.stylist &&
      x.id !== editingBooking.id
    );

    const opt = document.createElement('option');
    opt.value = time;
    opt.textContent = time.slice(0,5);
    if (conflict) opt.disabled = true;
    if (time === editingBooking.time) opt.selected = true;

    editTime.appendChild(opt);
  }
}

document.getElementById('saveEdit').onclick = async () => {
  const gender = document.querySelector('[name=editGender]:checked')?.value;

  if (
    editDate.value !== editingBooking.date &&
    closedDays.has(editDate.value)
  ) {
    showToast('วันที่เลือกเป็นวันปิดร้าน กรุณาเลือกวันอื่น');
    return;
  }

  const res = await fetch(`${API}/bookings/${editingBooking.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: editDate.value,
      time: editTime.value,
      name: editName.value,
      phone: editPhone.value,
      gender,
      service: editService.value,
      note: editNote.value
    })
  });

  if (res.status === 403) {
    closedDays.add(editDate.value);
    renderCalendar();
    showToast('วันที่เลือกเป็นวันปิดร้าน กรุณาเลือกวันอื่น');
    return;
  }

  if (res.status === 409) {
    showToast('เวลานี้ถูกจองแล้ว');
    return;
  }

  if (!res.ok) {
    showToast('เกิดข้อผิดพลาด');
    return;
  }

  showToast('บันทึกเรียบร้อยแล้ว');
  editOverlay.classList.add('hidden');
  loadBookings();
  loadCalendar();
};

document.getElementById('deleteEdit').onclick = () => {
  openConfirm({
    title: 'ลบคิว',
    message: 'ยืนยันการลบคิวนี้ใช่หรือไม่',
    onConfirm: async () => {
      await fetch(`${API}/bookings/${editingBooking.id}`, { method: 'DELETE' });
      showToast('ลบคิวเรียบร้อยแล้ว');
      editOverlay.classList.add('hidden');
      loadBookings();
      loadCalendar();
    }
  });
};

document.getElementById('closeEdit').onclick = () => {
  editOverlay.classList.add('hidden');
};

/* =========================
   TOAST
========================= */
const toastEl = document.getElementById('toast');
let toastTimer = null;

function showToast(msg) {
  toastEl.textContent = msg;
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
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmOk = document.getElementById('confirmOk');
const confirmCancel = document.getElementById('confirmCancel');

let confirmCallback = null;

function openConfirm({ title, message, onConfirm }) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmCallback = onConfirm;
  confirmOverlay.classList.remove('hidden');
}

confirmCancel.onclick = () => {
  confirmOverlay.classList.add('hidden');
};

confirmOk.onclick = () => {
  if (confirmCallback) confirmCallback();
  confirmOverlay.classList.add('hidden');
};

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

function formatDateTH(date) {
  return date.toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

function formatDisplayDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  const $ = id => document.getElementById(id);
  const CREATE_DURATION = 60;

  let pending = [];
  let polling = false;
  let loggedIn = false;
  let loadVersion = 0;
  let editVersion = 0;
  let editDuration = 60;

  const escapeHTML = value => String(value ?? '').replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character])
  );

  const minutes = time => {
    const [hour, minute] = String(time).split(':').map(Number);
    return hour * 60 + minute;
  };

  function blocked(rows, date, time, duration, stylist, excludeId) {
    const start = minutes(time);
    const end = start + duration;

    return [...rows, ...pending].some(row => {
      if (row.date !== date || row.stylist !== stylist) return false;
      if (excludeId != null && String(row.id) === String(excludeId)) {
        return false;
      }
      const otherStart = minutes(row.time);
      const otherEnd = otherStart + Number(row.duration_minutes || 60);
      return start < otherEnd && end > otherStart;
    });
  }

  function requireLogin() {
    loggedIn = false;
    loginOverlay.classList.remove('hidden');
  }

  async function call(url, options = {}) {
    const response = await originalFetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) requireLogin();
    if (!response.ok) {
      throw new Error(result.error || 'ทำรายการไม่สำเร็จ');
    }
    return result;
  }

  window.fetch = async (input, options = {}) => {
    const inputURL =
      typeof input === 'string' || input instanceof URL
        ? String(input)
        : input.url;
    const url = new URL(inputURL, location.href);
    const method = String(
      options.method ||
      (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();
    const nextOptions = { ...options };

    if (
      url.origin === location.origin &&
      /^\/bookings(?:\/[^/]+)?$/.test(url.pathname) &&
      ['POST', 'PUT'].includes(method) &&
      typeof options.body === 'string'
    ) {
      const body = JSON.parse(options.body);
      body.duration_minutes =
        method === 'POST' ? CREATE_DURATION : editDuration;
      nextOptions.body = JSON.stringify(body);
    }

    const response = await originalFetch(input, nextOptions);
    if (url.origin === location.origin && response.status === 401) {
      requireLogin();
    }
    return response;
  };

  localStorage.removeItem('adore_logged_in');
  pinInput.removeAttribute('maxlength');
  pinInput.removeAttribute('pattern');
  pinInput.setAttribute('inputmode', 'text');
  pinInput.autocomplete = 'current-password';
  pinInput.placeholder = 'รหัสผ่านเจ้าของร้าน';

  const loginDescription = loginOverlay.querySelector('.modalBody p');
  if (loginDescription) {
    loginDescription.textContent = 'กรอกรหัสผ่านเจ้าของร้าน';
  }

  async function start() {
    loggedIn = true;
    loginOverlay.classList.add('hidden');

    // โหลดระบบคิวหลักก่อน
    await init();

    // ความผิดพลาดของคำขอออนไลน์ไม่ขวางระบบคิวหลัก
    try {
      await loadRequests();
    } catch (error) {
      console.warn('โหลดคำขอออนไลน์ไม่สำเร็จ:', error.message);
    }
  }

  loginBtn.onclick = async () => {
    loginBtn.disabled = true;
    loginMsg.textContent = '';
    try {
      await call('/owner/login', {
        method: 'POST',
        body: JSON.stringify({ password: pinInput.value })
      });
      pinInput.value = '';
      await start();
    } catch (error) {
      loginMsg.textContent = error.message;
    } finally {
      loginBtn.disabled = false;
    }
  };

  pinInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') loginBtn.click();
  });

  logoutBtn.onclick = async () => {
    try {
      await call('/owner/logout', { method: 'POST', body: '{}' });
      location.reload();
    } catch (error) {
      showToast(error.message);
    }
  };

  renderTimeOptions = function () {
    const previous = timeSelect.value;
    timeSelect.innerHTML = '';

    for (let hour = 13; hour <= 22; hour++) {
      const time = `${String(hour).padStart(2, '0')}:00:00`;
      const option = document.createElement('option');
      option.value = time;
      option.textContent = time.slice(0, 5);
      option.disabled = blocked(
        bookings, selectedDate, time, CREATE_DURATION, selectedStylist
      );
      timeSelect.appendChild(option);
    }

    const available = [...timeSelect.options].filter(x => !x.disabled);
    timeSelect.value = available.some(x => x.value === previous)
      ? previous
      : available[0]?.value || '';
  };

  loadBookings = async function () {
    const version = ++loadVersion;
    const date = selectedDate;
    try {
      const rows = await call(
        `/bookings?date=${encodeURIComponent(date)}`
      );
      if (version !== loadVersion || date !== selectedDate) return;
      bookings = rows;
      renderSummary();
      renderTimeOptions();
      renderTable();
      renderBookingAvailability();
    } catch (error) {
      showToast(error.message);
    }
  };

  // แสดงเวลาเริ่มนัด ไม่มีบรรทัดระยะเวลาหรือเวลาสิ้นสุด
  renderTable = function () {
    const expanded = new Set(
      [...listEl.querySelectorAll('.booking-card.expanded')]
        .map(card => card.dataset.id)
    );
    listEl.innerHTML = '';

    for (const booking of bookings) {
      const card = document.createElement('div');
      card.className = 'booking-card';
      card.dataset.id = String(booking.id);
      if (expanded.has(String(booking.id))) {
        card.classList.add('expanded');
      }

      const cleanPhone =
        String(booking.phone || '').replace(/[^\d+]/g, '');

      card.innerHTML = `
        <div class="card-main">
          <div class="time-pill">
            ${escapeHTML(booking.time.slice(0, 5))}
          </div>
          <div class="card-main-info">
            <span class="badge ${escapeHTML(booking.stylist)}">
              ${escapeHTML(booking.stylist)}
            </span>
            ${booking.gender === 'male' ? '👨' : '👩'}
          </div>
          <button class="ghost toggle-detail" type="button">
            ${card.classList.contains('expanded') ? 'ย่อ' : 'ดู'}
          </button>
        </div>
        <div class="card-sub">
          ${escapeHTML(booking.name)}
          ${booking.service ? ` · ${escapeHTML(booking.service)}` : ''}
        </div>
        <div class="card-detail">
          ${
            cleanPhone
              ? `<a class="phone-call" href="tel:${cleanPhone}">
                   โทร: ${escapeHTML(booking.phone)}
                 </a>`
              : '<div class="muted">ไม่มีเบอร์โทร</div>'
          }
          ${
            booking.note
              ? `<div class="card-sub">
                   หมายเหตุ: ${escapeHTML(booking.note)}
                 </div>`
              : ''
          }
          <div class="card-actions">
            <button class="ghost manage-btn" type="button">
              จัดการ
            </button>
          </div>
        </div>
      `;

      card.querySelector('.toggle-detail').onclick = event => {
        event.stopPropagation();
        card.classList.toggle('expanded');
        event.currentTarget.textContent =
          card.classList.contains('expanded') ? 'ย่อ' : 'ดู';
      };
      card.querySelector('.manage-btn').onclick = () => {
        openEditModal(booking);
      };
      listEl.appendChild(card);
    }
  };

  const originalOpenEdit = openEditModal;
  openEditModal = function (booking) {
    editDuration = Number(booking.duration_minutes || 60);
    originalOpenEdit(booking);
  };

  generateEditTimeOptions = async function (date) {
    if (!editingBooking || !date) return;
    const version = ++editVersion;
    const current = editingBooking;
    const previous = editTime.value || current.time;

    editTime.disabled = true;
    $('saveEdit').disabled = true;

    try {
      const rows = await call(
        `/bookings?date=${encodeURIComponent(date)}`
      );
      if (version !== editVersion || editingBooking !== current) return;
      editTime.innerHTML = '';

      for (let hour = 13; hour <= 22; hour++) {
        const time = `${String(hour).padStart(2, '0')}:00:00`;
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time.slice(0, 5);
        option.disabled = blocked(
          rows, date, time, editDuration, current.stylist, current.id
        );
        editTime.appendChild(option);
      }

      const available = [...editTime.options].filter(x => !x.disabled);
      editTime.value = available.some(x => x.value === previous)
        ? previous
        : available[0]?.value || '';
      $('saveEdit').disabled = !editTime.value;
    } catch (error) {
      showToast(error.message);
    } finally {
      if (version === editVersion) editTime.disabled = false;
    }
  };

  editDate.onchange = () => {
    generateEditTimeOptions(editDate.value);
  };

  $('saveEdit').onclick = async () => {
    if (!editingBooking || !editTime.value) return;
    const button = $('saveEdit');
    button.disabled = true;

    try {
      await call(
        `/bookings/${encodeURIComponent(editingBooking.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            date: editDate.value,
            time: editTime.value,
            name: editName.value.trim(),
            phone: editPhone.value.trim(),
            gender:
              document.querySelector('[name=editGender]:checked')?.value,
            service: editService.value.trim(),
            note: editNote.value.trim(),
            duration_minutes: editDuration
          })
        }
      );
      editOverlay.classList.add('hidden');
      showToast('บันทึกเรียบร้อยแล้ว');
      await Promise.all([loadBookings(), loadCalendar()]);
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
  };

  $('deleteEdit').onclick = () => {
    if (!editingBooking) return;
    const id = editingBooking.id;

    openConfirm({
      title: 'ลบคิว',
      message:
        'ยืนยันลบคิวนี้ใช่หรือไม่ หากเป็นคิวออนไลน์ ลูกค้าจะเห็นสถานะยกเลิก',
      onConfirm: async () => {
        try {
          await call(`/bookings/${encodeURIComponent(id)}`, {
            method: 'DELETE'
          });
          editOverlay.classList.add('hidden');
          showToast('ลบคิวเรียบร้อยแล้ว');
          await Promise.all([loadBookings(), loadCalendar()]);
        } catch (error) {
          showToast(error.message);
        }
      }
    });
  };

  async function loadRequests() {
    pending = await call('/owner/requests');
    renderTimeOptions();
  }

  async function refresh() {
    if (!loggedIn || polling || document.hidden) return;
    polling = true;

    try {
      const tasks = [loadRequests()];

      if (editOverlay.classList.contains('hidden')) {
        tasks.push(
          loadBookings(),
          loadCalendar(),
          loadClosedDays(),
          loadPublicClosedDays()
        );
      }

      const results = await Promise.allSettled(tasks);
      for (const result of results) {
        if (result.status === 'rejected') {
          console.warn(result.reason);
        }
      }
      renderCalendar();
      renderBookingAvailability();
    } finally {
      polling = false;
    }
  }

  setInterval(refresh, 15000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refresh();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await call('/owner/session');
      await start();
    } catch (error) {
      requireLogin();
      loginMsg.textContent = error.message;
    }
  });
})();
// END ADORE OWNER REPAIR

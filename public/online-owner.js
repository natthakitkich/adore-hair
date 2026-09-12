(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  const $ = id => document.getElementById(id);

  let pending = [];
  let knownPending = null;
  let polling = false;
  let loggedIn = false;
  let audioContext = null;
  let loadVersion = 0;
  let editVersion = 0;

  const escapeHTML = value => String(value ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );

  const minutes = time => {
    const [h, m] = String(time).split(':').map(Number);
    return h * 60 + m;
  };

  const timeText = total =>
    `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

  function blocked(rows, date, time, duration, stylist, excludeId) {
    const start = minutes(time);
    const end = start + duration;

    return [...rows, ...pending].some(row => {
      if (row.date !== date || row.stylist !== stylist) return false;
      if (excludeId != null && String(row.id) === String(excludeId)) return false;

      const otherStart = minutes(row.time);
      const otherEnd = otherStart + Number(row.duration_minutes || 60);

      return start < otherEnd && end > otherStart;
    });
  }

  function makeDuration(id) {
    const select = document.createElement('select');
    select.id = id;

    for (let value = 30; value <= 600; value += 30) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = `${value} นาที`;
      option.selected = value === 60;
      select.appendChild(option);
    }

    return select;
  }

  // เพิ่มช่องระยะเวลาในฟอร์มเดิม
  const durationBox = document.createElement('div');
  const durationLabel = document.createElement('label');
  durationLabel.className = 'field-label';
  durationLabel.textContent = 'ระยะเวลาบริการ';

  const createDuration = makeDuration('onlineCreateDuration');
  durationBox.append(durationLabel, createDuration);

  bookingForm.insertBefore(durationBox, bookingForm.lastElementChild);

  const editDuration = makeDuration('onlineEditDuration');
  const editDurationLabel = document.createElement('label');
  editDurationLabel.className = 'field-label';
  editDurationLabel.textContent = 'ระยะเวลาบริการ';

  editNote.parentNode.insertBefore(editDurationLabel, editNote);
  editNote.parentNode.insertBefore(editDuration, editNote);

  // แผงคำขอออนไลน์
  const panel = document.createElement('section');
  panel.className = 'panel online-owner-panel';

  panel.innerHTML = `
    <div class="online-panel-top">
      <h2>คำขอจองออนไลน์ <span id="onlineCount">0</span></h2>
      <button id="onlineRefresh" type="button" class="ghost">รีเฟรช</button>
    </div>
    <p id="onlineOwnerMessage" class="muted"></p>
    <button id="onlineSound" type="button" class="ghost">
      เปิดเสียงแจ้งเตือน
    </button>
    <div id="onlineRequests"></div>
  `;

  document.querySelector('.wrap').prepend(panel);

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
    if (!response.ok) throw new Error(result.error || 'ทำรายการไม่สำเร็จ');

    return result;
  }

  // เพิ่ม duration ในคำขอจาก app.js เดิม
  window.fetch = async (input, options = {}) => {
    const url = new URL(
      typeof input === 'string' ? input : input.url,
      location.href
    );

    const method = String(options.method || 'GET').toUpperCase();
    let nextOptions = { ...options };

    if (
      url.origin === location.origin &&
      /^\/bookings(?:\/[^/]+)?$/.test(url.pathname) &&
      ['POST', 'PUT'].includes(method) &&
      typeof options.body === 'string'
    ) {
      const body = JSON.parse(options.body);

      body.duration_minutes = Number(
        method === 'POST' ? createDuration.value : editDuration.value
      );

      nextOptions.body = JSON.stringify(body);
    }

    const response = await originalFetch(input, nextOptions);

    if (url.origin === location.origin && response.status === 401) {
      requireLogin();
    }

    return response;
  };

  // ปิดการใช้ flag login และ PIN ฝั่งเว็บของเวอร์ชันเดิม
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

    await loadRequests();
    await init();
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
      await call('/owner/logout', {
        method: 'POST',
        body: '{}'
      });
      location.reload();
    } catch (error) {
      showToast(error.message);
    }
  };

  // เวลาคิวใหม่ คำนึงถึง duration และ pending
  renderTimeOptions = function () {
    const previous = timeSelect.value;
    timeSelect.innerHTML = '';

    for (let hour = 13; hour <= 22; hour++) {
      const time = `${String(hour).padStart(2, '0')}:00:00`;
      const option = document.createElement('option');

      option.value = time;
      option.textContent = time.slice(0, 5);
      option.disabled = blocked(
        bookings,
        selectedDate,
        time,
        Number(createDuration.value),
        selectedStylist
      );

      timeSelect.appendChild(option);
    }

    const available = [...timeSelect.options].filter(x => !x.disabled);
    timeSelect.value = available.some(x => x.value === previous)
      ? previous
      : available[0]?.value || '';
  };

  createDuration.onchange = () => renderTimeOptions();

  // โหลดคิวพร้อมกันหลายครั้ง ให้ใช้ผลของครั้งล่าสุด
  loadBookings = async function () {
    const version = ++loadVersion;
    const date = selectedDate;

    try {
      const rows = await call(`/bookings?date=${encodeURIComponent(date)}`);
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

  // คงรูปแบบ card เดิม พร้อม escape ข้อมูลที่ลูกค้ากรอก
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

      if (expanded.has(String(booking.id))) card.classList.add('expanded');

      const start = minutes(booking.time);
      const end = start + Number(booking.duration_minutes || 60);
      const cleanPhone = String(booking.phone || '').replace(/[^\d+]/g, '');

      card.innerHTML = `
        <div class="card-main">
          <div class="time-pill">${escapeHTML(booking.time.slice(0, 5))}</div>
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
          <div class="card-sub">
            ${escapeHTML(timeText(start))}–${escapeHTML(timeText(end))}
            · ${Number(booking.duration_minutes || 60)} นาที
          </div>
          ${
            cleanPhone
              ? `<a class="phone-call" href="tel:${cleanPhone}">
                   โทร: ${escapeHTML(booking.phone)}
                 </a>`
              : '<div class="muted">ไม่มีเบอร์โทร</div>'
          }
          ${
            booking.note
              ? `<div class="card-sub">หมายเหตุ: ${escapeHTML(booking.note)}</div>`
              : ''
          }
          <div class="card-actions">
            <button class="ghost manage-btn" type="button">จัดการ</button>
          </div>
        </div>
      `;

      card.querySelector('.toggle-detail').onclick = event => {
        event.stopPropagation();
        card.classList.toggle('expanded');
        event.currentTarget.textContent =
          card.classList.contains('expanded') ? 'ย่อ' : 'ดู';
      };

      card.querySelector('.manage-btn').onclick = () => openEditModal(booking);
      listEl.appendChild(card);
    }
  };

  const originalOpenEdit = openEditModal;

  openEditModal = function (booking) {
    editDuration.value = String(booking.duration_minutes || 60);
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
      const rows = await call(`/bookings?date=${encodeURIComponent(date)}`);

      if (version !== editVersion || editingBooking !== current) return;

      editTime.innerHTML = '';

      for (let hour = 13; hour <= 22; hour++) {
        const time = `${String(hour).padStart(2, '0')}:00:00`;
        const option = document.createElement('option');

        option.value = time;
        option.textContent = time.slice(0, 5);
        option.disabled = blocked(
          rows,
          date,
          time,
          Number(editDuration.value),
          current.stylist,
          current.id
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

  editDate.onchange = () => generateEditTimeOptions(editDate.value);
  editDuration.onchange = () => generateEditTimeOptions(editDate.value);

  $('saveEdit').onclick = async () => {
    if (!editingBooking || !editTime.value) return;

    const button = $('saveEdit');
    button.disabled = true;

    try {
      await call(`/bookings/${encodeURIComponent(editingBooking.id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          date: editDate.value,
          time: editTime.value,
          name: editName.value.trim(),
          phone: editPhone.value.trim(),
          gender: document.querySelector('[name=editGender]:checked')?.value,
          service: editService.value.trim(),
          note: editNote.value.trim(),
          duration_minutes: Number(editDuration.value)
        })
      });

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
      message: 'ยืนยันลบคิวนี้ใช่หรือไม่ หากเป็นคิวออนไลน์ ลูกค้าจะเห็นสถานะยกเลิก',
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

  function beep() {
    if (!audioContext || audioContext.state !== 'running') return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.3
    );

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  }

  $('onlineSound').onclick = async () => {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('อุปกรณ์นี้ไม่รองรับเสียงแจ้งเตือนบนเว็บ');

      audioContext ||= new Audio();
      await audioContext.resume();
      beep();
      $('onlineSound').textContent = 'เปิดเสียงแจ้งเตือนแล้ว';
    } catch (error) {
      showToast(error.message);
    }
  };

  function renderRequests() {
    $('onlineCount').textContent = pending.length;
    const container = $('onlineRequests');
    container.innerHTML = '';

    if (!pending.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'ไม่มีคำขอรออนุมัติ';
      container.appendChild(p);
      return;
    }

    for (const request of pending) {
      const item = document.createElement('article');
      item.className = 'online-request-card';

      const detail = document.createElement('p');
      const service = request.gender === 'female' ? 'ตัดผมหญิง' : 'ตัดผมชาย';

      detail.textContent = [
        `${request.customer_name} · ${service}`,
        `${formatDisplayDate(request.date)}`,
        `${request.time.slice(0, 5)}–${timeText(minutes(request.time) + request.duration_minutes)}`,
        `ช่าง ${request.stylist} · ${request.phone}`,
        request.booking_code,
        request.line_sent_at
          ? 'LINE รับข้อความแจ้งเตือนแล้ว'
          : request.line_error
            ? 'ส่ง LINE ยังไม่สำเร็จ ระบบจะลองใหม่'
            : 'กำลังส่งแจ้งเตือน LINE'
      ].join('\n');

      const actions = document.createElement('div');
      actions.className = 'online-actions';

      for (const [action, label] of [
        ['approve', 'อนุมัติ'],
        ['reject', 'ปฏิเสธ']
      ]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = action === 'approve' ? 'primary' : 'danger';
        button.textContent = label;

        button.onclick = () => openConfirm({
          title: `${label}คำขอ`,
          message: `${label}คำขอของ ${request.customer_name} ใช่หรือไม่`,
          onConfirm: async () => {
            button.disabled = true;

            try {
              const result = await call(
                `/owner/requests/${request.id}/${action}`,
                { method: 'POST', body: '{}' }
              );

              const labels = {
                pending: 'รออนุมัติ',
                confirmed: 'ยืนยันการจองแล้ว',
                rejected: 'ปฏิเสธแล้ว',
                cancelled: 'ยกเลิกแล้ว'
              };

              showToast(labels[result.status] || 'บันทึกแล้ว');

              await loadRequests();
              await Promise.all([loadBookings(), loadCalendar()]);
            } catch (error) {
              showToast(error.message);
            } finally {
              button.disabled = false;
            }
          }
        });

        actions.appendChild(button);
      }

      item.append(detail, actions);
      container.appendChild(item);
    }
  }

  async function loadRequests() {
    const rows = await call('/owner/requests');
    const current = new Set(rows.map(x => x.id));

    if (knownPending && rows.some(x => !knownPending.has(x.id))) {
      beep();
    }

    knownPending = current;
    pending = rows;
    renderRequests();
    renderTimeOptions();
  }

  async function refresh() {
    if (!loggedIn || polling || document.hidden) return;
    polling = true;

    try {
      await loadRequests();

      // ไม่รื้อรายการคิวขณะกำลังเปิดหน้าต่างแก้ไข
      if (editOverlay.classList.contains('hidden')) {
        await Promise.all([
          loadBookings(),
          loadCalendar(),
          loadClosedDays(),
          loadPublicClosedDays()
        ]);

        renderCalendar();
        renderBookingAvailability();
      }

      $('onlineOwnerMessage').textContent = '';
    } catch (error) {
      $('onlineOwnerMessage').textContent = error.message;
    } finally {
      polling = false;
    }
  }

  $('onlineRefresh').onclick = refresh;
  setInterval(refresh, 15000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refresh();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const session = await call('/owner/session');
      await start();

      if (!session.line_ready) {
        $('onlineOwnerMessage').textContent =
          'ยังตั้งค่า LINE ไม่ครบ ระบบจองออนไลน์ยังไม่เปิดรับคำขอ';
      }
    } catch {
      requireLogin();
    }
  });
})();

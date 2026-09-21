/* Owner-only quick actions: direct special booking + stylist blocking.
   Loaded AFTER online-owner.js. Calendar and normal booking behavior stay unchanged. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const STYLISTS = ['Bank', 'Sindy'];
  const SPECIAL_DURATION = 60;

  const esc = value => String(value ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );

  const hh = value => {
    const hour = Math.floor(value / 60);
    const minute = value % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const toMinute = time => {
    const [hour, minute] = String(time).slice(0, 5).split(':').map(Number);
    return hour * 60 + minute;
  };

  const overlaps = (start, duration, otherStart, otherDuration) => {
    const end = start + duration;
    const otherEnd = otherStart + otherDuration;
    return start < otherEnd && end > otherStart;
  };

  let state = {
    date: '',
    rules: [],
    shop_closed: false
  };

  let refreshVersion = 0;
  let bookingVersion = 0;
  let busy = false;
  let returnFocus = null;

  /* =========================
     QUICK ACTION PANEL
  ========================= */
  const panel = document.createElement('section');
  panel.className = 'panel special-hours';
  panel.innerHTML = `
    <details id="shDisclosure" class="sh-disclosure">
      <summary>
        <div class="sh-summary-copy">
          <div class="sh-summary-title">เปิด-ปิดคิวพิเศษช่าง</div>
          <div id="shSummary" class="muted"></div>
        </div>
      </summary>

      <div class="sh-content">
        <div class="sh-heading sh-main-heading">
          <p id="shDate" class="muted"></p>
          <button id="shRefresh" type="button" class="ghost">รีเฟรช</button>
        </div>

        <div class="sh-quick-actions">
          <button id="shOpenSpecial" type="button" class="primary">
            ＋ เพิ่มคิวพิเศษ
          </button>
          <button id="shOpenBlock" type="button" class="ghost">
            ปิดคิวช่าง
          </button>
        </div>

        <p id="shStatus" role="status" class="muted"></p>
        <div id="shRows" class="sh-rows"></div>
      </div>
    </details>
  `;

  bookingForm.closest('.panel').before(panel);

  /* =========================
     MODALS
  ========================= */
  document.body.insertAdjacentHTML('beforeend', `
    <div id="shSpecialOverlay" class="overlay hidden special-hours" role="dialog" aria-modal="true" aria-labelledby="shSpecialTitle">
      <div class="modal">
        <div class="modalBody">
          <h2 id="shSpecialTitle">เพิ่มคิวพิเศษ</h2>
          <p class="muted">
            เพิ่มนัดให้ช่างโดยตรง แม้อยู่นอกเวลาปกติ โดยจะไม่เปิดเวลาอื่นเพิ่ม
          </p>

          <form id="shSpecialForm" class="sh-form">
            <label class="field-label" for="shSpecialStylist">ช่าง</label>
            <select id="shSpecialStylist" required>
              <option value="Bank">Bank</option>
              <option value="Sindy">Sindy</option>
            </select>

            <label class="field-label" for="shSpecialDate">วันที่</label>
            <input id="shSpecialDate" type="date" required>

            <label class="field-label" for="shSpecialTime">เวลานัด</label>
            <select id="shSpecialTime" required></select>
            <p id="shSpecialTimeHelp" class="muted sh-inline-help"></p>

            <label class="field-label" for="shSpecialName">ชื่อลูกค้า</label>
            <input id="shSpecialName" maxlength="100" required>

            <label class="field-label" for="shSpecialPhone">เบอร์โทร</label>
            <input id="shSpecialPhone" type="tel" inputmode="tel" maxlength="20">

            <label class="field-label" for="shSpecialGender">เพศ</label>
            <select id="shSpecialGender" required>
              <option value="">เลือกเพศ</option>
              <option value="male">ชาย</option>
              <option value="female">หญิง</option>
            </select>

            <label class="field-label" for="shSpecialService">ทำอะไร</label>
            <select id="shSpecialService" required>
              <option value="">เลือกบริการ</option>
              <option value="ตัดผมชาย">ตัดผมชาย</option>
              <option value="ตัดผมหญิง">ตัดผมหญิง</option>
              <option value="other">อื่น ๆ (พิมพ์เอง)</option>
            </select>

            <input
              id="shSpecialCustomService"
              class="hidden"
              maxlength="200"
              aria-label="รายละเอียดบริการอื่น ๆ"
              placeholder="ระบุบริการ เช่น ทำสี ดัดผม ยืดผม"
            >

            <label class="field-label" for="shSpecialNote">หมายเหตุ</label>
            <textarea id="shSpecialNote" maxlength="2000"></textarea>

            <button id="shSpecialSave" class="primary" type="submit">
              บันทึกคิวพิเศษ
            </button>
          </form>

          <p id="shSpecialError" role="alert"></p>
          <button id="shSpecialClose" class="ghost" type="button">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>

    <div id="shBlockOverlay" class="overlay hidden special-hours" role="dialog" aria-modal="true" aria-labelledby="shBlockTitle">
      <div class="modal">
        <div class="modalBody">
          <h2 id="shBlockTitle">ปิดคิวช่าง</h2>
          <p class="muted">
            ปิดรับคิวใหม่เฉพาะช่างและช่วงเวลาที่เลือก คิวเดิมจะไม่ถูกลบ
          </p>

          <form id="shBlockForm" class="sh-form">
            <label class="field-label" for="shBlockStylist">ช่าง</label>
            <select id="shBlockStylist" required>
              <option value="Bank">Bank</option>
              <option value="Sindy">Sindy</option>
            </select>

            <label class="field-label" for="shBlockDate">วันที่</label>
            <input id="shBlockDate" type="date" required>

            <label class="field-label" for="shBlockKind">ปิดคิว</label>
            <select id="shBlockKind" required>
              <option value="partial">บางช่วง</option>
              <option value="day">ทั้งวัน</option>
            </select>

            <div id="shBlockRange" class="sh-range">
              <div>
                <label class="field-label" for="shBlockFrom">ตั้งแต่</label>
                <select id="shBlockFrom"></select>
              </div>
              <div>
                <label class="field-label" for="shBlockUntil">ถึงก่อนเวลา</label>
                <select id="shBlockUntil"></select>
              </div>
            </div>

            <label class="field-label" for="shBlockNote">เหตุผล / หมายเหตุ</label>
            <input id="shBlockNote" maxlength="200" placeholder="เช่น ติดธุระ">

            <button id="shBlockSave" class="primary" type="submit">
              บันทึกการปิดคิว
            </button>
          </form>

          <p id="shBlockError" role="alert"></p>
          <button id="shBlockClose" class="ghost" type="button">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>
  `);

  /* =========================
     TIME OPTIONS
  ========================= */
  for (let value = 0; value <= 1380; value += 30) {
    $('shSpecialTime').add(new Option(hh(value), `${hh(value)}:00`));
  }

  for (let value = 0; value <= 1440; value += 30) {
    if (value < 1440) {
      $('shBlockFrom').add(new Option(hh(value), String(value)));
    }

    if (value > 0) {
      $('shBlockUntil').add(
        new Option(
          value === 1440 ? '24:00 (สิ้นวัน)' : hh(value),
          String(value)
        )
      );
    }
  }

  /* =========================
     API HELPERS
  ========================= */
  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data.error || 'ทำรายการไม่สำเร็จ กรุณาลองใหม่'
      );
      error.status = response.status;
      error.code = data.code || '';
      error.data = data;
      throw error;
    }

    return data;
  }

  const post = (url, data) => api(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  function setBusy(value) {
    busy = value;

    for (const id of [
      'shSpecialSave',
      'shSpecialClose',
      'shBlockSave',
      'shBlockClose'
    ]) {
      const element = $(id);
      if (element) element.disabled = value;
    }
  }

  function openModal(id, focusId) {
    returnFocus = document.activeElement;
    $(id).classList.remove('hidden');
    requestAnimationFrame(() => $(focusId)?.focus());
  }

  function closeModal(id, force = false) {
    if (busy && !force) return;
    $(id).classList.add('hidden');

    if (returnFocus?.isConnected) {
      returnFocus.focus();
    }
  }

  for (const id of ['shSpecialOverlay', 'shBlockOverlay']) {
    $(id).addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal(id);
        return;
      }

      if (event.key !== 'Tab') return;

      const items = [...$(id).querySelectorAll(
        'button,input,select,textarea,[tabindex="0"]'
      )].filter(element =>
        !element.disabled &&
        !element.hidden &&
        !element.closest('.hidden')
      );

      const first = items[0];
      const last = items.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });
  }

  /* =========================
     RENDER CURRENT BLOCKS
  ========================= */
  function ruleLabel(rule) {
    if (
      rule.kind === 'closed' &&
      Number(rule.start_min) === 0 &&
      Number(rule.end_min) === 1440
    ) {
      return 'ปิดคิวทั้งวัน';
    }

    if (rule.kind === 'extra') {
      return `ช่วงเปิดพิเศษเดิม ${hh(Number(rule.start_min))}–${hh(Number(rule.end_min))}`;
    }

    return `ปิดคิว ${hh(Number(rule.start_min))}–${hh(Number(rule.end_min))}`;
  }

  function render() {
    const displayDate = formatDisplayDate(state.date || selectedDate);
    $('shDate').textContent = displayDate;
    $('shSummary').textContent = displayDate;

    if (state.shop_closed) {
      $('shStatus').textContent =
        'ร้านปิดทั้งวัน · ต้องเปิดร้านก่อนจึงจะเพิ่มคิวใหม่ได้';
    } else {
      $('shStatus').textContent =
        'เพิ่มคิวพิเศษได้โดยตรง · การปิดคิวมีผลเฉพาะคิวใหม่';
    }

    $('shRows').innerHTML = STYLISTS.map(stylist => {
      const rules = (state.rules || []).filter(
        rule => rule.stylist === stylist
      );

      const content = rules.length
        ? rules.map(rule => `
            <div class="sh-rule ${rule.kind === 'extra' ? 'sh-legacy-rule' : ''}">
              <p>${esc(ruleLabel(rule))}</p>
              ${rule.note ? `<p class="muted">${esc(rule.note)}</p>` : ''}
              ${rule.kind === 'extra' ? '<p class="muted">รายการเดิมจากระบบเปิดช่วงพิเศษ</p>' : ''}
              <div class="sh-actions">
                <button
                  type="button"
                  class="ghost"
                  data-remove-rule="${esc(rule.id)}"
                >
                  ยกเลิกการตั้งค่านี้
                </button>
              </div>
            </div>
          `).join('')
        : '<p class="muted">ไม่มีช่วงปิดคิว</p>';

      return `
        <article class="sh-stylist">
          <div class="sh-heading">
            <span class="badge ${esc(stylist)}">${esc(stylist)}</span>
          </div>
          ${content}
        </article>
      `;
    }).join('');
  }

  async function refresh() {
    if (!loginOverlay.classList.contains('hidden')) return;

    const date = selectedDate;
    const version = ++refreshVersion;

    const displayDate = formatDisplayDate(date);
    $('shDate').textContent = displayDate;
    $('shSummary').textContent = displayDate;

    try {
      const data = await api(
        `/owner/special-hours?date=${encodeURIComponent(date)}`
      );

      if (version !== refreshVersion || date !== selectedDate) return;

      state = {
        date,
        rules: Array.isArray(data.rules) ? data.rules : [],
        shop_closed: Boolean(data.shop_closed)
      };

      render();
    } catch (error) {
      if (version !== refreshVersion) return;
      $('shStatus').textContent = error.message;
      $('shRows').replaceChildren();
    }
  }

  $('shRefresh').onclick = refresh;

  $('shRows').onclick = event => {
    const button = event.target.closest('[data-remove-rule]');
    if (!button) return;

    const rule = (state.rules || []).find(
      item => String(item.id) === String(button.dataset.removeRule)
    );

    if (!rule) return;

    openConfirm({
      title: 'ยกเลิกการตั้งค่าช่าง',
      message:
        `${rule.stylist} · ${formatDisplayDate(rule.date)} · ${ruleLabel(rule)} ` +
        'คิวลูกค้าที่มีอยู่แล้วจะยังอยู่ครบ',
      onConfirm: async () => {
        try {
          await post('/owner/special-hours/delete', { id: rule.id });
          showToast('ยกเลิกการตั้งค่าแล้ว');
          await refresh();
        } catch (error) {
          showToast(error.message);
        }
      }
    });
  };

  /* =========================
     DIRECT SPECIAL BOOKING
  ========================= */
  function specialServiceValue() {
    return $('shSpecialService').value === 'other'
      ? $('shSpecialCustomService').value.trim()
      : $('shSpecialService').value;
  }

  $('shSpecialService').onchange = () => {
    const custom = $('shSpecialService').value === 'other';
    $('shSpecialCustomService').classList.toggle('hidden', !custom);
    $('shSpecialCustomService').required = custom;

    if (custom) {
      $('shSpecialCustomService').focus();
    }
  };

  function rowConflicts(row, date, stylist, start) {
    if (row.date !== date || row.stylist !== stylist) return false;

    return overlaps(
      start,
      SPECIAL_DURATION,
      toMinute(row.time),
      Number(row.duration_minutes || 60)
    );
  }

  function ruleBlocks(rule, stylist, start) {
    if (rule.kind !== 'closed' || rule.stylist !== stylist) return false;

    return overlaps(
      start,
      SPECIAL_DURATION,
      Number(rule.start_min),
      Number(rule.end_min) - Number(rule.start_min)
    );
  }

  async function loadSpecialTimes() {
    const date = $('shSpecialDate').value;
    const stylist = $('shSpecialStylist').value;
    const version = ++bookingVersion;

    $('shSpecialError').textContent = '';
    $('shSpecialTimeHelp').textContent = 'กำลังตรวจสอบคิว';
    $('shSpecialTime').disabled = true;
    $('shSpecialSave').disabled = true;

    if (!date || !stylist) return;

    try {
      const [rows, pending, hours] = await Promise.all([
        api(`/bookings?date=${encodeURIComponent(date)}`),
        api('/owner/requests'),
        api(`/owner/special-hours?date=${encodeURIComponent(date)}`)
      ]);

      if (version !== bookingVersion) return;

      const oldValue = $('shSpecialTime').value;
      $('shSpecialTime').replaceChildren();

      const rules = Array.isArray(hours.rules) ? hours.rules : [];
      let availableCount = 0;

      for (let start = 0; start <= 1380; start += 30) {
        const time = `${hh(start)}:00`;
        const conflict = [...rows, ...pending].some(
          row => rowConflicts(row, date, stylist, start)
        );
        const blocked = rules.some(
          rule => ruleBlocks(rule, stylist, start)
        );

        const option = new Option(
          `${hh(start)}${conflict ? ' · มีคิวแล้ว' : blocked ? ' · ปิดคิว' : ''}`,
          time
        );

        option.disabled = conflict;
        option.dataset.blocked = blocked ? '1' : '0';
        $('shSpecialTime').add(option);

        if (!conflict) availableCount += 1;
      }

      const enabled = [...$('shSpecialTime').options].filter(
        option => !option.disabled
      );

      const preferred = enabled.find(option => option.value === oldValue)
        || enabled.find(option => option.value === '13:00:00')
        || enabled[0];

      $('shSpecialTime').value = preferred?.value || '';

      if (hours.shop_closed) {
        $('shSpecialTimeHelp').textContent =
          'วันนี้ร้านปิดทั้งวัน ต้องเปิดร้านก่อนจึงจะเพิ่มคิวได้';
        $('shSpecialSave').disabled = true;
      } else if (!availableCount) {
        $('shSpecialTimeHelp').textContent = 'ไม่มีเวลาที่เพิ่มคิวได้';
        $('shSpecialSave').disabled = true;
      } else {
        $('shSpecialTimeHelp').textContent =
          'เวลาที่ขึ้นว่า “ปิดคิว” ยังเลือกได้ แต่ระบบจะขอให้ยืนยันก่อนบันทึก';
        $('shSpecialSave').disabled = false;
      }
    } catch (error) {
      if (version !== bookingVersion) return;
      $('shSpecialTimeHelp').textContent = '';
      $('shSpecialError').textContent = error.message;
    } finally {
      if (version === bookingVersion) {
        $('shSpecialTime').disabled = false;
      }
    }
  }

  function openSpecialBooking() {
    $('shSpecialForm').reset();
    $('shSpecialCustomService').classList.add('hidden');
    $('shSpecialCustomService').required = false;
    $('shSpecialError').textContent = '';
    $('shSpecialStylist').value = STYLISTS.includes(selectedStylist)
      ? selectedStylist
      : 'Bank';
    $('shSpecialDate').value = selectedDate;

    openModal('shSpecialOverlay', 'shSpecialStylist');
    loadSpecialTimes();
  }

  $('shOpenSpecial').onclick = openSpecialBooking;
  $('shSpecialClose').onclick = () => closeModal('shSpecialOverlay');
  $('shSpecialStylist').onchange = loadSpecialTimes;
  $('shSpecialDate').onchange = loadSpecialTimes;

  async function saveDirectSpecial(payload) {
    await post('/owner/special-bookings/direct', payload);
    closeModal('shSpecialOverlay', true);
    showToast('บันทึกคิวพิเศษแล้ว');

    await Promise.all([
      loadBookings(),
      loadCalendar()
    ]);
  }

  $('shSpecialForm').onsubmit = async event => {
    event.preventDefault();
    if (busy) return;

    const service = specialServiceValue();

    if (!service) {
      $('shSpecialError').textContent = 'กรุณาเลือกหรือระบุบริการ';
      return;
    }

    const payload = {
      date: $('shSpecialDate').value,
      time: $('shSpecialTime').value,
      stylist: $('shSpecialStylist').value,
      name: $('shSpecialName').value.trim(),
      phone: $('shSpecialPhone').value.trim(),
      gender: $('shSpecialGender').value,
      service,
      note: $('shSpecialNote').value.trim(),
      duration_minutes: SPECIAL_DURATION,
      override_block: false
    };

    if (
      !payload.date ||
      !payload.time ||
      !payload.name ||
      !payload.gender
    ) {
      $('shSpecialError').textContent = 'กรุณากรอกข้อมูลให้ครบถ้วน';
      return;
    }

    setBusy(true);
    $('shSpecialError').textContent = '';

    try {
      await saveDirectSpecial(payload);
    } catch (error) {
      if (error.code === 'STYLIST_BLOCKED') {
        const time = payload.time.slice(0, 5);

        openConfirm({
          title: 'เวลานี้ถูกปิดคิวไว้',
          message:
            `${payload.stylist} ถูกปิดคิวในช่วง ${time} ` +
            'ต้องการเพิ่มคิวพิเศษทับการปิดคิวนี้หรือไม่? การตั้งค่าปิดคิวเดิมจะยังคงอยู่',
          onConfirm: async () => {
            try {
              setBusy(true);
              await saveDirectSpecial({
                ...payload,
                override_block: true
              });
            } catch (confirmError) {
              $('shSpecialError').textContent = confirmError.message;
            } finally {
              setBusy(false);
            }
          }
        });
      } else {
        $('shSpecialError').textContent = error.message;
        await loadSpecialTimes();
      }
    } finally {
      setBusy(false);
    }
  };

  /* =========================
     BLOCK STYLIST
  ========================= */
  $('shBlockKind').onchange = () => {
    const wholeDay = $('shBlockKind').value === 'day';
    $('shBlockRange').classList.toggle('hidden', wholeDay);
    $('shBlockError').textContent = '';
  };

  function openBlockStylist() {
    $('shBlockForm').reset();
    $('shBlockError').textContent = '';
    $('shBlockStylist').value = STYLISTS.includes(selectedStylist)
      ? selectedStylist
      : 'Bank';
    $('shBlockDate').value = selectedDate;
    $('shBlockKind').value = 'partial';
    $('shBlockFrom').value = '1200';
    $('shBlockUntil').value = '1440';
    $('shBlockRange').classList.remove('hidden');

    openModal('shBlockOverlay', 'shBlockStylist');
  }

  $('shOpenBlock').onclick = openBlockStylist;
  $('shBlockClose').onclick = () => closeModal('shBlockOverlay');

  async function commitBlock(payload, confirmToken) {
    await post('/owner/special-hours/add', {
      ...payload,
      confirm_token: confirmToken
    });

    closeModal('shBlockOverlay', true);
    showToast('บันทึกการปิดคิวแล้ว');

    await Promise.all([
      loadBookings(),
      loadCalendar()
    ]);
  }

  $('shBlockForm').onsubmit = async event => {
    event.preventDefault();
    if (busy) return;

    const wholeDay = $('shBlockKind').value === 'day';
    const start = wholeDay ? 0 : Number($('shBlockFrom').value);
    const end = wholeDay ? 1440 : Number($('shBlockUntil').value);

    if (!wholeDay && start >= end) {
      $('shBlockError').textContent = 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม';
      return;
    }

    const payload = {
      date: $('shBlockDate').value,
      stylist: $('shBlockStylist').value,
      kind: 'closed',
      start_min: start,
      end_min: end,
      note: $('shBlockNote').value.trim()
    };

    setBusy(true);
    $('shBlockError').textContent = '';

    try {
      const preview = await post(
        '/owner/special-hours/preview',
        payload
      );

      const affected = Array.isArray(preview.affected)
        ? preview.affected
        : [];

      if (!affected.length) {
        await commitBlock(payload, preview.confirm_token);
        return;
      }

      const sample = affected
        .slice(0, 3)
        .map(item => `${String(item.time).slice(0, 5)} ${item.name || ''}`.trim())
        .join(', ');

      setBusy(false);

      openConfirm({
        title: 'ช่วงนี้มีคิวเดิมอยู่',
        message:
          `พบคิวเดิม ${affected.length} คิว${sample ? ` (${sample}${affected.length > 3 ? ', …' : ''})` : ''} ` +
          'คิวเดิมจะยังอยู่ครบ และระบบจะปิดเฉพาะการรับคิวใหม่ ต้องการดำเนินการต่อหรือไม่?',
        onConfirm: async () => {
          try {
            setBusy(true);
            await commitBlock(payload, preview.confirm_token);
          } catch (error) {
            $('shBlockError').textContent = error.message;
          } finally {
            setBusy(false);
          }
        }
      });
    } catch (error) {
      $('shBlockError').textContent = error.message;
    } finally {
      setBusy(false);
    }
  };

  /* =========================
     KEEP PANEL IN SYNC
  ========================= */
  const previousLoadBookings = loadBookings;
  loadBookings = async function () {
    await previousLoadBookings();
    await refresh();
  };

  const previousSaveClosureState = saveClosureState;
  saveClosureState = async function (...args) {
    await previousSaveClosureState(...args);
    await refresh();
  };

  refresh();
})();

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'adore_online_bookings_v1';
  const DRAFT_KEY = 'adore_online_request_draft_v1';

  let ready = false;
  let loadingSlots = false;
  let sending = false;
  let slotVersion = 0;
  let tracking = null;
  let statusLoading = false;
  let statusVersion = 0;

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // การจองยังทำงานได้ แม้เบราว์เซอร์ไม่ยอมบันทึกข้อมูล
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  function normalizedPhone(value) {
    const raw = String(value || '').replace(/[^\d+]/g, '');
    return raw.startsWith('+66') ? `0${raw.slice(3)}` : raw;
  }

  function todayTH() {
    return new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Bangkok'
    });
  }

  function datePlus(date, days) {
    const d = new Date(`${date}T12:00:00+07:00`);
    d.setUTCDate(d.getUTCDate() + days);

    return d.toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Bangkok'
    });
  }

  function displayDate(value) {
    return new Date(`${value}T12:00:00+07:00`).toLocaleDateString('th-TH', {
      timeZone: 'Asia/Bangkok',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function endTime(time, duration) {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + duration;

    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw Object.assign(
        new Error(result.error || 'ทำรายการไม่สำเร็จ'),
        { status: response.status }
      );
    }

    return result;
  }

  function updateSubmit() {
    $('submitRequest').disabled =
      !ready || loadingSlots || sending || !$('time').value;
  }

  async function loadSlots() {
    const version = ++slotVersion;
    const date = $('date').value;
    const gender = $('service').value;

    loadingSlots = true;
    $('time').disabled = true;
    $('time').innerHTML = '';
    $('slotMessage').textContent = 'กำลังตรวจสอบเวลาว่าง…';
    updateSubmit();

    try {
      const slots = await api(
        `/api/public/slots?date=${encodeURIComponent(date)}&gender=${encodeURIComponent(gender)}`
      );

      if (version !== slotVersion) return;

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = slots.length ? 'เลือกเวลา' : 'ไม่มีเวลาว่าง';
      $('time').appendChild(placeholder);

      const duration = gender === 'female' ? 120 : 60;

      for (const time of slots) {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = `${time}–${endTime(time, duration)} น.`;
        $('time').appendChild(option);
      }

      $('time').disabled = !slots.length;

      $('slotMessage').textContent = slots.length
        ? 'ระบบตรวจเวลาซ้ำอีกครั้งเมื่อส่งคำขอ'
        : 'ไม่มีเวลาว่างสำหรับบริการนี้ หรือร้านปิดรับจองในวันที่เลือก';
    } catch (error) {
      if (version !== slotVersion) return;
      $('slotMessage').textContent = error.message;
    } finally {
      if (version === slotVersion) {
        loadingSlots = false;
        updateSubmit();
      }
    }
  }

  function savedBookings() {
    const rows = readStorage(STORAGE_KEY, []);
    return Array.isArray(rows)
      ? rows.filter(x => x && typeof x.code === 'string' && typeof x.phone === 'string')
      : [];
  }

  function saveBooking(code, phone) {
    const rows = savedBookings().filter(x => x.code !== code);
    rows.unshift({ code, phone });
    writeStorage(STORAGE_KEY, rows.slice(0, 10));
    renderSaved();
  }

  function renderSaved() {
    const container = $('savedBookings');
    container.innerHTML = '';

    for (const item of savedBookings()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'online-saved-button';
      button.textContent = item.code;

      button.onclick = () => {
        selectTracking(item.code, item.phone);
        void loadStatus();
      };

      container.appendChild(button);
    }
  }

  function selectTracking(code, phone) {
    statusVersion += 1;
    tracking = { code, phone };
    $('bookingCode').value = code;
    $('lookupPhone').value = phone;
    $('copyCode').hidden = false;
  }

  function renderStatus(result) {
    const descriptions = {
      pending: [
        '🟡 รอร้านยืนยัน',
        result.notified
          ? 'ระบบส่งคำขอแจ้งร้านผ่าน LINE แล้ว กรุณารอร้านอนุมัติ'
          : 'บันทึกคำขอแล้ว ระบบกำลังส่งแจ้งเตือนไปยังร้าน'
      ],
      confirmed: [
        '✅ ยืนยันการจองแล้ว',
        'กรุณามาถึงก่อนเวลานัดประมาณ 10 นาที'
      ],
      rejected: [
        'ร้านไม่สามารถรับคิวนี้ได้',
        'กรุณาเลือกเวลาใหม่ หรือติดต่อร้าน'
      ],
      cancelled: [
        'การจองนี้ถูกยกเลิกแล้ว',
        'กรุณาติดต่อร้านหากต้องการนัดหมายใหม่'
      ]
    };

    const [title, detail] = descriptions[result.status] || [
      'ไม่ทราบสถานะ',
      'กรุณาติดต่อร้าน'
    ];

    const service = result.gender === 'female' ? 'ตัดผมหญิง' : 'ตัดผมชาย';

    $('statusResult').dataset.status = result.status;
    $('statusResult').textContent = [
      title,
      result.booking_code,
      service,
      displayDate(result.date),
      `${result.time.slice(0, 5)}–${endTime(result.time, result.duration_minutes)} น.`,
      '',
      detail,
      `ตรวจสอบล่าสุด ${new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      })}`
    ].join('\n');
  }

  async function loadStatus() {
    if (!tracking || statusLoading) return;

    const current = { ...tracking };
    const version = statusVersion;
    statusLoading = true;

    try {
      const result = await api('/api/public/status', {
        method: 'POST',
        body: JSON.stringify(current)
      });

      if (version !== statusVersion) return;
      renderStatus(result);
    } catch (error) {
      if (version !== statusVersion) return;
      $('statusResult').textContent = error.message;
    } finally {
      statusLoading = false;
    }
  }

  $('date').onchange = loadSlots;
  $('service').onchange = loadSlots;
  $('time').onchange = updateSubmit;

  $('requestForm').onsubmit = async event => {
    event.preventDefault();
    if (sending || !ready) return;

    const body = {
      customer_name: $('customerName').value.trim(),
      phone: normalizedPhone($('customerPhone').value),
      gender: $('service').value,
      date: $('date').value,
      time: $('time').value
    };

    if (!body.customer_name || !/^0[689]\d{8}$/.test(body.phone)) {
      $('requestMessage').textContent = 'กรุณากรอกชื่อและเบอร์มือถือ 10 หลักให้ถูกต้อง';
      return;
    }

    if (!body.time) {
      $('requestMessage').textContent = 'กรุณาเลือกเวลา';
      return;
    }

    const signature = JSON.stringify(body);
    const oldDraft = readStorage(DRAFT_KEY, null);

    const key = oldDraft?.signature === signature
      ? oldDraft.key
      : crypto.randomUUID();

    const code = `AD-${key.replaceAll('-', '').slice(0, 20).toUpperCase()}`;

    writeStorage(DRAFT_KEY, { key, signature });

    sending = true;
    updateSubmit();
    $('requestMessage').textContent = 'กำลังส่งคำขอ…';

    try {
      const result = await api('/api/public/requests', {
        method: 'POST',
        body: JSON.stringify({ ...body, key })
      });

      removeStorage(DRAFT_KEY);
      saveBooking(result.booking_code, body.phone);
      selectTracking(result.booking_code, body.phone);
      renderStatus(result);

      $('requestMessage').textContent =
        `ส่งคำขอแล้ว รหัส ${result.booking_code} กรุณารอร้านยืนยัน`;

      $('tracking').scrollIntoView({ behavior: 'smooth', block: 'start' });

      await loadSlots();
    } catch (error) {
      $('requestMessage').textContent = error.message;

      // เครือข่ายขาดหรือ Server ตอบ 5xx อาจบันทึกสำเร็จแล้ว
      // เก็บรหัสที่คำนวณได้ไว้ให้ตรวจสอบ แทนการสร้างรายการซ้ำ
      if (!error.status || error.status >= 500) {
        saveBooking(code, body.phone);
        selectTracking(code, body.phone);

        $('requestMessage').textContent =
          'ยังยืนยันผลการส่งไม่ได้ กรุณาตรวจสถานะด้านล่างก่อนส่งซ้ำ';

        await loadStatus();
      } else if (error.status === 409) {
        await loadSlots();
      }
    } finally {
      sending = false;
      updateSubmit();
    }
  };

  $('statusForm').onsubmit = async event => {
    event.preventDefault();

    const code = $('bookingCode').value.trim().toUpperCase();
    const phone = normalizedPhone($('lookupPhone').value);

    selectTracking(code, phone);
    await loadStatus();
  };

  $('copyCode').onclick = async () => {
    try {
      await navigator.clipboard.writeText($('bookingCode').value);
      $('copyCode').textContent = 'คัดลอกรหัสแล้ว';
    } catch {
      $('bookingCode').focus();
      $('bookingCode').select();
      $('copyCode').textContent = 'แตะค้างที่รหัสเพื่อคัดลอก';
    }
  };

  setInterval(() => {
    if (!document.hidden) void loadStatus();
  }, 15000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void loadStatus();
  });

  async function init() {
    const today = todayTH();
    $('date').min = today;
    $('date').max = datePlus(today, 60);
    $('date').value = today;

    renderSaved();

    const saved = savedBookings()[0];
    if (saved) {
      selectTracking(saved.code, saved.phone);
      void loadStatus();
    }

    try {
      const config = await api('/api/public/config');
      ready = config.ready;

      if (!ready) {
        $('requestMessage').textContent =
          'ร้านยังไม่เปิดรับจองออนไลน์ กรุณาโทรจองกับทางร้าน';
      }

      await loadSlots();
    } catch (error) {
      $('requestMessage').textContent = error.message;
    }

    updateSubmit();
  }

  void init();
})();

/* =========================
   ALERT AUDIO MODULE
   Safari iOS / iPad / Mac
   Works with index.html
========================= */

(() => {
  const CHECK_INTERVAL_MS = 60 * 1000; // 60 วินาที
  const ALERT_BEFORE_MIN = 30; // แจ้งก่อน 30 นาที
  const STORAGE_KEY = 'adore_alert_notified'; // กันแจ้งซ้ำ

  let audioUnlocked = false;
  let intervalStarted = false;

  /* =========================
     AUDIO UTILS
  ========================= */
  function speak(text, lang = 'th-TH') {
    if (!audioUnlocked) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.95;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  }

  function speakThai(text) {
    speak(text, 'th-TH');
  }

  function speakEnglish(text) {
    speak(text, 'en-US');
  }

  /* =========================
     AUDIO UNLOCK (Safari rule)
  ========================= */
  function unlockAudio() {
    if (audioUnlocked) return;

    audioUnlocked = true;

    // พูดทันทีเมื่อปลดล็อก
    speakThai('ระบบแจ้งเตือนคิวพร้อมใช้งานแล้ว');

    if (!intervalStarted) {
      startQueueWatcher();
      intervalStarted = true;
    }

    console.log('[AlertAudio] Audio unlocked');
  }

  // Safari ต้องการ user interaction
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { once: true });
  });

  /* =========================
     QUEUE WATCHER
  ========================= */
  function startQueueWatcher() {
    checkQueue();
    setInterval(checkQueue, CHECK_INTERVAL_MS);
  }

  async function checkQueue() {
    try {
      const today = new Date().toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Bangkok'
      });

      const res = await fetch(`/bookings?date=${today}`);
      if (!res.ok) return;

      const bookings = await res.json();
      const notified = getNotifiedMap();

      const now = new Date();

      bookings.forEach(b => {
        const bookingTime = new Date(`${b.date}T${b.time}`);
        const diffMin = Math.round((bookingTime - now) / 60000);

        if (diffMin === ALERT_BEFORE_MIN) {
          const key = `${b.id}-${b.date}-${b.time}`;

          if (notified[key]) return;

          notified[key] = true;
          saveNotifiedMap(notified);

          announceBooking(b);
        }
      });
    } catch (err) {
      console.error('[AlertAudio] Error checking queue', err);
    }
  }

  /* =========================
     ANNOUNCE
  ========================= */
  function announceBooking(b) {
    // ภาษาไทย: ชื่อลูกค้า
    speakThai(`อีก 30 นาทีจะถึงคิวของคุณ ${b.name}`);

    // ภาษาอังกฤษ: ชื่อช่าง
    setTimeout(() => {
      speakEnglish(`with stylist ${b.stylist}`);
    }, 800);
  }

  /* =========================
     STORAGE (prevent duplicate)
  ========================= */
  function getNotifiedMap() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveNotifiedMap(map) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }
})();

/* =====================================================
   ADORE HAIR — QUEUE AUDIO NOTIFICATION (FINAL)
   Platform: Safari iOS / iPadOS / macOS
   Page: index.html (single page only)
   Authoring style: Premium / Human / Siri-based
===================================================== */

(() => {
  /* =========================
     CONFIG
  ========================= */
  const CHECK_INTERVAL_MS = 60 * 1000; // ตรวจทุก 60 วินาที
  const ALERT_BEFORE_MIN = 30;         // แจ้งก่อน 30 นาที
  const STORAGE_KEY = 'adore_audio_notified';

  let audioUnlocked = false;
  let watcherStarted = false;

  /* =========================
     VOICE SELECTOR (SIRI)
  ========================= */
  function getSiriVoice(lang) {
    const voices = window.speechSynthesis.getVoices();

    // พยายามเลือก Siri โดยตรง
    return (
      voices.find(v =>
        v.lang === lang &&
        v.name.toLowerCase().includes('siri')
      ) ||
      // fallback: system voice ภาษาเดียวกัน
      voices.find(v => v.lang === lang) ||
      null
    );
  }

  /* =========================
     SPEAK MODES
  ========================= */

  // 1️⃣ เสียงระบบ — เร็ว ชัด ฉะฉาน
  function speakSystem(text) {
    if (!audioUnlocked) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = getSiriVoice('th-TH');
    utter.lang = 'th-TH';

    utter.rate = 1.05;   // เร็ว
    utter.pitch = 1.0;   // ตรง
    utter.volume = 1;

    window.speechSynthesis.speak(utter);
  }

  // 2️⃣ เสียงประกาศ — Premium / Human / AI-like
  function speakPremium(text, lang = 'th-TH') {
    if (!audioUnlocked) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = getSiriVoice(lang);
    utter.lang = lang;

    utter.rate = 0.85;   // ช้าลง
    utter.pitch = 1.05;  // อบอุ่น
    utter.volume = 1;

    window.speechSynthesis.speak(utter);
  }

  /* =========================
     AUDIO UNLOCK (Safari rule)
  ========================= */
  function unlockAudio() {
    if (audioUnlocked) return;

    audioUnlocked = true;

    // เสียงตอนเข้าใช้งานระบบ
    speakSystem('ระบบแจ้งเตือนคิว พร้อมใช้งานแล้ว');

    if (!watcherStarted) {
      startQueueWatcher();
      watcherStarted = true;
    }

    console.log('[AdoreAudio] Audio unlocked');
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
      const notifiedMap = loadNotifiedMap();
      const now = new Date();

      bookings.forEach(b => {
        const bookingTime = new Date(`${b.date}T${b.time}`);
        const diffMin = Math.round((bookingTime - now) / 60000);

        if (diffMin === ALERT_BEFORE_MIN) {
          const key = `${b.id}-${b.date}-${b.time}`;
          if (notifiedMap[key]) return;

          notifiedMap[key] = true;
          saveNotifiedMap(notifiedMap);
          announceBooking(b);
        }
      });

    } catch (err) {
      console.error('[AdoreAudio] Queue check error', err);
    }
  }

  /* =========================
     ANNOUNCEMENT FLOW (PREMIUM)
  ========================= */
  function announceBooking(b) {
    // จังหวะแบบมนุษย์ / concierge

    speakPremium('แจ้งเตือนล่วงหน้า');

    setTimeout(() => {
      speakPremium(`อีก 30 นาที จะถึงคิวของคุณ ${b.name}`);
    }, 900);

    setTimeout(() => {
      speakPremium(`ดูแลโดยช่าง ${b.stylist}`, 'en-US');
    }, 2300);
  }

  /* =========================
     STORAGE (prevent duplicate)
  ========================= */
  function loadNotifiedMap() {
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

/* =====================================================
   ADORE HAIR — QUEUE AUDIO NOTIFICATION (FINAL FIXED)
   Platform: Safari iOS / iPadOS / macOS
   Page: index.html (single page)
   Voice: Siri (Apple system voice)
===================================================== */

(() => {
  /* =========================
     CONFIG
  ========================= */
  const CHECK_INTERVAL_MS = 60 * 1000;
  const ALERT_BEFORE_MIN = 30;
  const STORAGE_KEY = 'adore_audio_notified';

  let audioUnlocked = false;
  let watcherStarted = false;

  /* =========================
     VOICE LOADER (iOS REQUIRED)
  ========================= */
  function waitForVoices(callback) {
    const voices = speechSynthesis.getVoices();
    if (voices.length) {
      callback();
      return;
    }
    speechSynthesis.onvoiceschanged = () => callback();
  }

  /* =========================
     VOICE SELECTOR (SIRI)
  ========================= */
  function getSiriVoice(lang) {
    const voices = speechSynthesis.getVoices();
    return (
      voices.find(v => v.lang === lang && v.name.toLowerCase().includes('siri')) ||
      voices.find(v => v.lang === lang) ||
      null
    );
  }

  /* =========================
     SPEAK MODES
  ========================= */
  function speakSystem(text) {
    if (!audioUnlocked) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = getSiriVoice('th-TH');
    utter.lang = 'th-TH';
    utter.rate = 1.05;
    utter.pitch = 1.0;
    utter.volume = 1;

    speechSynthesis.speak(utter);
  }

  function speakPremium(text, lang = 'th-TH') {
    if (!audioUnlocked) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = getSiriVoice(lang);
    utter.lang = lang;
    utter.rate = 0.85;
    utter.pitch = 1.05;
    utter.volume = 1;

    speechSynthesis.speak(utter);
  }

  /* =========================
     🔓 AUDIO UNLOCK (iOS HARD FIX)
  ========================= */
  function unlockAudio(forceSpeak = false) {
    if (audioUnlocked && !forceSpeak) return;

    audioUnlocked = true;

    // ❗ iOS ต้องมี utterance จริงจาก user gesture
    waitForVoices(() => {
      speechSynthesis.cancel();
      speakSystem('ระบบแจ้งเตือนคิว พร้อมใช้งานแล้ว');
    });

    if (!watcherStarted) {
      startQueueWatcher();
      watcherStarted = true;
    }

    console.log('[AdoreAudio] Audio unlocked');
  }

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

      const [closedDaysRes, bookingsRes] = await Promise.all([
        fetch('/closed-days'),
        fetch(`/bookings?date=${today}`)
      ]);

      if (!closedDaysRes.ok || !bookingsRes.ok) return;

      const closedDays = await closedDaysRes.json();
      if (Array.isArray(closedDays) && closedDays.includes(today)) return;

      const bookings = await bookingsRes.json();
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
     ANNOUNCEMENT FLOW
  ========================= */
  function announceBooking(b) {
    speakPremium('แจ้งเตือนล่วงหน้า');

    setTimeout(() => {
      speakPremium(`อีก 30 นาที จะถึงคิวของคุณ ${b.name}`);
    }, 800);

    setTimeout(() => {
      speakPremium(`serviced by Khun ${b.stylist}`, 'en-US');
    }, 2200);
  }

  /* =========================
     STORAGE
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

  /* =========================
     PUBLIC API (FOR app.js)
     ✅ จุดเดียวที่ app.js เรียก
  ========================= */
  window.enableAdoreAudio = function () {
    unlockAudio(true); // 👈 บังคับ iOS unlock + speak
  };

  /* =========================
     SAFETY BACKUP (DESKTOP)
  ========================= */
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => unlockAudio(false), { once: true });
  });

})();

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
  const CHECK_INTERVAL_MS = 60 * 1000; // ตรวจทุก 60 วินาที
  const ALERT_BEFORE_MIN = 30;         // แจ้งก่อน 30 นาที
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
    speechSynthesis.onvoiceschanged = () => {
      callback();
    };
  }

  /* =========================
     VOICE SELECTOR (SIRI)
  ========================= */
  function getSiriVoice(lang) {
    const voices = speechSynthesis.getVoices();

    return (
      voices.find(v =>
        v.lang === lang &&
        v.name.toLowerCase().includes('siri')
      ) ||
      voices.find(v => v.lang === lang) ||
      null
    );
  }

  /* =========================
     SPEAK MODES
  ========================= */

  // 🔹 เสียงระบบ — เร็ว ชัด ฉะฉาน
  function speakSystem(text) {
    if (!audioUnlocked) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = getSiriVoice('th-TH');
    utter.lang = 'th-TH';
    utter.rate = 1.05;
    utter.pitch = 1.0;
    utter.volume = 1;

    window.speechSynthesis.speak(utter);
  }

  // 🔹 เสียงประกาศ — Premium / Human
  function speakPremium(text, lang = 'th-TH') {
    if (!audioUnlocked) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = getSiriVoice(lang);
    utter.lang = lang;
    utter.rate = 0.85;
    utter.pitch = 1.05;
    utter.volume = 1;

    window.speechSynthesis.speak(utter);
  }

  /* =========================
     AUDIO UNLOCK (iOS SAFE)
  ========================= */
  function unlockAudio() {
  if (audioUnlocked) return;

  audioUnlocked = true;
  waitForVoices(() => {
  waitForVoices(() => {
    speakSystem('ระบบแจ้งเตือนคิว พร้อมใช้งานแล้ว');
  });
}
  if (!watcherStarted) {
    startQueueWatcher();
    watcherStarted = true;
  }
}

    if (!watcherStarted) {
      startQueueWatcher();
      watcherStarted = true;
    }

    console.log('[AdoreAudio] Audio unlocked (iOS safe)');
  }

  // Safari ต้องมี user interaction
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
     ANNOUNCEMENT FLOW (iOS SAFE)
  ========================= */
  function announceBooking(b) {
    // ❗ ประโยคแรกต้องพูดทันที (iOS rule)
    speakPremium('แจ้งเตือนล่วงหน้า');

    // หลังจากนั้น iOS จะยอมให้พูดต่อ
    setTimeout(() => {
      speakPremium(`อีก 30 นาที จะถึงคิวของคุณ ${b.name}`);
    }, 800);

    setTimeout(() => {
      speakPremium(`ดูแลโดยช่าง ${b.stylist}`, 'en-US');
    }, 2200);
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
  const CHECK_INTERVAL_MS = 60 * 1000; // ตรวจทุก 60 วินาที
  const ALERT_BEFORE_MIN = 30;         // แจ้งก่อน 30 นาที
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
    speechSynthesis.onvoiceschanged = () => {
      callback();
    };
  }

  /* =========================
     VOICE SELECTOR (SIRI)
  ========================= */
  function getSiriVoice(lang) {
    const voices = speechSynthesis.getVoices();

    return (
      voices.find(v =>
        v.lang === lang &&
        v.name.toLowerCase().includes('siri')
      ) ||
      voices.find(v => v.lang === lang) ||
      null
    );
  }

  /* =========================
     SPEAK MODES
  ========================= */

  // 🔹 เสียงระบบ — เร็ว ชัด ฉะฉาน
  function speakSystem(text) {
    if (!audioUnlocked) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = getSiriVoice('th-TH');
    utter.lang = 'th-TH';
    utter.rate = 1.05;
    utter.pitch = 1.0;
    utter.volume = 1;

    window.speechSynthesis.speak(utter);
  }

  // 🔹 เสียงประกาศ — Premium / Human
  function speakPremium(text, lang = 'th-TH') {
    if (!audioUnlocked) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = getSiriVoice(lang);
    utter.lang = lang;
    utter.rate = 0.85;
    utter.pitch = 1.05;
    utter.volume = 1;

    window.speechSynthesis.speak(utter);
  }

  /* =========================
     AUDIO UNLOCK (iOS SAFE)
  ========================= */
  function unlockAudio() {
    if (audioUnlocked) return;

    audioUnlocked = true;

    // ✅ iOS ต้องรอ voices + ต้องพูดทันทีใน user gesture
    waitForVoices(() => {
      speakSystem('ระบบแจ้งเตือนคิว พร้อมใช้งานแล้ว');
    });

    if (!watcherStarted) {
      startQueueWatcher();
      watcherStarted = true;
    }

    console.log('[AdoreAudio] Audio unlocked (iOS safe)');
  }

  // Safari ต้องมี user interaction
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
     ANNOUNCEMENT FLOW (iOS SAFE)
  ========================= */
  function announceBooking(b) {
    // ❗ ประโยคแรกต้องพูดทันที (iOS rule)
    speakPremium('แจ้งเตือนล่วงหน้า');

    // หลังจากนั้น iOS จะยอมให้พูดต่อ
    setTimeout(() => {
      speakPremium(`อีก 30 นาที จะถึงคิวของคุณ ${b.name}`);
    }, 800);

    setTimeout(() => {
      speakPremium(`ดูแลโดยช่าง ${b.stylist}`, 'en-US');
    }, 2200);
  }

/* =========================
   PUBLIC AUDIO API (FOR app.js)
   iOS SAFE — MUST BE DIRECT
========================= */
window.enableAdoreAudio = function () {
  // เรียก unlockAudio ตรง ๆ
  unlockAudio();
};

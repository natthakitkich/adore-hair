/* =====================================================
   ADORE HAIR — QUEUE AUDIO NOTIFICATION (FINAL FIXED)
   Platform: Safari iOS / iPadOS / macOS
   Page: index.html (single page)
   Voice: Siri (Apple system voice)
===================================================== */

/* =====================================================
   🔊 GLOBAL AUDIO CONTROLLER
   (ต้องอยู่ global เพื่อให้ app.js เรียกได้)
===================================================== */
let adoreAudioUnlocked = false;
let adoreWatcherStarted = false;

const ADORE_AUDIO_CONFIG = {
  CHECK_INTERVAL_MS: 60 * 1000, // ตรวจทุก 60 วินาที
  ALERT_BEFORE_MIN: 30,         // แจ้งก่อน 30 นาที
  STORAGE_KEY: 'adore_audio_notified'
};

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
function speakSystem(text) {
  if (!adoreAudioUnlocked) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = getSiriVoice('th-TH');
  utter.lang = 'th-TH';
  utter.rate = 1.05;
  utter.pitch = 1.0;
  utter.volume = 1;

  speechSynthesis.speak(utter);
}

function speakPremium(text, lang = 'th-TH') {
  if (!adoreAudioUnlocked) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = getSiriVoice(lang);
  utter.lang = lang;
  utter.rate = 0.85;
  utter.pitch = 1.05;
  utter.volume = 1;

  speechSynthesis.speak(utter);
}

/* =========================
   AUDIO UNLOCK (iOS SAFE)
========================= */
function unlockAdoreAudio() {
  if (adoreAudioUnlocked) return;

  adoreAudioUnlocked = true;

  // iOS ต้องพูดทันทีใน user gesture
  waitForVoices(() => {
    speakSystem('ระบบแจ้งเตือนคิว พร้อมใช้งานแล้ว');
  });

  if (!adoreWatcherStarted) {
    startQueueWatcher();
    adoreWatcherStarted = true;
  }

  console.log('[AdoreAudio] Audio unlocked');
}

/* =========================
   QUEUE WATCHER
========================= */
function startQueueWatcher() {
  checkQueue();
  setInterval(checkQueue, ADORE_AUDIO_CONFIG.CHECK_INTERVAL_MS);
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

      if (diffMin === ADORE_AUDIO_CONFIG.ALERT_BEFORE_MIN) {
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
  // ประโยคแรกต้องพูดทันที
  speakPremium('แจ้งเตือนล่วงหน้า');

  setTimeout(() => {
    speakPremium(`อีก 30 นาที จะถึงคิวของคุณ ${b.name}`);
  }, 800);

  setTimeout(() => {
    speakPremium(`ดูแลโดยช่าง ${b.stylist}`, 'en-US');
  }, 2200);
}

/* =========================
   STORAGE
========================= */
function loadNotifiedMap() {
  try {
    return JSON.parse(localStorage.getItem(ADORE_AUDIO_CONFIG.STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveNotifiedMap(map) {
  localStorage.setItem(
    ADORE_AUDIO_CONFIG.STORAGE_KEY,
    JSON.stringify(map)
  );
}

/* =====================================================
   PUBLIC API — FOR app.js (LOGIN BUTTON)
===================================================== */
window.enableAdoreAudio = function () {
  unlockAdoreAudio();
};

/* =====================================================
   SAFETY: AUTO UNLOCK VIA USER GESTURE (BACKUP)
===================================================== */
['click', 'touchstart', 'keydown'].forEach(evt => {
  window.addEventListener(evt, unlockAdoreAudio, { once: true });
});

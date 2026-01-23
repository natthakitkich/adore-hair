/* =========================
   CONFIG
========================= */
const API = '';
const ALERT_MINUTES = 30;
const CHECK_INTERVAL = 60 * 1000; // 60 seconds

/* =========================
   STATE
========================= */
let audioUnlocked = false;
let checkTimer = null;

/* =========================
   AUDIO UNLOCK
========================= */
function unlockAudio() {
  if (audioUnlocked) return;

  audioUnlocked = true;

  speakThai('ระบบแจ้งเตือนคิวพร้อมใช้งานแล้ว');

  startChecking();
}

/* listen to ANY interaction */
['click', 'touchstart', 'keydown'].forEach(evt => {
  window.addEventListener(evt, unlockAudio, { once: true });
});

/* =========================
   SPEECH HELPERS
========================= */
function speakThai(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'th-TH';
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

function speakEnglish(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

/* =========================
   CHECK LOOP
========================= */
function startChecking() {
  if (checkTimer) clearInterval(checkTimer);

  checkUpcomingBookings();
  checkTimer = setInterval(checkUpcomingBookings, CHECK_INTERVAL);
}

async function checkUpcomingBookings() {
  const today = getTodayTH();
  const now = new Date();

  const alertedKey = `alerted_${today}`;
  const alertedIds = JSON.parse(localStorage.getItem(alertedKey) || '[]');

  let res;
  try {
    res = await fetch(`${API}/bookings?date=${today}`);
  } catch {
    return;
  }

  if (!res.ok) return;

  const bookings = await res.json();

  bookings.forEach(b => {
    if (alertedIds.includes(b.id)) return;

    const bookingTime = new Date(`${b.date}T${b.time}`);
    const diffMin = Math.round((bookingTime - now) / 60000);

    if (diffMin === ALERT_MINUTES) {
      // 🔊 Thai: customer
      speakThai(`อีก ${ALERT_MINUTES} นาที จะถึงคิวของคุณ ${b.name} โดยช่างคุณ`);

      // 🔊 English: stylist
      speakEnglish(` ${b.stylist}`);

      alertedIds.push(b.id);
      localStorage.setItem(alertedKey, JSON.stringify(alertedIds));
    }
  });
}

/* =========================
   UTIL
========================= */
function getTodayTH() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Bangkok'
  });
}

/* =================================================
   Adore Hair – app.js (AUTH PHASE)
================================================= */

const OWNER_PIN = '1234';
const AUTH_KEY = 'adore_owner_logged_in';

const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');

const app = document.getElementById('app');
const logoutBtn = document.getElementById('logoutBtn');

/* =========================
   AUTH
========================= */
function isLoggedIn(){
  return localStorage.getItem(AUTH_KEY) === '1';
}

function showLogin(){
  loginOverlay.classList.remove('hidden');
  app.classList.add('hidden');
}

function showApp(){
  loginOverlay.classList.add('hidden');
  app.classList.remove('hidden');
}

loginBtn.onclick = () => {
  if (pinInput.value === OWNER_PIN) {
    localStorage.setItem(AUTH_KEY, '1');
    pinInput.value = '';
    loginMsg.textContent = '';
    showApp();
    initApp();
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
};

logoutBtn.onclick = () => {
  localStorage.removeItem(AUTH_KEY);
  location.reload();
};

/* =========================
   INIT
========================= */
function initApp(){
  // รอบถัดไปจะเริ่ม render calendar / tabs / queue
  console.log('AUTH OK – READY FOR NEXT PHASE');
}

/* =========================
   BOOT
========================= */
if (isLoggedIn()) {
  showApp();
  initApp();
} else {
  showLogin();
}

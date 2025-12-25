/* =========================
   CONFIG
========================= */
const API_BASE = '';
const OWNER_PIN = '1234'; // 🔴 เปลี่ยนเป็น PIN ที่ต้องการ

/* =========================
   ELEMENTS
========================= */
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const pinInput = document.getElementById('pin');
const loginMsg = document.getElementById('loginMsg');
const logoutBtn = document.getElementById('logoutBtn');

/* =========================
   LOGIN LOGIC
========================= */
function showLogin() {
  loginOverlay.style.display = 'flex';
}

function hideLogin() {
  loginOverlay.style.display = 'none';
}

function isLoggedIn() {
  return localStorage.getItem('adore_logged_in') === 'true';
}

loginBtn.addEventListener('click', () => {
  const pin = pinInput.value.trim();

  if (!pin) {
    loginMsg.textContent = 'กรุณาใส่ PIN';
    return;
  }

  if (pin === OWNER_PIN) {
    localStorage.setItem('adore_logged_in', 'true');
    hideLogin();
  } else {
    loginMsg.textContent = 'PIN ไม่ถูกต้อง';
  }
});

logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('adore_logged_in');
  location.reload();
});

/* =========================
   INIT
========================= */
window.addEventListener('load', () => {
  if (!isLoggedIn()) {
    showLogin();
  } else {
    hideLogin();
  }
});

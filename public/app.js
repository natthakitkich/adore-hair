/* =========================
   AUTH / LOGIN
========================= */

let isAuthed = false;
const AUTH_KEY = 'adore_auth';
const OWNER_PIN = '1234'; // เปลี่ยนได้

function initAuth() {
  isAuthed = localStorage.getItem(AUTH_KEY) === '1';
  toggleAuthUI();
}

function toggleAuthUI() {
  const overlay = document.getElementById('loginOverlay');
  if (!overlay) return;

  if (isAuthed) {
    overlay.classList.add('hidden');
    init(); // ⭐ เข้า main app หลัง login
  } else {
    overlay.classList.remove('hidden');
  }
}

function bindAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const pinInput = document.getElementById('pin');
  const loginMsg = document.getElementById('loginMsg');

  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault(); // ⭐ สำคัญมาก (Safari iOS)

      const pin = (pinInput.value || '').trim();

      if (pin.length !== 4) {
        loginMsg.textContent = 'กรุณาใส่ PIN 4 หลัก';
        return;
      }

      if (pin !== OWNER_PIN) {
        loginMsg.textContent = 'PIN ไม่ถูกต้อง';
        return;
      }

      // ✅ ผ่าน
      localStorage.setItem(AUTH_KEY, '1');
      isAuthed = true;

      pinInput.value = '';
      loginMsg.textContent = '';

      toggleAuthUI();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem(AUTH_KEY);
      isAuthed = false;
      toggleAuthUI();
    });
  }
}

bindAuthUI();
initAuth();

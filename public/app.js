document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  /* ================= ELEMENTS ================= */
  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pinInput');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');
  const topDate = document.getElementById('topDate');

  /* ================= LOGIN STATE ================= */
  const isAuthed = localStorage.getItem(AUTH_KEY) === 'true';

  if (isAuthed) {
    hideLogin();
    bootApp();
  } else {
    showLogin();
  }

  /* ================= LOGIN ================= */
  loginBtn.onclick = () => {
    const raw = pinInput.value || '';

    // ✅ iOS Safari safe normalize
    const pin = raw.replace(/\D/g, '').trim();

    if (pin !== OWNER_PIN) {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }

    localStorage.setItem(AUTH_KEY, 'true');
    pinInput.value = '';
    loginMsg.textContent = '';
    hideLogin();
    bootApp();
  };

  // ป้องกัน Safari ใส่ค่าเพี้ยน
  pinInput.addEventListener('input', () => {
    pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 4);
  });

  /* ================= LOGOUT ================= */
  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ================= UI HELPERS ================= */
  function showLogin() {
    loginOverlay.classList.remove('hidden');
  }

  function hideLogin() {
    loginOverlay.classList.add('hidden');
  }

  /* ================= APP BOOT ================= */
  function bootApp() {
    renderTopDate();
    console.log('✅ Login success – App booted');
  }

  function renderTopDate() {
    if (!topDate) return;
    topDate.textContent = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

});

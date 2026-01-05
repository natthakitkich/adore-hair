document.addEventListener('DOMContentLoaded', () => {

  /* ================= CONFIG ================= */
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  /* ================= ELEMENTS ================= */
  const loginOverlay = document.getElementById('loginOverlay');
  const appRoot = document.getElementById('appRoot');

  const pinInput = document.getElementById('pinInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');
  const topDate = document.getElementById('topDate');

  /* ================= INIT ================= */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    showApp();
  } else {
    showLogin();
  }

  /* ================= LOGIN ================= */
  loginBtn.onclick = () => {
    const pin = pinInput.value.replace(/\D/g, '');

    if (pin !== OWNER_PIN) {
      loginMsg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }

    localStorage.setItem(AUTH_KEY, 'true');
    pinInput.value = '';
    loginMsg.textContent = '';
    showApp();
  };

  pinInput.addEventListener('input', () => {
    pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 4);
  });

  /* ================= LOGOUT ================= */
  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ================= UI STATE ================= */
  function showLogin() {
    loginOverlay.style.display = 'flex';
    appRoot.style.display = 'none';
  }

  function showApp() {
    loginOverlay.style.display = 'none';
    appRoot.style.display = 'block';
    renderTopDate();
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

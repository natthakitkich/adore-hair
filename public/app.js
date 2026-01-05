document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_auth';

  const overlay = document.getElementById('loginOverlay');
  const app = document.getElementById('app');
  const pinInput = document.getElementById('pin');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const msg = document.getElementById('msg');

  /* ===== INIT ===== */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    showApp();
  } else {
    showLogin();
  }

  /* ===== LOGIN ===== */
  loginBtn.onclick = () => {
    const pin = pinInput.value.trim();

    if (pin !== OWNER_PIN) {
      msg.textContent = 'PIN ไม่ถูกต้อง';
      return;
    }

    localStorage.setItem(AUTH_KEY, 'true');
    pinInput.value = '';
    msg.textContent = '';
    showApp();
  };

  /* ===== LOGOUT ===== */
  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ===== UI ===== */
  function showLogin(){
    overlay.style.display = 'flex';
    app.style.display = 'none';
  }

  function showApp(){
    overlay.style.display = 'none';
    app.style.display = 'block';
  }

});

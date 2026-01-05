document.addEventListener('DOMContentLoaded', () => {

  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  const body = document.body;
  const loginOverlay = document.getElementById('loginOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const pinInput = document.getElementById('pinInput');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');
  const topDate = document.getElementById('topDate');

  /* ================= INIT ================= */
  if (localStorage.getItem(AUTH_KEY) === 'true') {
    setAuthed();
  } else {
    setLoggedOut();
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
    setAuthed();
  };

  pinInput.addEventListener('input', () => {
    pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 4);
  });

  /* ================= LOGOUT ================= */
  logoutBtn.onclick = () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  /* ================= STATE ================= */
  function setAuthed(){
    body.classList.add('authed');
    renderTopDate();
    console.log('✅ AUTHED');
  }

  function setLoggedOut(){
    body.classList.remove('authed');
  }

  function renderTopDate(){
    if (!topDate) return;
    topDate.textContent = new Date().toLocaleDateString('th-TH', {
      day:'numeric',
      month:'short',
      year:'numeric'
    });
  }

});

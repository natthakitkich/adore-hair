function bindAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const pinInput = document.getElementById('pinInput');

  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault(); // ⭐ สำคัญมาก

      const pin = (pinInput?.value || '').trim();

      if (pin.length !== 4) {
        alert('กรุณาใส่ PIN 4 หลัก');
        return;
      }

      // ผ่าน
      localStorage.setItem('adore_auth', '1');
      isAuthed = true;

      // ล้างค่า
      pinInput.value = '';

      toggleAuthUI();
      renderAll();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('adore_auth');
      isAuthed = false;
      toggleAuthUI();
    });
  }
}

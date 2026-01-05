// ================= BASIC STATE =================
let isLoggedIn = false;

// ================= ELEMENTS =================
const loginScreen = document.getElementById("login-screen");
const appScreen   = document.getElementById("app-screen");

const loginBtn = document.getElementById("login-btn");
const pinInput = document.getElementById("login-pin");

// ================= LOGIN =================
loginBtn.addEventListener("click", () => {
  const pin = pinInput.value.trim();

  if (pin.length !== 4) {
    alert("กรุณาใส่ PIN 4 หลัก");
    return;
  }

  // --- mock login ผ่านทันที ---
  isLoggedIn = true;

  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
});

// ================= MOBILE SUPPORT =================
// ป้องกัน iOS ไม่ยิง click
loginBtn.addEventListener("touchend", (e) => {
  e.preventDefault();
  loginBtn.click();
});

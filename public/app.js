/* =================================================
   Adore Hair – app.js (STABLE RESET)
   Goal: Login → Calendar → Booking Table WORK 100%
================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     CONFIG
  ========================= */
  const API = "/api";

  /* =========================
     ELEMENTS
  ========================= */
  const loginOverlay = document.getElementById("loginOverlay");
  const loginBtn = document.getElementById("loginBtn");
  const pinInput = document.getElementById("pinInput");
  const loginMsg = document.getElementById("loginMsg");

  const appScreen = document.getElementById("appScreen");
  const logoutBtn = document.getElementById("logoutBtn");

  const calendarGrid = document.getElementById("calendarGrid");
  const calendarTitle = document.getElementById("calendarTitle");
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");

  const bookingTableBody = document.getElementById("bookingTable");

  const tabs = document.querySelectorAll(".tab");

  /* =========================
     STATE
  ========================= */
  let currentDate = null;          // yyyy-mm-dd
  let currentMonth = new Date();   // Date object
  let currentBarber = "Bank";      // default
  let bookings = [];

  /* =========================
     INITIAL STATE
  ========================= */
  appScreen.classList.add("hidden");
  loginOverlay.classList.remove("hidden");

  /* =========================
     LOGIN
  ========================= */
  loginBtn.addEventListener("click", async () => {
    const pin = pinInput.value.trim();
    loginMsg.textContent = "";

    if (!pin) {
      loginMsg.textContent = "กรุณาใส่ PIN";
      return;
    }

    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });

      if (!res.ok) {
        loginMsg.textContent = "PIN ไม่ถูกต้อง";
        return;
      }

      // success
      loginOverlay.classList.add("hidden");
      appScreen.classList.remove("hidden");

      initApp();

    } catch (err) {
      loginMsg.textContent = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้";
      console.error(err);
    }
  });

  logoutBtn.addEventListener("click", () => {
    location.reload();
  });

  /* =========================
     INIT APP
  ========================= */
  function initApp() {
    const today = new Date();
    currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    currentDate = today.toISOString().slice(0, 10);

    bindCalendarNav();
    bindTabs();
    renderCalendar();
    loadBookings();
  }

  /* =========================
     CALENDAR NAV
  ========================= */
  function bindCalendarNav() {
    prevMonthBtn.addEventListener("click", () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      renderCalendar();
    });

    nextMonthBtn.addEventListener("click", () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      renderCalendar();
    });
  }

  /* =========================
     CALENDAR RENDER
  ========================= */
  function renderCalendar() {
    calendarGrid.innerHTML = "";

    calendarTitle.textContent = currentMonth.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric"
    });

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // empty cells
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      empty.className = "calDay";
      empty.style.visibility = "hidden";
      calendarGrid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr =
        `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const cell = document.createElement("div");
      cell.className = "calDay";
      cell.textContent = day;

      if (dateStr === currentDate) {
        cell.classList.add("active");
      }

      cell.addEventListener("click", () => {
        currentDate = dateStr;
        renderCalendar();
        loadBookings();
      });

      calendarGrid.appendChild(cell);
    }
  }

  /* =========================
     LOAD BOOKINGS
  ========================= */
  async function loadBookings() {
    bookingTableBody.innerHTML = "";

    try {
      const res = await fetch(`${API}/bookings?date=${currentDate}`);
      bookings = await res.json();
      renderTable();
    } catch (err) {
      console.error("โหลดคิวไม่สำเร็จ", err);
    }
  }

  /* =========================
     RENDER TABLE
  ========================= */
  function renderTable() {
    bookingTableBody.innerHTML = "";

    const filtered = bookings.filter(b => b.barber === currentBarber);

    if (filtered.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="7" style="opacity:.5">ไม่มีคิว</td>`;
      bookingTableBody.appendChild(tr);
      return;
    }

    filtered.forEach(b => {
      const tr = document.createElement("tr");
      tr.className = `barber-${b.barber.toLowerCase()}`;

      tr.innerHTML = `
        <td>${b.time || ""}</td>
        <td>${b.barber}</td>
        <td>${b.gender || ""}</td>
        <td>${b.name || ""}</td>
        <td>${b.service || ""}</td>
        <td>${b.phone || ""}</td>
        <td><button class="btn-primary">แก้ไข</button></td>
      `;

      bookingTableBody.appendChild(tr);
    });
  }

  /* =========================
     BARBER TABS
  ========================= */
  function bindTabs() {
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelector(".tab.active")?.classList.remove("active");
        tab.classList.add("active");
        currentBarber = tab.dataset.barber;
        renderTable();
      });
    });
  }

});

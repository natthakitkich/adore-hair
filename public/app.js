/* =================================================
   Adore Hair – app.js (RECOVER FIX)
   Fix: JS runs before DOM ready
================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const API = "/api";

  /* =========================
     ELEMENTS
  ========================= */
  const loginOverlay = document.getElementById("loginOverlay");
  const editOverlay = document.getElementById("editOverlay");

  const loginBtn = document.getElementById("loginBtn");
  const pinInput = document.getElementById("pinInput");
  const loginMsg = document.getElementById("loginMsg");
  const logoutBtn = document.getElementById("logoutBtn");

  const calendarGrid = document.getElementById("calendarGrid");
  const calendarTitle = document.getElementById("calendarTitle");

  const bookingTable = document.getElementById("bookingTable");

  /* =========================
     FORCE INITIAL STATE
  ========================= */
  loginOverlay.classList.add("show");
  editOverlay.classList.remove("show");

  /* =========================
     STATE
  ========================= */
  let currentDate = "";
  let currentMonth = new Date();
  let currentBarber = "Bank";
  let bookings = [];
  let editingId = null;

  /* =========================
     LOGIN
  ========================= */
  loginBtn.onclick = async () => {
    const pin = pinInput.value.trim();
    if (!pin) return;

    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    if (!res.ok) {
      loginMsg.textContent = "PIN ไม่ถูกต้อง";
      return;
    }

    loginOverlay.classList.remove("show");
    init();
  };

  logoutBtn.onclick = () => location.reload();

  /* =========================
     INIT
  ========================= */
  function init() {
    const today = new Date();
    currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    currentDate = today.toISOString().slice(0, 10);

    bindCalendarNav();
    bindTabs();
    renderCalendar();
    loadBookings();
  }

  /* =========================
     CALENDAR
  ========================= */
  function bindCalendarNav() {
    document.getElementById("prevMonth").onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      renderCalendar();
    };

    document.getElementById("nextMonth").onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      renderCalendar();
    };
  }

  function renderCalendar() {
    calendarGrid.innerHTML = "";

    calendarTitle.textContent = currentMonth.toLocaleString("th-TH", {
      month: "long",
      year: "numeric",
    });

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      calendarGrid.innerHTML += `<div class="calDay empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr =
        `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      const div = document.createElement("div");
      div.className = "calDay";
      div.textContent = d;

      if (dateStr === currentDate) div.classList.add("active");

      div.onclick = () => {
        currentDate = dateStr;
        renderCalendar();
        loadBookings();
      };

      calendarGrid.appendChild(div);
    }
  }

  /* =========================
     LOAD BOOKINGS
  ========================= */
  async function loadBookings() {
    const res = await fetch(`${API}/bookings?date=${currentDate}`);
    bookings = await res.json();
    renderTable();
  }

  /* =========================
     TABLE
  ========================= */
  function renderTable() {
    bookingTable.innerHTML = "";

    bookings
      .filter(b => b.barber === currentBarber)
      .forEach(b => {
        const tr = document.createElement("tr");
        tr.className = `barber-${b.barber.toLowerCase()}`;
        tr.innerHTML = `
          <td>${b.time}</td>
          <td>${b.barber}</td>
          <td>${b.gender || ""}</td>
          <td>${b.name}</td>
          <td>${b.service || ""}</td>
          <td>${b.phone || ""}</td>
          <td><button class="ghost">แก้ไข</button></td>
        `;
        bookingTable.appendChild(tr);
      });
  }

  /* =========================
     TABS
  ========================= */
  function bindTabs() {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.onclick = () => {
        document.querySelector(".tab.active").classList.remove("active");
        tab.classList.add("active");
        currentBarber = tab.dataset.barber;
        renderTable();
      };
    });
  }

});

/* =================================================
   Adore Hair Studio – app.js
   Latest + Recover (Single State / Stable)
================================================= */

const API = "/api";

/* =========================
   GLOBAL STATE
========================= */
let currentDate = "";
let currentMonth = new Date();
let currentBarber = "Bank";
let bookings = [];
let editingId = null;

/* =========================
   BARBER COLOR (FROM BASIC)
========================= */
const BARBER_CLASS = {
  Bank: "barber-bank",
  Sindy: "barber-sindy",
  Assist: "barber-assist",
};

/* =========================
   LOGIN
========================= */
const loginOverlay = document.getElementById("loginOverlay");
const loginBtn = document.getElementById("loginBtn");
const pinInput = document.getElementById("pinInput");
const loginMsg = document.getElementById("loginMsg");
const logoutBtn = document.getElementById("logoutBtn");

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
  const title = document.getElementById("calendarTitle");
  const grid = document.getElementById("calendarGrid");

  title.textContent = currentMonth.toLocaleString("th-TH", {
    month: "long",
    year: "numeric",
  });

  grid.innerHTML = "";

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "calDay empty";
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cell = document.createElement("div");
    cell.className = "calDay";
    cell.textContent = d;

    if (dateStr === currentDate) {
      cell.classList.add("active");
    }

    cell.onclick = () => {
      currentDate = dateStr;
      renderCalendar();
      loadBookings();
    };

    grid.appendChild(cell);
  }
}

/* =========================
   LOAD BOOKINGS
========================= */
async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${currentDate}`);
  bookings = await res.json();

  renderTimeOptions();
  renderTable();
  updateSummary();
}

/* =========================
   TIME OPTIONS
========================= */
function renderTimeOptions() {
  const select = document.getElementById("timeSelect");
  select.innerHTML = "";

  for (let h = 13; h <= 22; h++) {
    const time = `${String(h).padStart(2, "0")}:00`;
    const isBooked = bookings.some(
      (b) => b.time === time && b.barber === currentBarber
    );

    const opt = document.createElement("option");
    opt.value = time;
    opt.textContent = time;
    if (isBooked) opt.disabled = true;

    select.appendChild(opt);
  }
}

/* =========================
   BARBER TABS
========================= */
function bindTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.onclick = () => {
      document.querySelector(".tab.active").classList.remove("active");
      tab.classList.add("active");
      currentBarber = tab.dataset.barber;
      renderTimeOptions();
      renderTable();
      updateSummary();
    };
  });
}

/* =========================
   FORM SUBMIT
========================= */
document.getElementById("bookingForm").onsubmit = async (e) => {
  e.preventDefault();

  const gender = document.querySelector('input[name="gender"]:checked')?.value;

  await fetch(`${API}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: currentDate,
      time: document.getElementById("timeSelect").value,
      barber: currentBarber,
      name: document.getElementById("nameInput").value,
      phone: document.getElementById("phoneInput").value,
      gender,
      service: document.getElementById("serviceInput").value,
    }),
  });

  e.target.reset();
  loadBookings();
};

/* =========================
   TABLE
========================= */
function renderTable() {
  const tbody = document.getElementById("bookingTable");
  tbody.innerHTML = "";

  bookings
    .filter((b) => b.barber === currentBarber)
    .forEach((b) => {
      const tr = document.createElement("tr");
      tr.classList.add(BARBER_CLASS[b.barber]);

      tr.innerHTML = `
        <td>${b.time}</td>
        <td>${b.barber}</td>
        <td>${b.gender === "male" ? "ชาย" : "หญิง"}</td>
        <td>${b.name}</td>
        <td>${b.service || ""}</td>
        <td>${b.phone || ""}</td>
        <td><button class="ghost">ลบ/แก้ไข</button></td>
      `;

      tr.querySelector("button").onclick = () => openEditModal(b);
      tbody.appendChild(tr);
    });
}

/* =========================
   SUMMARY
========================= */
function updateSummary() {
  const bank = bookings.filter((b) => b.barber === "Bank").length;
  const sindy = bookings.filter((b) => b.barber === "Sindy").length;
  const assist = bookings.filter((b) => b.barber === "Assist").length;

  document.getElementById("sumBank").textContent = bank;
  document.getElementById("sumSindy").textContent = sindy;
  document.getElementById("sumAssist").textContent = assist;
  document.getElementById("sumTotal").textContent =
    bank + sindy + assist;
}

/* =========================
   EDIT MODAL
========================= */
const editOverlay = document.getElementById("editOverlay");

function openEditModal(b) {
  editingId = b.id;

  document.getElementById("editTime").value = b.time;
  document.getElementById("editBarber").value = b.barber;
  document.getElementById("editName").value = b.name;
  document.getElementById("editPhone").value = b.phone || "";
  document.getElementById("editService").value = b.service || "";

  document
    .querySelectorAll('input[name="editGender"]')
    .forEach((r) => (r.checked = r.value === b.gender));

  editOverlay.classList.add("show");
}

document.getElementById("closeEditBtn").onclick = () => {
  editOverlay.classList.remove("show");
};

document.getElementById("saveEditBtn").onclick = async () => {
  const gender = document.querySelector(
    'input[name="editGender"]:checked'
  )?.value;

  await fetch(`${API}/bookings/${editingId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: document.getElementById("editName").value,
      phone: document.getElementById("editPhone").value,
      gender,
      service: document.getElementById("editService").value,
    }),
  });

  editOverlay.classList.remove("show");
  loadBookings();
};

document.getElementById("deleteEditBtn").onclick = async () => {
  if (!confirm("ยืนยันการลบคิวนี้?")) return;

  await fetch(`${API}/bookings/${editingId}`, {
    method: "DELETE",
  });

  editOverlay.classList.remove("show");
  loadBookings();
};

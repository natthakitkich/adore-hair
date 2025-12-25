// ===== State =====
let authed = false;
let currentDate = "";
let currentYM = "";
let currentStylist = "bank";
let bookings = [];

// ===== Elements =====
const $ = (id) => document.getElementById(id);

const loginOverlay = $("loginOverlay");
const loginBtn = $("loginBtn");
const loginMsg = $("loginMsg");
const pinInput = $("pin");

const dateInput = $("date");
const logoutBtn = $("logoutBtn");

const calTitle = $("calTitle");
const calGrid = $("calGrid");

const timeSelect = $("time");
const formEl = $("bookingForm");
const msgEl = $("msg");

const countBank = $("countBank");
const countSindy = $("countSindy");
const countAssist = $("countAssist");
const countTotal = $("countTotal");
const summaryHint = $("summaryHint");

const listEl = $("list");

// ===== Utils =====
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function ymFromDate(d) {
  return d.slice(0, 7);
}
function fmtTime(t) {
  return t.slice(0, 5);
}

// ===== Auth =====
async function checkAuth() {
  const res = await fetch("/api/me");
  authed = res.ok;
  loginOverlay.style.display = authed ? "none" : "flex";
}

loginBtn.onclick = async () => {
  loginMsg.textContent = "กำลังเข้าสู่ระบบ...";
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: pinInput.value }),
  });
  if (res.ok) {
    await init();
  } else {
    loginMsg.textContent = "PIN ไม่ถูกต้อง";
  }
};

logoutBtn.onclick = async () => {
  await fetch("/api/logout", { method: "POST" });
  location.reload();
};

// ===== Init =====
async function init() {
  await checkAuth();
  if (!authed) return;

  currentDate = todayISO();
  dateInput.value = currentDate;
  currentYM = ymFromDate(currentDate);

  bindTabs();
  await loadMeta();
  await loadMonth();
  await loadDay();
}

dateInput.onchange = async () => {
  currentDate = dateInput.value;
  currentYM = ymFromDate(currentDate);
  await loadMonth();
  await loadDay();
};

// ===== Tabs =====
function bindTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.onclick = async () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentStylist = btn.dataset.stylist;
      await loadDay();
    };
  });
}

// ===== Meta / Time =====
async function loadMeta() {
  const res = await fetch("/api/meta");
  const data = await res.json();
  timeSelect.innerHTML = `<option value="">เลือกเวลา</option>`;
  data.times.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  });
}

// ===== Calendar =====
async function loadMonth() {
  const res = await fetch(`/api/month?ym=${currentYM}`);
  const { days } = await res.json();

  const [y, m] = currentYM.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const lastDate = new Date(y, m, 0).getDate();

  calTitle.textContent = `${new Date(y, m - 1).toLocaleString("th-TH", {
    month: "long",
    year: "numeric",
  })}`;

  calGrid.innerHTML = "";

  for (let i = 0; i < firstDay; i++) {
    calGrid.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= lastDate; d++) {
    const cell = document.createElement("div");
    cell.textContent = d;
    if (days.includes(d)) cell.classList.add("has");
    if (String(d).padStart(2, "0") === currentDate.slice(8, 10)) {
      cell.classList.add("active");
    }
    cell.onclick = () => {
      currentDate = `${currentYM}-${String(d).padStart(2, "0")}`;
      dateInput.value = currentDate;
      loadDay();
    };
    calGrid.appendChild(cell);
  }
}

// ===== Load Day =====
async function loadDay() {
  msgEl.textContent = "กำลังโหลด...";
  const res = await fetch(`/api/summary?date=${currentDate}`);
  const data = await res.json();

  bookings = data.detail || [];

  // Summary
  countBank.textContent = data.counts.bank || 0;
  countSindy.textContent = data.counts.sindy || 0;
  countAssist.textContent = data.counts.assist || 0;
  countTotal.textContent = data.counts.total || 0;
  summaryHint.textContent = bookings.length ? "มีคิวแล้ว" : "-";

  // Disable times by stylist
  const used = bookings.filter((b) => b.stylist === currentStylist).map((b) => b.time);
  [...timeSelect.options].forEach((opt) => {
    if (!opt.value) return;
    opt.disabled = used.includes(opt.value);
  });

  renderTable();
  msgEl.textContent = "";
}

// ===== Table =====
function renderTable() {
  listEl.innerHTML = "";
  bookings.forEach((b) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fmtTime(b.time)}</td>
      <td>
        <span class="badge">${b.stylist}</span>
        <span class="badge ghost">${b.gender === "male" ? "ชาย" : "หญิง"}</span>
      </td>
      <td>${b.name}</td>
      <td>${b.service}</td>
      <td>${b.phone ? `<a href="tel:${b.phone}">${b.phone}</a>` : "-"}</td>
      <td>
        <button data-id="${b.id}" class="ghost del">ลบ</button>
      </td>
    `;
    listEl.appendChild(tr);
  });

  listEl.querySelectorAll(".del").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("ลบคิวนี้?")) return;
      await fetch(`/api/bookings/${btn.dataset.id}`, { method: "DELETE" });
      await loadDay();
      await loadMonth();
    };
  });
}

// ===== Submit =====
formEl.onsubmit = async (e) => {
  e.preventDefault();
  msgEl.textContent = "กำลังบันทึก...";

  const name = $("name").value.trim();
  const phone = $("phone").value.trim() || "0";
  const service = $("service").value.trim();
  const time = timeSelect.value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value;

  if (!name || !service || !time || !gender) {
    msgEl.textContent = "กรอกข้อมูลให้ครบ";
    return;
  }

  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: currentDate,
      time,
      stylist: currentStylist,
      gender,
      name,
      phone,
      service,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    msgEl.textContent = data.error || "บันทึกไม่สำเร็จ";
    return;
  }

  formEl.reset();
  msgEl.textContent = "บันทึกแล้ว";
  await loadDay();
  await loadMonth();
};

// ===== Start =====
init();

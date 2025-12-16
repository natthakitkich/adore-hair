const $ = (s) => document.querySelector(s);

// ===== Elements =====
const loginOverlay = $("#loginOverlay");
const pinEl = $("#pin");
const loginBtn = $("#loginBtn");
const loginMsg = $("#loginMsg");

const logoutBtn = $("#logoutBtn");
const dateEl = $("#date");

const tabMale = $("#tabMale");
const tabFemale = $("#tabFemale");

const formEl = $("#bookingForm");
const nameEl = $("#name");
const phoneEl = $("#phone");
const timeEl = $("#time");
const serviceEl = $("#service");
const noteEl = $("#note");

const msgEl = $("#msg");

const countMaleEl = $("#countMale");
const countFemaleEl = $("#countFemale");
const countTotalEl = $("#countTotal");
const daySummaryEl = $("#daySummary");
const listEl = $("#list");
const resetBtn = $("#resetBtn");

// ===== State =====
let category = "male";
let TIMES = ["13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00"];
let dayBookings = []; // bookings for selected date

// ===== Helpers =====
function setMsg(text, type = "") {
  msgEl.textContent = text || "";
  msgEl.className = "msg " + (type || "");
}

function setLoginMsg(text, type = "") {
  loginMsg.textContent = text || "";
  loginMsg.className = "msg " + (type || "");
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

async function api(path, opts = {}) {
  const r = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...opts
  });
  if (!r.ok) {
    let msg = "error";
    try {
      const j = await r.json();
      msg = j?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  try {
    return await r.json();
  } catch {
    return null;
  }
}

// ===== Auth =====
async function ensureAuth() {
  try {
    await api("/api/me");
    loginOverlay.classList.add("hidden");
    return true;
  } catch {
    loginOverlay.classList.remove("hidden");
    return false;
  }
}

loginBtn.addEventListener("click", async () => {
  setLoginMsg("");
  const pin = (pinEl.value || "").trim();
  if (!pin) return setLoginMsg("กรุณาใส่ PIN", "err");

  try {
    await api("/api/login", { method: "POST", body: JSON.stringify({ pin }) });
    setLoginMsg("เข้าสู่ระบบสำเร็จ ✅", "ok");
    loginOverlay.classList.add("hidden");
    await initAfterLogin();
  } catch (e) {
    setLoginMsg(e.message === "wrong pin" ? "PIN ไม่ถูกต้อง" : e.message, "err");
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await api("/api/logout", { method: "POST" });
  } finally {
    location.reload();
  }
});

// ===== UI: Tabs =====
function setActiveTab(cat) {
  category = cat;
  tabMale.classList.toggle("active", category === "male");
  tabFemale.classList.toggle("active", category === "female");
  renderTimeOptions(); // re-disable times based on category
}

tabMale.addEventListener("click", () => setActiveTab("male"));
tabFemale.addEventListener("click", () => setActiveTab("female"));

// ===== Data loading =====
async function loadMeta() {
  const meta = await api("/api/meta");
  // ถ้า server ส่ง times มาก็ใช้ของ server เป็นหลัก
  if (meta?.times?.length) TIMES = meta.times;
}

async function loadDay() {
  const date = dateEl.value;
  const s = await api(`/api/summary?date=${encodeURIComponent(date)}`);

  dayBookings = s?.detail || [];

  const male = s?.counts?.male ?? dayBookings.filter(b => b.category === "male").length;
  const female = s?.counts?.female ?? dayBookings.filter(b => b.category === "female").length;
  const total = s?.counts?.total ?? dayBookings.length;

  countMaleEl.textContent = male;
  countFemaleEl.textContent = female;
  countTotalEl.textContent = total;

  daySummaryEl.textContent = total ? `มีคิวแล้ว ${total} รายการ` : "ยังไม่มีคิว";

  renderTimeOptions();
  renderList();
}

function renderTimeOptions() {
  const selected = timeEl.value;
  timeEl.innerHTML = "";

  // disable เฉพาะเวลา “ประเภทเดียวกัน” ที่ถูกจองแล้วในวันนั้น
  const bookedTimesSameCat = new Set(
    dayBookings
      .filter(b => b.category === category)
      .map(b => b.time)
  );

  for (const t of TIMES) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;

    if (bookedTimesSameCat.has(t)) {
      opt.disabled = true;
      opt.textContent = `${t} (เต็ม)`;
    }
    timeEl.appendChild(opt);
  }

  // เลือกอันแรกที่ไม่ disabled
  const firstOk = [...timeEl.options].find(o => !o.disabled);
  if (firstOk) timeEl.value = firstOk.value;
  else timeEl.value = ""; // วันนั้นประเภทนี้เต็มทุกเวลา

  if (selected && [...timeEl.options].some(o => o.value === selected && !o.disabled)) {
    timeEl.value = selected;
  }
}

function badge(cat) {
  if (cat === "male") return `<span class="badge male">ผู้ชาย</span>`;
  return `<span class="badge female">ผู้หญิง</span>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function renderList() {
  // sort by time
  const sorted = [...dayBookings].sort((a,b) => (a.time||"").localeCompare(b.time||""));

  listEl.innerHTML = sorted.map(b => {
    return `
      <tr>
        <td>${esc(b.time)}</td>
        <td>${badge(b.category)}</td>
        <td>${esc(b.name)}</td>
        <td>${esc(b.service)}</td>
        <td>${esc(b.note)}</td>
        <td>${esc(b.phone)}</td>
        <td>
          <div class="actionsBtn">
            <button class="smallBtn danger" data-del="${b.id}">ลบ</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // bind delete
  listEl.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!confirm("ลบคิวนี้ใช่ไหม?")) return;
      try {
        await api(`/api/bookings/${id}`, { method: "DELETE" });
        setMsg("ลบคิวแล้ว ✅", "ok");
        await loadDay();
      } catch (e) {
        if (e.message === "unauthorized") await ensureAuth();
        setMsg(e.message, "err");
      }
    });
  });
}

// ===== Booking submit =====
formEl.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  setMsg("");

  const date = dateEl.value;
  const name = (nameEl.value || "").trim();
  const time = (timeEl.value || "").trim();

  // optional fields
  const phone = (phoneEl.value || "").trim();
  const service = (serviceEl.value || "").trim();
  const note = (noteEl.value || "").trim();

  if (!date) return setMsg("กรุณาเลือกวัน", "err");
  if (!name) return setMsg("กรุณาใส่ชื่อลูกค้า", "err");
  if (!time) return setMsg("วันนี้ช่วงเวลาสำหรับประเภทนี้เต็มแล้ว", "err");

  // กันซ้ำฝั่งหน้าเว็บ: ประเภทเดียวกัน + วันเดียวกัน + เวลาเดียวกัน ห้ามซ้ำ
  const dup = dayBookings.some(b => b.date === date && b.category === category && b.time === time);
  if (dup) return setMsg("เวลานี้ (ประเภทเดียวกัน) ถูกจองแล้ว ❌", "err");

  const payload = { date, time, category, name, phone, service, note };

  try {
    const r = await api("/api/bookings", { method: "POST", body: JSON.stringify(payload) });
    setMsg("จองคิวสำเร็จ ✅", "ok");
    formEl.reset();
    // หลัง reset ต้องรักษาวัน/แท็บไว้
    dateEl.value = date;
    setActiveTab(category);

    await loadDay();
  } catch (e) {
    if (e.message === "unauthorized") await ensureAuth();
    setMsg(e.message, "err");
  }
});

resetBtn.addEventListener("click", async () => {
  try {
    await loadDay();
    setMsg("รีเฟรชแล้ว ✅", "ok");
  } catch (e) {
    if (e.message === "unauthorized") await ensureAuth();
    setMsg(e.message, "err");
  }
});

// ===== Date change =====
dateEl.addEventListener("change", async () => {
  try {
    await loadDay();
  } catch (e) {
    if (e.message === "unauthorized") await ensureAuth();
    setMsg(e.message, "err");
  }
});

// ===== Init =====
async function initAfterLogin() {
  await loadMeta();
  if (!dateEl.value) dateEl.value = todayISO();
  setActiveTab("male");
  await loadDay();
}

(async function boot() {
  // set default date before auth to avoid blank UI
  if (!dateEl.value) dateEl.value = todayISO();

  const ok = await ensureAuth();
  if (ok) await initAfterLogin();
})();

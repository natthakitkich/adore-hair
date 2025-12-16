const $ = s => document.querySelector(s);

const loginOverlay = $("#loginOverlay");
const pinEl = $("#pin");
const loginBtn = $("#loginBtn");
const loginMsg = $("#loginMsg");

const timeEl = $("#time");
const form = $("#bookingForm");
const listEl = $("#list");

async function api(path, opts = {}) {
  const r = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function checkLogin() {
  try {
    await api("/api/me");
    loginOverlay.style.display = "none";
    init();
  } catch {
    loginOverlay.style.display = "flex";
  }
}

loginBtn.onclick = async () => {
  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ pin: pinEl.value })
    });
    loginOverlay.style.display = "none";
    init();
  } catch {
    loginMsg.textContent = "PIN ไม่ถูกต้อง";
  }
};

async function init() {
  const meta = await api("/api/meta");
  timeEl.innerHTML = meta.times.map(t => `<option>${t}</option>`).join("");
  refresh();
}

async function refresh() {
  const d = new Date().toISOString().slice(0, 10);
  const s = await api(`/api/summary?date=${d}`);
  listEl.innerHTML = s.detail.map(b =>
    `<tr><td>${b.time}</td><td>${b.name}</td><td>${b.service}</td></tr>`
  ).join("");
}

form.onsubmit = async e => {
  e.preventDefault();
  await api("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      category: "male",
      time: timeEl.value,
      name: $("#name").value,
      phone: $("#phone").value,
      service: $("#service").value
    })
  });
  form.reset();
  init();
};

checkLogin();

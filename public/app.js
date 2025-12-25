document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);

  // ===== Elements =====
  const dateEl = $("#date");
  const nameEl = $("#name");
  const phoneEl = $("#phone");
  const timeEl = $("#time");
  const serviceEl = $("#service");
  const formEl = $("#bookingForm");
  const msgEl = $("#msg");
  const listEl = $("#list");

  const countBank = $("#countBank");
  const countSindy = $("#countSindy");
  const countTotal = $("#countTotal");
  const summaryHint = $("#summaryHint");

  const refreshBtn = $("#refreshBtn");
  const submitBtn = $("#submitBtn");
  const cancelEditBtn = $("#cancelEditBtn");

  const loginOverlay = $("#loginOverlay");
  const pinEl = $("#pin");
  const loginBtn = $("#loginBtn");
  const loginMsg = $("#loginMsg");
  const logoutBtn = $("#logoutBtn");

  const calGrid = $("#calGrid");
  const calTitle = $("#calTitle");

  // ===== State =====
  let currentStylist = "Bank";
  let TIMES = [];
  let editId = null;
  let lastDetail = [];

  // ===== Helpers =====
  function todayLocalYYYYMMDD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  function ymFromDateStr(s) {
    return String(s || "").slice(0, 7);
  }

  function normTime(t) {
    return String(t || "").slice(0, 5);
  }

  function setMsg(text, type = "") {
    if (!msgEl) return;
    msgEl.className = "msg " + type;
    msgEl.textContent = text || "";
  }

  function setLoginMsg(text, type = "") {
    if (!loginMsg) return;
    loginMsg.className = "msg " + type;
    loginMsg.textContent = text || "";
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  function stylistFromRow(b) {
    if (b.stylist) return b.stylist;
    return b.category === "male" ? "Bank" : "Sindy";
  }

  // ===== Auth =====
  async function ensureAuth() {
    try {
      await api("/api/me");
      loginOverlay.style.display = "none";
      return true;
    } catch {
      loginOverlay.style.display = "grid";
      return false;
    }
  }

  // ===== Tabs =====
  function setActiveStylist(name) {
    currentStylist = name;
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.stylist === name);
    });
    applyDisabledTimes();
  }

  // ===== Time =====
  function renderTimeOptions() {
    timeEl.innerHTML = `<option value="" disabled selected>เลือกเวลา</option>`;
    TIMES.forEach((t) => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      timeEl.appendChild(o);
    });
    applyDisabledTimes();
  }

  function applyDisabledTimes() {
    if (!Array.isArray(lastDetail)) return;

    const booked = new Set(
      lastDetail
        .filter((b) => stylistFromRow(b) === currentStylist)
        .map((b) => normTime(b.time))
    );

    [...timeEl.options].forEach((opt) => {
      if (!opt.value) return;
      const v = normTime(opt.value);
      const selected = normTime(timeEl.value);
      opt.disabled = booked.has(v) && (!editId || v !== selected);
    });
  }

  // ===== List =====
  function renderList(detail) {
    listEl.innerHTML = "";

    if (!detail.length) {
      listEl.innerHTML = `<tr><td colspan="6" class="muted">ยังไม่มีการจองคิว</td></tr>`;
      return;
    }

    detail.forEach((b) => {
      const stylist = stylistFromRow(b);
      const gender = b.gender || b.category;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${normTime(b.time)}</b></td>
        <td>
          <span class="badge">${stylist}</span>
          <span class="badge ${gender === "male" ? "male" : "female"}">
            ${gender === "male" ? "ชาย" : "หญิง"}
          </span>
        </td>
        <td>${escapeHtml(b.name)}</td>
        <td>${escapeHtml(b.service || "")}</td>
        <td>${
          b.phone
            ? `<a href="tel:${b.phone}" style="color:var(--accent)">${b.phone}</a>`
            : "-"
        }</td>
        <td class="actionsBtn">
          <button class="smallBtn edit" data-id="${b.id}">แก้ไข</button>
          <button class="smallBtn danger del" data-id="${b.id}">ลบ</button>
        </td>
      `;
      listEl.appendChild(tr);
    });

    listEl.querySelectorAll(".edit").forEach((btn) => {
      btn.onclick = () => enterEditMode(btn.dataset.id);
    });

    listEl.querySelectorAll(".del").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("ยืนยันลบคิวนี้?")) return;
        await api(`/api/bookings/${btn.dataset.id}`, { method: "DELETE" });
        if (editId === Number(btn.dataset.id)) exitEditMode();
        await refresh();
        await refreshMonth();
      };
    });
  }

  function enterEditMode(id) {
    const b = lastDetail.find((x) => x.id == id);
    if (!b) return;

    editId = b.id;
    dateEl.value = b.date;
    setActiveStylist(stylistFromRow(b));
    renderTimeOptions();
    timeEl.value = normTime(b.time);
    nameEl.value = b.name;
    phoneEl.value = b.phone || "";
    serviceEl.value = b.service || "";

    document
      .querySelectorAll("input[name=gender]")
      .forEach((r) => (r.checked = r.value === (b.gender || b.category)));

    submitBtn.textContent = "บันทึกการแก้ไข";
    cancelEditBtn.style.display = "inline-block";
    applyDisabledTimes();
  }

  function exitEditMode() {
    editId = null;
    submitBtn.textContent = "บันทึกการจอง";
    cancelEditBtn.style.display = "none";
    formEl.reset();
    renderTimeOptions();
  }

  // ===== Refresh Day =====
  async function refresh() {
    const d = dateEl.value;
    const r = await api(`/api/summary?date=${encodeURIComponent(d)}`);
    lastDetail = r.detail || [];

    const bank = lastDetail.filter((b) => stylistFromRow(b) === "Bank").length;
    const sindy = lastDetail.filter((b) => stylistFromRow(b) === "Sindy").length;

    countBank.textContent = bank;
    countSindy.textContent = sindy;
    countTotal.textContent = lastDetail.length;

    summaryHint.textContent = new Date(d).toLocaleDateString("th-TH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    renderList(lastDetail);
    applyDisabledTimes();
    paintSelectedDay();
  }

  // ===== Calendar =====
  function monthTitleFromYM(ym) {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    });
  }

  function daysInMonth(y, m0) {
    return new Date(y, m0 + 1, 0).getDate();
  }

  function firstDowSunday0(y, m0) {
    return new Date(y, m0, 1).getDay();
  }

  function paintSelectedDay() {
    const dd = Number(dateEl.value.slice(8, 10));
    calGrid.querySelectorAll(".calCell").forEach((c) => {
      c.classList.toggle("selected", Number(c.dataset.day) === dd);
    });
  }

  async function refreshMonth() {
    const ym = ymFromDateStr(dateEl.value);
    calTitle.textContent = monthTitleFromYM(ym);

    const r = await api(`/api/month?ym=${encodeURIComponent(ym)}`);
    const hasDays = new Set((r.days || []).map(Number));

    const [y, m] = ym.split("-").map(Number);
    const total = daysInMonth(y, m - 1);
    const first = firstDowSunday0(y, m - 1);

    calGrid.innerHTML = "";

    for (let i = 0; i < first; i++) {
      const e = document.createElement("div");
      e.className = "calCell mutedDay";
      calGrid.appendChild(e);
    }

    for (let d = 1; d <= total; d++) {
      const c = document.createElement("div");
      c.className = "calCell" + (hasDays.has(d) ? " hasBookings" : "");
      c.dataset.day = d;
      c.innerHTML = `<div class="calNum">${d}</div>`;
      c.onclick = async () => {
        dateEl.value = `${ym}-${String(d).padStart(2, "0")}`;
        await refresh();
      };
      calGrid.appendChild(c);
    }

    paintSelectedDay();
  }

  // ===== Boot =====
  async function boot() {
    const meta = await api("/api/meta");
    TIMES = meta.times || [];
    renderTimeOptions();

    document.querySelectorAll(".tab").forEach((b) => {
      b.onclick = () => setActiveStylist(b.dataset.stylist);
    });

    refreshBtn.onclick = async () => {
      await refresh();
      await refreshMonth();
    };

    cancelEditBtn.onclick = exitEditMode;

    dateEl.onchange = async () => {
      await refresh();
      await refreshMonth();
    };

    formEl.onsubmit = async (e) => {
      e.preventDefault();
      setMsg("");

      const g = document.querySelector("input[name=gender]:checked");
      if (!g) return setMsg("กรุณาเลือกเพศลูกค้า", "err");

      const payload = {
        date: dateEl.value,
        stylist: currentStylist,
        gender: g.value,
        time: timeEl.value,
        name: nameEl.value.trim(),
        phone: phoneEl.value.trim(),
        service: serviceEl.value.trim(),
      };

      if (!payload.time || !payload.name || !payload.service)
        return setMsg("กรอกข้อมูลให้ครบ", "err");

      if (editId) {
        await api(`/api/bookings/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/api/bookings", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      exitEditMode();
      await refresh();
      await refreshMonth();
    };

    await refresh();
    await refreshMonth();
  }

  // ===== Login =====
  loginBtn.onclick = async () => {
    try {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ pin: pinEl.value }),
      });
      await boot();
    } catch (e) {
      setLoginMsg(e.message, "err");
    }
  };

  logoutBtn.onclick = async () => {
    await api("/api/logout", { method: "POST" });
    location.reload();
  };

  (async () => {
    dateEl.value = todayLocalYYYYMMDD();
    if (await ensureAuth()) await boot();
  })();
});

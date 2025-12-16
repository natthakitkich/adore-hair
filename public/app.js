document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);

  // ===== Login overlay =====
  const loginOverlay = $("#loginOverlay");
  const pinEl = $("#pin");
  const loginBtn = $("#loginBtn");
  const loginMsg = $("#loginMsg");
  const logoutBtn = $("#logoutBtn");

  // ===== Booking form =====
  const dateEl = $("#date");
  const nameEl = $("#name");
  const phoneEl = $("#phone");
  const timeEl = $("#time");
  const serviceEl = $("#service");
  const noteEl = $("#note");
  const formEl = $("#bookingForm");
  const submitBtn = $("#submitBtn");
  const cancelEditBtn = $("#cancelEditBtn");
  const refreshBtn = $("#refreshBtn");
  const msgEl = $("#msg");
  const listEl = $("#list");

  // ===== Summary =====
  const countMale = $("#countMale");
  const countFemale = $("#countFemale");
  const countTotal = $("#countTotal");
  const summaryHint = $("#summaryHint");

  // ===== Calendar month view =====
  const calGrid = $("#calGrid");
  const calTitle = $("#calTitle");
  const calPrev = $("#calPrev");
  const calNext = $("#calNext");

  let currentCategory = "male";
  let TIMES = [];
  let editId = null;

  // calendar state
  let calYear = null;
  let calMonth = null; // 1-12

  // ---------------- helpers ----------------
  function todayLocalYYYYMMDD() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function setMsg(text, type = "") {
    if (!msgEl) return;
    msgEl.className = "msg " + (type || "");
    msgEl.textContent = text || "";
  }

  function setLoginMsg(text, type = "") {
    if (!loginMsg) return;
    loginMsg.className = "msg " + (type || "");
    loginMsg.textContent = text || "";
  }

  function categoryLabel(cat) {
    return cat === "male" ? "ผู้ชาย" : "ผู้หญิง";
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...opts
    });

    let data = {};
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  async function ensureAuth() {
    try {
      await api("/api/me");
      if (loginOverlay) loginOverlay.classList.add("hidden");
      return true;
    } catch {
      if (loginOverlay) loginOverlay.classList.remove("hidden");
      return false;
    }
  }

  async function loadMetaAlways() {
    // /api/meta ควรเปิดให้เรียกได้เพื่อให้ dropdown เวลาไม่ว่าง
    const meta = await api("/api/meta");
    TIMES = meta.times || [];
    renderTimeOptions();
  }

  function renderTimeOptions() {
    if (!timeEl) return;
    timeEl.innerHTML = "";
    for (const t of TIMES) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      timeEl.appendChild(opt);
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setActiveTab(cat) {
    currentCategory = cat;
    document.querySelectorAll(".tab")
      .forEach(t => t.classList.toggle("active", t.dataset.tab === cat));

    if (!serviceEl) return;
    serviceEl.placeholder = cat === "male"
      ? "เช่น ตัดผม / รองทรง / สระ+ตัด"
      : "เช่น สระ+ไดร์ / ทำสี / ยืด / ดัด";
  }

  function enterEditMode(b) {
    editId = b.id;
    if (dateEl) dateEl.value = b.date;
    setActiveTab(b.category);
    if (timeEl) timeEl.value = b.time;
    if (nameEl) nameEl.value = b.name;
    if (phoneEl) phoneEl.value = b.phone;
    if (serviceEl) serviceEl.value = b.service;
    if (noteEl) noteEl.value = b.note || "";

    if (submitBtn) submitBtn.textContent = "บันทึกการแก้ไข";
    if (cancelEditBtn) cancelEditBtn.classList.remove("hidden");
    setMsg(`กำลังแก้ไขคิว ${b.time} (${categoryLabel(b.category)})`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exitEditMode() {
    editId = null;
    if (submitBtn) submitBtn.textContent = "บันทึกการจอง";
    if (cancelEditBtn) cancelEditBtn.classList.add("hidden");
    setMsg("");

    const keepDate = dateEl ? dateEl.value : todayLocalYYYYMMDD();
    if (formEl) formEl.reset();
    if (dateEl) dateEl.value = keepDate;

    renderTimeOptions();
    setActiveTab(currentCategory);
  }

  function renderList(detail) {
    if (!listEl) return;
    listEl.innerHTML = "";

    if (!detail.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="7" style="color:var(--muted)">ยังไม่มีการจองคิว</td>`;
      listEl.appendChild(tr);
      return;
    }

    for (const b of detail) {
      const tr = document.createElement("tr");
      const badgeClass = b.category === "male" ? "male" : "female";

      tr.innerHTML = `
        <td><b>${escapeHtml(b.time)}</b></td>
        <td><span class="badge ${badgeClass}">${categoryLabel(b.category)}</span></td>
        <td>${escapeHtml(b.name)}</td>
        <td>${escapeHtml(b.service)}</td>
        <td>${escapeHtml(b.note || "")}</td>
        <td><a href="tel:${escapeHtml(b.phone)}" style="color:var(--accent)">${escapeHtml(b.phone)}</a></td>
        <td>
          <div class="actionsBtn">
            <button class="smallBtn edit" data-id="${b.id}" type="button">แก้ไข</button>
            <button class="smallBtn danger del" data-id="${b.id}" type="button">ลบ</button>
          </div>
        </td>
      `;
      listEl.appendChild(tr);
    }

    listEl.querySelectorAll(".edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        const found = detail.find(x => x.id === id);
        if (found) enterEditMode(found);
      });
    });

    listEl.querySelectorAll(".del").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-id"));
        if (!id) return;
        if (!confirm("ยืนยันลบคิวนี้?")) return;

        try {
          await api(`/api/bookings/${id}`, { method: "DELETE" });
          if (editId === id) exitEditMode();
          setMsg("ลบคิวแล้ว ✅", "ok");
          await refresh();
          await renderCalendar(calYear, calMonth);
        } catch (e) {
          if (e.message === "unauthorized") await ensureAuth();
          setMsg(e.message, "err");
        }
      });
    });
  }

  async function refresh() {
    const date = dateEl ? dateEl.value : todayLocalYYYYMMDD();
    const sum = await api(`/api/summary?date=${encodeURIComponent(date)}`);

    if (countMale) countMale.textContent = sum.counts.male ?? 0;
    if (countFemale) countFemale.textContent = sum.counts.female ?? 0;
    if (countTotal) countTotal.textContent = sum.counts.total ?? 0;

    if (summaryHint) {
      const d = new Date(date + "T00:00:00");
      summaryHint.textContent = d.toLocaleDateString("th-TH", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
    }

    renderList(sum.detail || []);
  }

  // ---------------- calendar month view ----------------
  function monthTitleTH(year, month1to12) {
    const d = new Date(year, month1to12 - 1, 1);
    return d.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }

  function daysInMonth(year, month1to12) {
    return new Date(year, month1to12, 0).getDate();
  }

  function firstDow(year, month1to12) {
    return new Date(year, month1to12 - 1, 1).getDay(); // 0=Sun
  }

  async function loadMonthSummary(year, month) {
    return await api(`/api/month?year=${year}&month=${month}`);
  }

  async function renderCalendar(year, month) {
    // ถ้า index.html ยังไม่ใส่ปฏิทิน ก็ไม่ต้องทำอะไร (กันพัง)
    if (!calGrid || !calTitle || !calPrev || !calNext) return;

    calTitle.textContent = monthTitleTH(year, month);
    calGrid.innerHTML = "";

    const sum = await loadMonthSummary(year, month);
    const counts = sum.counts || {};

    const start = firstDow(year, month);
    const total = daysInMonth(year, month);

    // เติมช่องว่างก่อนวันแรก
    for (let i = 0; i < start; i++) {
      const cell = document.createElement("div");
      cell.className = "calDay muted";
      calGrid.appendChild(cell);
    }

    // วาดวันในเดือน
    for (let day = 1; day <= total; day++) {
      const cell = document.createElement("div");
      const has = (counts[day] || 0) > 0;

      cell.className = "calDay" + (has ? " hasBooking" : "");
      cell.textContent = String(day);

      if (has) {
        const dot = document.createElement("div");
        dot.className = "dot";
        cell.appendChild(dot);
      }

      cell.addEventListener("click", async () => {
        const mm = String(month).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        if (dateEl) dateEl.value = `${year}-${mm}-${dd}`;
        setMsg("");

        try {
          await refresh();
        } catch (e) {
          if (e.message === "unauthorized") await ensureAuth();
          setMsg(e.message, "err");
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      calGrid.appendChild(cell);
    }
  }

  // ---------------- events ----------------
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      setLoginMsg("");
      try {
        await api("/api/login", { method: "POST", body: JSON.stringify({ pin: pinEl?.value || "" }) });
        if (pinEl) pinEl.value = "";
        setLoginMsg("เข้าสู่ระบบสำเร็จ ✅", "ok");
        if (loginOverlay) loginOverlay.classList.add("hidden");

        await refresh();
        await renderCalendar(calYear, calMonth);
      } catch (e) {
        setLoginMsg(e.message, "err");
      }
    });
  }

  if (pinEl) {
    pinEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") loginBtn?.click();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try { await api("/api/logout", { method: "POST" }); }
      finally { if (loginOverlay) loginOverlay.classList.remove("hidden"); }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      setMsg("");
      try {
        await refresh();
        setMsg("อัปเดตแล้ว ✅", "ok");
        await renderCalendar(calYear, calMonth);
      } catch (e) {
        if (e.message === "unauthorized") await ensureAuth();
        setMsg(e.message, "err");
      }
    });
  }

  if (dateEl) {
    dateEl.addEventListener("change", async () => {
      setMsg("");
      try { await refresh(); }
      catch (e) {
        if (e.message === "unauthorized") await ensureAuth();
        setMsg(e.message, "err");
      }
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => exitEditMode());
  }

  if (formEl) {
    formEl.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      setMsg("");

      const payload = {
        date: dateEl?.value || todayLocalYYYYMMDD(),
        category: currentCategory,
        time: timeEl?.value || "",
        name: nameEl?.value?.trim() || "",
        phone: phoneEl?.value?.trim() || "",
        service: serviceEl?.value?.trim() || "",
        note: noteEl?.value?.trim() || ""
      };

      try {
        if (editId) {
          await api(`/api/bookings/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
          setMsg("แก้ไขคิวสำเร็จ ✅", "ok");
          exitEditMode();
        } else {
          await api("/api/bookings", { method: "POST", body: JSON.stringify(payload) });
          setMsg("บันทึกการจองสำเร็จ ✅", "ok");
          formEl.reset();
          renderTimeOptions();
          setActiveTab(currentCategory);
        }

        await refresh();
        await renderCalendar(calYear, calMonth);
      } catch (e) {
        if (e.message === "unauthorized") await ensureAuth();

        if (e.message === "time already booked for this category") {
          setMsg("เวลานี้ถูกจองแล้ว (ในประเภทเดียวกัน) ❌", "err");
        } else if (e.message === "missing fields") {
          setMsg("กรอกข้อมูลให้ครบก่อนนะ ❌", "err");
        } else if (e.message === "invalid time") {
          setMsg("เวลาไม่ถูกต้อง ❌", "err");
        } else {
          setMsg(e.message, "err");
        }
      }
    });
  }

  // calendar month navigation buttons
  if (calPrev) {
    calPrev.addEventListener("click", async () => {
      calMonth -= 1;
      if (calMonth < 1) { calMonth = 12; calYear -= 1; }
      try { await renderCalendar(calYear, calMonth); } catch {}
    });
  }

  if (calNext) {
    calNext.addEventListener("click", async () => {
      calMonth += 1;
      if (calMonth > 12) { calMonth = 1; calYear += 1; }
      try { await renderCalendar(calYear, calMonth); } catch {}
    });
  }

  // ---------------- init ----------------
  (async function init() {
    // set default date & tab
    if (dateEl) dateEl.value = todayLocalYYYYMMDD();
    setActiveTab("male");

    // init month
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth() + 1;

    // load time options (so dropdown never empty)
    try {
      await loadMetaAlways();
    } catch (e) {
      if (timeEl) timeEl.innerHTML = `<option value="">โหลดเวลาไม่สำเร็จ</option>`;
      setMsg("โหลดเวลาไม่สำเร็จ: " + e.message, "err");
    }

    // require auth to see data
    const authed = await ensureAuth();
    if (authed) {
      try {
        await refresh();
        await renderCalendar(calYear, calMonth);
      } catch (e) {
        setMsg(e.message, "err");
      }
    } else {
      // still show calendar shell (optional) but won't load counts (API guarded)
      // we do nothing here; after login, renderCalendar will load.
    }
  })();
});

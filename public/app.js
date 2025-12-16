document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);

  // ===== Main form elements =====
  const dateEl = $("#date");
  const nameEl = $("#name");
  const phoneEl = $("#phone");
  const timeEl = $("#time");
  const serviceEl = $("#service");
  const noteEl = $("#note");
  const formEl = $("#bookingForm");
  const msgEl = $("#msg");
  const listEl = $("#list");

  const countMale = $("#countMale");
  const countFemale = $("#countFemale");
  const countTotal = $("#countTotal");
  const summaryHint = $("#summaryHint");

  const refreshBtn = $("#refreshBtn");
  const submitBtn = $("#submitBtn");
  const cancelEditBtn = $("#cancelEditBtn");

  // ===== Auth UI =====
  const loginOverlay = $("#loginOverlay");
  const pinEl = $("#pin");
  const loginBtn = $("#loginBtn");
  const loginMsg = $("#loginMsg");
  const logoutBtn = $("#logoutBtn");

  // ===== Optional date picker overlay (calendar) =====
  const datePickerOverlay = $("#datePickerOverlay"); // overlay container
  const dpTitle = $("#dpTitle");
  const dpPrev = $("#dpPrev");
  const dpNext = $("#dpNext");
  const dpGrid = $("#dpGrid");
  const dpClose = $("#dpClose");
  const openDatePickerBtn = $("#openDatePickerBtn"); // ถ้ามีปุ่มเลือกวัน

  let currentCategory = "male";
  let TIMES = [];
  let editId = null;

  // calendar state
  let dpYear = null;
  let dpMonth = null; // 0-11

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

  // ---- Robust API helper (รองรับ 204 / non-json / 401) ----
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...opts
    });

    const text = await res.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data;
  }

  function showLogin() {
    if (loginOverlay) loginOverlay.style.display = "grid";
  }

  function hideLogin() {
    if (loginOverlay) loginOverlay.style.display = "none";
  }

  // ✅ สำคัญ: อย่าให้หน้าเว็บพังตอนยังไม่ auth
  async function ensureAuth() {
    try {
      await api("/api/me");
      hideLogin();
      return true;
    } catch (e) {
      showLogin();
      return false;
    }
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

    if (TIMES.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "— ไม่มีช่วงเวลา —";
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
  function escapeAttr(s) { return escapeHtml(s); }

  function setActiveTab(cat) {
    currentCategory = cat;
    document.querySelectorAll(".tab").forEach(t =>
      t.classList.toggle("active", t.dataset.tab === cat)
    );
    if (serviceEl) {
      serviceEl.placeholder = cat === "male"
        ? "เช่น ตัดผม / รองทรง / สระ+ตัด"
        : "เช่น สระ+ไดร์ / ทำสี / ยืด / ดัด";
    }
  }

  function enterEditMode(b) {
    editId = b.id;
    if (dateEl) dateEl.value = b.date;
    setActiveTab(b.category);
    if (timeEl) timeEl.value = b.time;

    if (nameEl) nameEl.value = b.name || "";
    if (phoneEl) phoneEl.value = b.phone || "";
    if (serviceEl) serviceEl.value = b.service || "";
    if (noteEl) noteEl.value = b.note || "";

    if (submitBtn) submitBtn.textContent = "บันทึกการแก้ไข";
    if (cancelEditBtn) cancelEditBtn.style.display = "inline-block";
    setMsg(`กำลังแก้ไขคิว ${b.time} (${categoryLabel(b.category)})`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exitEditMode() {
    editId = null;
    if (submitBtn) submitBtn.textContent = "บันทึกการจอง";
    if (cancelEditBtn) cancelEditBtn.style.display = "none";
    setMsg("");

    const keepDate = dateEl?.value || todayLocalYYYYMMDD();
    formEl?.reset?.();
    if (dateEl) dateEl.value = keepDate;
    renderTimeOptions();
  }

  function renderList(detail) {
    if (!listEl) return;
    listEl.innerHTML = "";

    if (!detail?.length) {
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
        <td>${escapeHtml(b.name || "")}</td>
        <td>${escapeHtml(b.service || "")}</td>
        <td>${escapeHtml(b.note || "")}</td>
        <td>${b.phone ? `<a href="tel:${escapeAttr(b.phone)}" style="color:var(--accent)">${escapeHtml(b.phone)}</a>` : `<span class="muted">-</span>`}</td>
        <td class="actions">
          <button class="smallBtn edit" data-id="${b.id}">แก้ไข</button>
          <button class="smallBtn danger del" data-id="${b.id}">ลบ</button>
        </td>
      `;
      listEl.appendChild(tr);
    }

    listEl.querySelectorAll(".edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        const found = detail.find(x => Number(x.id) === id);
        if (found) enterEditMode(found);
      });
    });

    listEl.querySelectorAll(".del").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-id"));
        if (!id) return;
        try {
          await api(`/api/bookings/${id}`, { method: "DELETE" });
          if (editId === id) exitEditMode();
          setMsg("ลบคิวแล้ว", "ok");
          await refresh();
          await dpRefreshMarksSafe(); // อัปเดตวงกลมเขียว (ถ้ามี)
        } catch (e) {
          if (e.message === "unauthorized") showLogin();
          setMsg(e.message, "err");
        }
      });
    });
  }

  async function refresh() {
    const date = dateEl?.value || todayLocalYYYYMMDD();
    const sum = await api(`/api/summary?date=${encodeURIComponent(date)}`);

    if (countMale) countMale.textContent = sum.counts?.male ?? 0;
    if (countFemale) countFemale.textContent = sum.counts?.female ?? 0;
    if (countTotal) countTotal.textContent = sum.counts?.total ?? 0;

    if (summaryHint) {
      const d = new Date(date + "T00:00:00");
      summaryHint.textContent = d.toLocaleDateString("th-TH", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
    }

    renderList(sum.detail || []);
  }

  // =========================
  // Calendar overlay (month)
  // =========================
  function dpOpen() {
    if (!datePickerOverlay) return;
    datePickerOverlay.style.display = "grid";
  }
  function dpCloseFn() {
    if (!datePickerOverlay) return;
    datePickerOverlay.style.display = "none";
  }

  function ymdFromParts(y, m0, d) {
    const mm = String(m0 + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  function monthNameTH(y, m0) {
    const d = new Date(y, m0, 1);
    return d.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }

  async function dpFetchMonthMarks(y, m0) {
    // ต้องมี endpoint /api/month?ym=YYYY-MM ที่ฝั่ง server
    // ถ้าไม่มี ก็จะไม่พัง แค่ไม่มีวงกลมเขียว
    const ym = `${y}-${String(m0 + 1).padStart(2, "0")}`;
    try {
      const r = await api(`/api/month?ym=${encodeURIComponent(ym)}`);
      return new Set(r?.days || []);
    } catch {
      return new Set();
    }
  }

  async function dpRender(y, m0) {
    if (!dpGrid || !dpTitle) return;

    dpYear = y;
    dpMonth = m0;
    dpTitle.textContent = monthNameTH(y, m0);

    const first = new Date(y, m0, 1);
    const firstDow = (first.getDay() + 6) % 7; // monday=0
    const daysInMonth = new Date(y, m0 + 1, 0).getDate();

    const marked = await dpFetchMonthMarks(y, m0);

    // header weekdays
    const weekdays = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

    dpGrid.innerHTML = "";
    for (const w of weekdays) {
      const el = document.createElement("div");
      el.className = "dpWeek";
      el.textContent = w;
      dpGrid.appendChild(el);
    }

    // blanks
    for (let i = 0; i < firstDow; i++) {
      const blank = document.createElement("div");
      blank.className = "dpCell dpBlank";
      dpGrid.appendChild(blank);
    }

    // days
    const today = todayLocalYYYYMMDD();

    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = ymdFromParts(y, m0, d);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "dpCell dpDay";
      cell.innerHTML = `<span class="dpNum">${d}</span>`;

      if (ymd === today) cell.classList.add("today");
      if (dateEl?.value === ymd) cell.classList.add("active");

      if (marked.has(ymd)) cell.classList.add("marked"); // ✅ วงกลมเขียว

      cell.addEventListener("click", async () => {
        if (dateEl) dateEl.value = ymd;
        dpCloseFn();
        setMsg("");
        try { await refresh(); }
        catch (e) { setMsg(e.message, "err"); }
      });

      dpGrid.appendChild(cell);
    }
  }

  async function dpInitOpenAtToday() {
    const now = new Date();
    await dpRender(now.getFullYear(), now.getMonth());
    dpOpen();
  }

  async function dpRefreshMarksSafe() {
    if (dpYear == null || dpMonth == null) return;
    await dpRender(dpYear, dpMonth);
  }

  // =========================
  // INIT + Events
  // =========================
  function wireTabs() {
    document.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    });
  }

  async function loadMetaAndTimes() {
    const meta = await api("/api/meta");
    TIMES = meta.times || [];
    renderTimeOptions();
  }

  async function afterAuthedBoot() {
    // โหลด meta/time + refresh list
    await loadMetaAndTimes();
    await refresh();

    // ✅ ทำให้ “ปฏิทินเดือน” กลับมาเสมอ (ถ้ามี overlay ใน HTML)
    if (datePickerOverlay && dpGrid && dpTitle) {
      await dpInitOpenAtToday();
    }
  }

  // ---- Login events ----
  loginBtn?.addEventListener("click", async () => {
    setLoginMsg("");
    const pin = (pinEl?.value || "").trim();
    if (!pin) return setLoginMsg("กรุณาใส่ PIN", "err");

    try {
      await api("/api/login", { method: "POST", body: JSON.stringify({ pin }) });
      setLoginMsg("เข้าสู่ระบบสำเร็จ ✅", "ok");
      if (pinEl) pinEl.value = "";
      hideLogin();

      // ✅ หลัง login สำเร็จ ค่อย boot ของจริง
      await afterAuthedBoot();
    } catch (e) {
      setLoginMsg(e.message, "err");
      showLogin();
    }
  });

  pinEl?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") loginBtn?.click();
  });

  logoutBtn?.addEventListener("click", async () => {
    try { await api("/api/logout", { method: "POST" }); }
    finally {
      showLogin();
      setMsg("");
    }
  });

  // ---- Other UI events ----
  refreshBtn?.addEventListener("click", async () => {
    setMsg("");
    try {
      await refresh();
      setMsg("อัปเดตแล้ว", "ok");
    } catch (e) {
      if (e.message === "unauthorized") showLogin();
      setMsg(e.message, "err");
    }
  });

  dateEl?.addEventListener("change", async () => {
    setMsg("");
    try { await refresh(); }
    catch (e) {
      if (e.message === "unauthorized") showLogin();
      setMsg(e.message, "err");
    }
  });

  cancelEditBtn?.addEventListener("click", () => exitEditMode());

  // Date picker overlay controls (ถ้ามี)
  openDatePickerBtn?.addEventListener("click", async () => {
    const now = new Date();
    await dpRender(now.getFullYear(), now.getMonth());
    dpOpen();
  });

  dpClose?.addEventListener("click", dpCloseFn);
  datePickerOverlay?.addEventListener("click", (e) => {
    if (e.target === datePickerOverlay) dpCloseFn();
  });

  dpPrev?.addEventListener("click", async () => {
    if (dpYear == null || dpMonth == null) return;
    const d = new Date(dpYear, dpMonth - 1, 1);
    await dpRender(d.getFullYear(), d.getMonth());
  });

  dpNext?.addEventListener("click", async () => {
    if (dpYear == null || dpMonth == null) return;
    const d = new Date(dpYear, dpMonth + 1, 1);
    await dpRender(d.getFullYear(), d.getMonth());
  });

  // ---- Form submit ----
  formEl?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setMsg("");

    // required: name, time
    const payload = {
      date: dateEl?.value || todayLocalYYYYMMDD(),
      category: currentCategory,
      time: timeEl?.value || "",
      name: (nameEl?.value || "").trim(),
      phone: (phoneEl?.value || "").trim(),     // ✅ optional
      service: (serviceEl?.value || "").trim(), // ✅ optional (ตามที่คุณขอ)
      note: (noteEl?.value || "").trim()
    };

    if (!payload.name) return setMsg("กรุณาใส่ชื่อลูกค้า", "err");
    if (!payload.time) return setMsg("กรุณาเลือกเวลา", "err");

    try {
      if (editId) {
        await api(`/api/bookings/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        setMsg("แก้ไขคิวสำเร็จ ✅", "ok");
        exitEditMode();
      } else {
        await api("/api/bookings", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setMsg("จองคิวสำเร็จ ✅", "ok");
        formEl.reset();
        renderTimeOptions();
      }

      await refresh();
      await dpRefreshMarksSafe();
    } catch (e) {
      if (e.message === "unauthorized") showLogin();
      setMsg(e.message, "err");
    }
  });

  // =========================
  // Boot
  // =========================
  (async function init() {
    // safe default date
    if (dateEl) dateEl.value = todayLocalYYYYMMDD();

    wireTabs();
    setActiveTab("male");

    // ✅ สำคัญ: เช็ค auth ก่อน
    const authed = await ensureAuth();

    if (!authed) {
      // ยังไม่ auth → โชว์ login overlay และจบ (อย่าโหลด meta)
      return;
    }

    // auth แล้ว → boot
    try {
      await afterAuthedBoot();
    } catch (e) {
      // ถ้า meta/summary fail ก็อย่าให้เว็บตาย
      setMsg(e.message, "err");
    }
  })();
});

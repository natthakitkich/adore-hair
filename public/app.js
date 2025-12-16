document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);

  // ===== Main =====
  const dateEl = $("#date"); // hidden input ใช้เก็บวัน
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
  const pickDateBtn = $("#pickDateBtn");
  const logoutBtn = $("#logoutBtn");

  // ===== Login =====
  const loginOverlay = $("#loginOverlay");
  const pinEl = $("#pin");
  const loginBtn = $("#loginBtn");
  const loginMsg = $("#loginMsg");

  // ===== Date Picker Overlay =====
  const dpOverlay = $("#datePickerOverlay");
  const dpTitle = $("#dpTitle");
  const dpGrid = $("#dpGrid");
  const dpPrev = $("#dpPrev");
  const dpNext = $("#dpNext");
  const dpConfirm = $("#dpConfirm");
  const dpMsg = $("#dpMsg");

  let currentCategory = "male";
  let TIMES = [];
  let editId = null;

  // date picker state
  let dpYear = null;
  let dpMonth = null; // 0-11
  let markedDays = new Set(); // YYYY-MM-DD
  let selectedDate = null;

  function todayLocalYYYYMMDD() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function setMsg(text, type = "") {
    msgEl.className = "msg " + (type || "");
    msgEl.textContent = text || "";
  }
  function setLoginMsg(text, type = "") {
    loginMsg.className = "msg " + (type || "");
    loginMsg.textContent = text || "";
  }
  function setDpMsg(text, type = "") {
    dpMsg.className = "msg " + (type || "");
    dpMsg.textContent = text || "";
  }

  function categoryLabel(cat) {
    return cat === "male" ? "ผู้ชาย" : "ผู้หญิง";
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...opts
    });

    const text = await res.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

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

  function renderTimeOptions() {
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
  function escapeAttr(s) { return escapeHtml(s); }

  function setActiveTab(cat) {
    currentCategory = cat;
    document.querySelectorAll(".tab").forEach(t =>
      t.classList.toggle("active", t.dataset.tab === cat)
    );
    serviceEl.placeholder = cat === "male"
      ? "เช่น ตัดผม / รองทรง / สระ+ตัด"
      : "เช่น สระ+ไดร์ / ทำสี / ยืด / ดัด";
  }

  function enterEditMode(b) {
    editId = b.id;
    dateEl.value = b.date;
    selectedDate = b.date;

    setActiveTab(b.category);
    timeEl.value = b.time;

    nameEl.value = b.name || "";
    phoneEl.value = b.phone || "";
    serviceEl.value = b.service || "";
    noteEl.value = b.note || "";

    submitBtn.textContent = "บันทึกการแก้ไข";
    cancelEditBtn.classList.remove("hidden");
    setMsg(`กำลังแก้ไขคิว ${b.time} (${categoryLabel(b.category)})`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exitEditMode() {
    editId = null;
    submitBtn.textContent = "บันทึกการจอง";
    cancelEditBtn.classList.add("hidden");
    setMsg("");

    const keepDate = dateEl.value;
    formEl.reset();
    dateEl.value = keepDate;
    renderTimeOptions();
  }

  function renderList(detail) {
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
        <td>${escapeHtml(b.service || "")}</td>
        <td>${escapeHtml(b.note || "")}</td>
        <td>${b.phone ? `<a href="tel:${escapeAttr(b.phone)}" style="color:var(--accent)">${escapeHtml(b.phone)}</a>` : `<span class="muted">-</span>`}</td>
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
          await dpLoadMonthMarks();
          dpRender();
        } catch (e) {
          if (e.message === "unauthorized") await ensureAuth();
          setMsg(e.message, "err");
        }
      });
    });
  }

  async function refresh() {
    const date = dateEl.value;
    const sum = await api(`/api/summary?date=${encodeURIComponent(date)}`);

    countMale.textContent = sum.counts.male ?? 0;
    countFemale.textContent = sum.counts.female ?? 0;
    countTotal.textContent = sum.counts.total ?? 0;

    const d = new Date(date + "T00:00:00");
    summaryHint.textContent = d.toLocaleDateString("th-TH", {
      weekday:"long", year:"numeric", month:"long", day:"numeric"
    });

    renderList(sum.detail || []);
  }

  // ===== Date Picker =====
  function dpOpen() {
    dpOverlay.classList.remove("hidden");
  }
  function dpClose() {
    dpOverlay.classList.add("hidden");
  }
  function monthStr(y, m0) {
    return `${y}-${String(m0 + 1).padStart(2, "0")}`;
  }

  async function dpLoadMonthMarks() {
    const m = monthStr(dpYear, dpMonth);
    const r = await api(`/api/month?month=${encodeURIComponent(m)}`);
    markedDays = new Set(r.days || []);
  }

  function dpRender() {
    dpGrid.innerHTML = "";
    setDpMsg("");

    const first = new Date(dpYear, dpMonth, 1);
    const last = new Date(dpYear, dpMonth + 1, 0);
    const daysInMonth = last.getDate();

    dpTitle.textContent = first.toLocaleDateString("th-TH", {
      month: "long", year: "numeric"
    });

    const startDow = first.getDay(); // 0=Sun
    for (let i = 0; i < startDow; i++) {
      const cell = document.createElement("div");
      cell.className = "dayCell dim";
      dpGrid.appendChild(cell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const yyyy = dpYear;
      const mm = String(dpMonth + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      const ymd = `${yyyy}-${mm}-${dd}`;

      const cell = document.createElement("div");
      cell.className = "dayCell" +
        (markedDays.has(ymd) ? " marked" : "") +
        (selectedDate === ymd ? " selected" : "");

      cell.innerHTML = `<span class="num">${day}</span>`;

      cell.addEventListener("click", () => {
        selectedDate = ymd;
        dpRender();
      });

      dpGrid.appendChild(cell);
    }
  }

  async function dpInitAtTodayOpen() {
    const now = new Date();
    dpYear = now.getFullYear();
    dpMonth = now.getMonth();
    selectedDate = selectedDate || todayLocalYYYYMMDD();

    await dpLoadMonthMarks();
    dpRender();
    dpOpen();
  }

  // ===== Boot =====
  (async function init() {
    dateEl.value = todayLocalYYYYMMDD();

    // tabs
    document.querySelectorAll(".tab").forEach(btn =>
      btn.addEventListener("click", () => setActiveTab(btn.dataset.tab))
    );

    // refresh button
    refreshBtn.addEventListener("click", async () => {
      setMsg("");
      try { await refresh(); setMsg("อัปเดตแล้ว", "ok"); }
      catch (e) { if (e.message === "unauthorized") await ensureAuth(); setMsg(e.message, "err"); }
    });

    // cancel edit
    cancelEditBtn.addEventListener("click", () => exitEditMode());

    // pick date later (after already inside)
    pickDateBtn.addEventListener("click", async () => {
      try {
        // ต้อง auth อยู่แล้วถึงจะโหลด marks ได้
        await dpInitAtTodayOpen();
      } catch (e) {
        if (e.message === "unauthorized") await ensureAuth();
        setMsg(e.message, "err");
      }
    });

    // logout
    logoutBtn.addEventListener("click", async () => {
      try { await api("/api/logout", { method: "POST" }); }
      finally { loginOverlay.style.display = "grid"; }
    });

    // date picker controls
    dpPrev.addEventListener("click", async () => {
      dpMonth--;
      if (dpMonth < 0) { dpMonth = 11; dpYear--; }
      await dpLoadMonthMarks();
      dpRender();
    });

    dpNext.addEventListener("click", async () => {
      dpMonth++;
      if (dpMonth > 11) { dpMonth = 0; dpYear++; }
      await dpLoadMonthMarks();
      dpRender();
    });

    dpConfirm.addEventListener("click", async () => {
      if (!selectedDate) {
        setDpMsg("กรุณาเลือกวันที่ก่อน", "err");
        return;
      }
      dateEl.value = selectedDate;
      dpClose();

      // หลังเลือกวัน -> โหลดเวลาจาก server + refresh list
      try {
        const meta = await api("/api/meta");
        TIMES = meta.times || [];
        renderTimeOptions();

        exitEditMode();
        await refresh();
      } catch (e) {
        if (e.message === "unauthorized") await ensureAuth();
        setMsg(e.message, "err");
      }
    });

    // login
    loginBtn.addEventListener("click", async () => {
      setLoginMsg("");
      try {
        await api("/api/login", {
          method: "POST",
          body: JSON.stringify({ pin: pinEl.value })
        });
        setLoginMsg("เข้าสู่ระบบสำเร็จ ✅", "ok");
        loginOverlay.style.display = "none";
        pinEl.value = "";

        // ✅ ล็อกอินแล้วเด้งเลือกวัน (ต้องกดตกลงก่อนถึงจะเข้าใช้งานจริง)
        await dpInitAtTodayOpen();
      } catch (e) {
        setLoginMsg(e.message, "err");
      }
    });

    pinEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") loginBtn.click();
    });

    // if already authed (session ค้าง) -> ข้าม login แล้วเด้งเลือกวันเลย
    const authed = await ensureAuth();
    if (authed) {
      await dpInitAtTodayOpen();
    }
  })();

  // ===== Submit booking =====
  formEl.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setMsg("");

    if (!dateEl.value) {
      setMsg("กรุณาเลือกวันก่อน", "err");
      await dpInitAtTodayOpen();
      return;
    }

    const payload = {
      date: dateEl.value,
      category: currentCategory,
      time: timeEl.value,
      name: nameEl.value.trim(),
      phone: phoneEl.value.trim(),       // optional
      service: serviceEl.value.trim(),   // optional
      note: noteEl.value.trim()
    };

    if (!payload.name) { setMsg("กรุณากรอกชื่อลูกค้า", "err"); return; }
    if (!payload.time) { setMsg("กรุณาเลือกเวลา", "err"); return; }

    try {
      if (editId) {
        await api(`/api/bookings/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        setMsg("แก้ไขคิวสำเร็จ ✅", "ok");
        exitEditMode();
        await refresh();
        await dpLoadMonthMarks();
        dpRender();
        return;
      }

      const r = await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setMsg("จองคิวสำเร็จ ✅", "ok");
      formEl.reset();
      renderTimeOptions();
      await refresh();

      // อัปเดตวงกลมเขียวของเดือน
      await dpLoadMonthMarks();
      dpRender();

      // ✅ เด้งถามเพิ่มลง iPhone Calendar ไหม
      const add = confirm("บันทึกคิวแล้ว ✅\nต้องการเพิ่มลงปฏิทิน iPhone ไหม?");
      if (add && r?.booking?.id) {
        window.location.href = `/api/calendar/${r.booking.id}`;
      }
    } catch (e) {
      if (e.message === "unauthorized") await ensureAuth();
      setMsg(e.message, "err");
    }
  });
});

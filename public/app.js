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

  // ===== Monthly table =====
  const monthPick = $("#monthPick");
  const monthRefreshBtn = $("#monthRefreshBtn");
  const monthListEl = $("#monthList");

  let currentCategory = "male";
  let TIMES = [];
  let editId = null;

  function todayLocalYYYYMMDD() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function yyyymmOfNow() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`; // type="month"
  }

  function setMsg(text, type = "") {
    msgEl.className = "msg " + (type || "");
    msgEl.textContent = text || "";
  }

  function setLoginMsg(text, type = "") {
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
      loginOverlay.classList.add("hidden");
      return true;
    } catch {
      loginOverlay.classList.remove("hidden");
      return false;
    }
  }

  async function loadMetaAlways() {
    const meta = await api("/api/meta");
    TIMES = meta.times || [];
    renderTimeOptions();
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

  function setActiveTab(cat) {
    currentCategory = cat;
    document.querySelectorAll(".tab")
      .forEach(t => t.classList.toggle("active", t.dataset.tab === cat));

    serviceEl.placeholder = cat === "male"
      ? "เช่น ตัดผม / รองทรง / สระ+ตัด"
      : "เช่น สระ+ไดร์ / ทำสี / ยืด / ดัด";
  }

  function enterEditMode(b) {
    editId = b.id;
    dateEl.value = b.date;
    setActiveTab(b.category);
    timeEl.value = b.time;
    nameEl.value = b.name;
    phoneEl.value = b.phone;
    serviceEl.value = b.service;
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
    setActiveTab(currentCategory);
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
          await refreshDay();
          await refreshMonth();
        } catch (e) {
          if (e.message === "unauthorized") await ensureAuth();
          setMsg(e.message, "err");
        }
      });
    });
  }

  async function refreshDay() {
    const date = dateEl.value;
    const sum = await api(`/api/summary?date=${encodeURIComponent(date)}`);

    countMale.textContent = sum.counts.male ?? 0;
    countFemale.textContent = sum.counts.female ?? 0;
    countTotal.textContent = sum.counts.total ?? 0;

    const d = new Date(date + "T00:00:00");
    summaryHint.textContent = d.toLocaleDateString("th-TH", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    renderList(sum.detail || []);
  }

  function renderMonthTable(list) {
    monthListEl.innerHTML = "";

    if (!list.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="4" style="color:var(--muted)">เดือนนี้ยังไม่มีคิว</td>`;
      monthListEl.appendChild(tr);
      return;
    }

    for (const row of list) {
      const tr = document.createElement("tr");
      tr.className = "clickRow";
      tr.innerHTML = `
        <td><b>${escapeHtml(row.date)}</b></td>
        <td>${row.counts.male ?? 0}</td>
        <td>${row.counts.female ?? 0}</td>
        <td><b>${row.counts.total ?? 0}</b></td>
      `;
      tr.addEventListener("click", async () => {
        dateEl.value = row.date;
        setMsg("");
        try {
          await refreshDay();
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
          if (e.message === "unauthorized") await ensureAuth();
          setMsg(e.message, "err");
        }
      });
      monthListEl.appendChild(tr);
    }
  }

  async function refreshMonth() {
    const ym = monthPick.value; // YYYY-MM
    const [y, m] = ym.split("-").map(Number);
    const data = await api(`/api/month?year=${y}&month=${m}`);
    renderMonthTable(data.list || []);
  }

  // ===== events =====
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  loginBtn.addEventListener("click", async () => {
    setLoginMsg("");
    try {
      await api("/api/login", { method: "POST", body: JSON.stringify({ pin: pinEl.value }) });
      pinEl.value = "";
      setLoginMsg("เข้าสู่ระบบสำเร็จ ✅", "ok");
      loginOverlay.classList.add("hidden");

      await refreshDay();
      await refreshMonth();
    } catch (e) {
      setLoginMsg(e.message, "err");
    }
  });

  pinEl.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") loginBtn.click();
  });

  logoutBtn.addEventListener("click", async () => {
    try { await api("/api/logout", { method: "POST" }); }
    finally { loginOverlay.classList.remove("hidden"); }
  });

  refreshBtn.addEventListener("click", async () => {
    setMsg("");
    try { await refreshDay(); setMsg("อัปเดตแล้ว ✅", "ok"); }
    catch (e) { if (e.message === "unauthorized") await ensureAuth(); setMsg(e.message, "err"); }
  });

  monthRefreshBtn.addEventListener("click", async () => {
    setMsg("");
    try { await refreshMonth(); setMsg("อัปเดตตารางรายเดือนแล้ว ✅", "ok"); }
    catch (e) { if (e.message === "unauthorized") await ensureAuth(); setMsg(e.message, "err"); }
  });

  monthPick.addEventListener("change", async () => {
    setMsg("");
    try { await refreshMonth(); }
    catch (e) { if (e.message === "unauthorized") await ensureAuth(); setMsg(e.message, "err"); }
  });

  dateEl.addEventListener("change", async () => {
    setMsg("");
    try { await refreshDay(); }
    catch (e) { if (e.message === "unauthorized") await ensureAuth(); setMsg(e.message, "err"); }
  });

  cancelEditBtn.addEventListener("click", () => exitEditMode());

  formEl.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setMsg("");

    const payload = {
      date: dateEl.value,
      category: currentCategory,
      time: timeEl.value,
      name: nameEl.value.trim(),
      phone: phoneEl.value.trim(),
      service: serviceEl.value.trim(),
      note: noteEl.value.trim()
    };

    try {
      if (editId) {
        await api(`/api/bookings/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        setMsg("แก้ไขคิวสำเร็จ ✅", "ok");
        exitEditMode();
      } else {
        // ✅ แก้เฉพาะจุดนี้: ต้องเก็บ res เพื่อเอา booking.id ไปเรียก .ics
        const res = await api("/api/bookings", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        setMsg("บันทึกการจองสำเร็จ ✅", "ok");
        formEl.reset();
        renderTimeOptions();
        setActiveTab(currentCategory);

        // ===== 🔔 ถามเพิ่มปฏิทินทันที =====
        const wantCalendar = confirm(
          "บันทึกคิวเรียบร้อยแล้ว\n\nต้องการเพิ่มนัดหมายนี้ลงในปฏิทินของ iPhone ไหม?"
        );

        if (wantCalendar && res?.booking?.id) {
          // เปิดไฟล์ .ics → iPhone จะเด้งหน้า Calendar ให้ทันที
          window.location.href = `/api/calendar/${res.booking.id}`;
        }
      }

      await refreshDay();
      await refreshMonth();
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

  // ===== init =====
  (async function init() {
    dateEl.value = todayLocalYYYYMMDD();
    monthPick.value = yyyymmOfNow();
    setActiveTab("male");

    // load time options always (fix empty dropdown)
    try {
      await loadMetaAlways();
    } catch (e) {
      timeEl.innerHTML = `<option value="">โหลดเวลาไม่สำเร็จ</option>`;
      setMsg("โหลดเวลาไม่สำเร็จ: " + e.message, "err");
    }

    const authed = await ensureAuth();
    if (authed) {
      await refreshDay();
      await refreshMonth();
    }
  })();
});

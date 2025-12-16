document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);

  // login overlay
  const loginOverlay = $("#loginOverlay");
  const pinEl = $("#pin");
  const loginBtn = $("#loginBtn");
  const loginMsg = $("#loginMsg");
  const logoutBtn = $("#logoutBtn");

  // form
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

  // summary
  const countMale = $("#countMale");
  const countFemale = $("#countFemale");
  const countTotal = $("#countTotal");
  const summaryHint = $("#summaryHint");

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

  async function loadMeta() {
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
        <td><b>${b.time}</b></td>
        <td><span class="badge ${badgeClass}">${categoryLabel(b.category)}</span></td>
        <td>${escapeHtml(b.name)}</td>
        <td>${escapeHtml(b.service)}</td>
        <td>${escapeHtml(b.note || "")}</td>
        <td><a href="tel:${escapeHtml(b.phone)}" style="color:var(--accent)">${escapeHtml(b.phone)}</a></td>
        <td>
          <div class="actionsBtn">
            <button class="smallBtn edit" data-id="${b.id}">แก้ไข</button>
            <button class="smallBtn danger del" data-id="${b.id}">ลบ</button>
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
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    renderList(sum.detail || []);
  }

  // ===== EVENTS =====
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
      await loadMeta();
      await refresh();
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
    try { await refresh(); setMsg("อัปเดตแล้ว ✅", "ok"); }
    catch (e) { if (e.message === "unauthorized") await ensureAuth(); setMsg(e.message, "err"); }
  });

  dateEl.addEventListener("change", async () => {
    setMsg("");
    try { await refresh(); }
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
        await api("/api/bookings", { method: "POST", body: JSON.stringify(payload) });
        setMsg("บันทึกการจองสำเร็จ ✅", "ok");
        formEl.reset();
        renderTimeOptions();
        setActiveTab(currentCategory);
      }
      await refresh();
    } catch (e) {
      if (e.message === "unauthorized") await ensureAuth();
      setMsg(e.message, "err");
    }
  });

  // ===== INIT =====
  (async function init() {
    dateEl.value = todayLocalYYYYMMDD();
    setActiveTab("male");

    const authed = await ensureAuth();
    if (authed) {
      await loadMeta();
      await refresh();
    } else {
      timeEl.innerHTML = `<option value="">กรุณาเข้าสู่ระบบก่อน</option>`;
    }
  })();
});

document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);

  // ===== Elements =====
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

  const loginOverlay = $("#loginOverlay");
  const pinEl = $("#pin");
  const loginBtn = $("#loginBtn");
  const loginMsg = $("#loginMsg");
  const logoutBtn = $("#logoutBtn");

  // ✅ Calendar elements
  const calGrid = $("#calGrid");
  const calTitle = $("#calTitle");

  // ===== State =====
  let currentCategory = "male";
  let TIMES = [];
  let editId = null;
  let lastDetail = []; // detail for selected date

  // ===== Helpers =====
  function todayLocalYYYYMMDD() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function ymFromDateStr(dateStr) {
    return String(dateStr || "").slice(0, 7);
  }

  // ✅ normalize time ให้เป็น HH:MM (กัน 13:00:00)
  function normTime(t) {
    const s = String(t ?? "").trim();
    if (!s) return "";
    return s.length >= 5 ? s.slice(0, 5) : s;
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

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(s) {
    return escapeHtml(s);
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

  async function ensureAuth() {
    try {
      await api("/api/me");
      if (loginOverlay) loginOverlay.style.display = "none";
      return true;
    } catch {
      if (loginOverlay) loginOverlay.style.display = "grid";
      return false;
    }
  }

  // ===== Custom iOS-safe popup =====
  function askAddToCalendarPopup() {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,.55)";
      overlay.style.display = "grid";
      overlay.style.placeItems = "center";
      overlay.style.zIndex = "9999";
      overlay.style.padding = "16px";

      const box = document.createElement("div");
      box.style.maxWidth = "420px";
      box.style.width = "100%";
      box.style.background = "#111";
      box.style.color = "#fff";
      box.style.border = "1px solid rgba(255,255,255,.12)";
      box.style.borderRadius = "14px";
      box.style.padding = "16px";
      box.style.boxShadow = "0 12px 30px rgba(0,0,0,.4)";

      box.innerHTML = `
        <div style="font-size:16px; font-weight:700; margin-bottom:8px;">บันทึกคิวเรียบร้อยแล้ว ✅</div>
        <div style="font-size:14px; opacity:.9; line-height:1.4; margin-bottom:14px;">
          ต้องการเพิ่มนัดหมายนี้ลงใน iPhone/iPad Calendar ไหม?
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button id="calNo" style="padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.18); background:transparent; color:#fff;">
            ไม่ต้องการ
          </button>
          <button id="calYes" style="padding:10px 12px; border-radius:10px; border:none; background:#7c5cff; color:#fff; font-weight:700;">
            เพิ่มลงปฏิทิน
          </button>
        </div>
      `;

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const cleanup = () => overlay.remove();
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });

      box.querySelector("#calNo").addEventListener("click", () => {
        cleanup();
        resolve(false);
      });
      box.querySelector("#calYes").addEventListener("click", () => {
        cleanup();
        resolve(true);
      });
    });
  }

  function setActiveTab(cat) {
    currentCategory = cat;
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === cat);
    });

    if (serviceEl) {
      serviceEl.placeholder =
        cat === "male"
          ? "เช่น ตัดผม / รองทรง / สระ+ตัด"
          : "เช่น สระ+ไดร์ / ทำสี / ยืด / ดัด";
    }

    applyDisabledTimes();
  }

  function renderTimeOptions() {
    if (!timeEl) return;

    timeEl.innerHTML = "";

    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = "เลือกเวลา";
    ph.disabled = true;
    ph.selected = true;
    timeEl.appendChild(ph);

    for (const t of TIMES) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      timeEl.appendChild(opt);
    }

    applyDisabledTimes();
  }

  function applyDisabledTimes() {
    if (!timeEl) return;
    if (!Array.isArray(lastDetail)) return;

    const booked = new Set(
      lastDetail
        .filter((b) => b.category === currentCategory)
        .map((b) => normTime(b.time))
    );

    [...timeEl.options].forEach((opt) => {
      if (!opt.value) return;
      const v = normTime(opt.value);
      const selected = normTime(timeEl.value);

      // ✅ edit mode: อนุญาตให้เลือกเวลาของ “ตัวเอง” ได้
      opt.disabled = booked.has(v) && (!editId || v !== selected);
    });
  }

  function enterEditMode(b) {
    editId = b.id;

    if (dateEl) dateEl.value = b.date;
    setActiveTab(b.category);

    renderTimeOptions();
    if (timeEl) timeEl.value = normTime(b.time);

    if (nameEl) nameEl.value = b.name || "";
    if (phoneEl) phoneEl.value = b.phone || "";
    if (serviceEl) serviceEl.value = b.service || "";
    if (noteEl) noteEl.value = b.note || "";

    if (submitBtn) submitBtn.textContent = "บันทึกการแก้ไข";
    if (cancelEditBtn) cancelEditBtn.style.display = "inline-block";
    setMsg(`กำลังแก้ไขคิว ${normTime(b.time)} (${categoryLabel(b.category)})`);

    applyDisabledTimes();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exitEditMode() {
    editId = null;
    if (submitBtn) submitBtn.textContent = "บันทึกการจอง";
    if (cancelEditBtn) cancelEditBtn.style.display = "none";
    setMsg("");

    const keepDate = dateEl ? dateEl.value : todayLocalYYYYMMDD();
    if (formEl) formEl.reset();
    if (dateEl) dateEl.value = keepDate;

    renderTimeOptions();
    applyDisabledTimes();
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
      const phone = (b.phone || "").trim();

      tr.innerHTML = `
        <td><b>${escapeHtml(normTime(b.time))}</b></td>
        <td><span class="badge ${badgeClass}">${categoryLabel(b.category)}</span></td>
        <td>${escapeHtml(b.name)}</td>
        <td>${escapeHtml(b.service)}</td>
        <td>${escapeHtml(b.note || "")}</td>
        <td>
          ${
            phone
              ? `<a href="tel:${escapeAttr(phone)}" style="color:var(--accent)">${escapeHtml(phone)}</a>`
              : `<span class="muted">-</span>`
          }
        </td>
        <td class="actionsBtn">
          <button class="smallBtn edit" data-id="${b.id}">แก้ไข</button>
          <button class="smallBtn danger del" data-id="${b.id}">ลบ</button>
        </td>
      `;
      listEl.appendChild(tr);
    }

    listEl.querySelectorAll(".edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        const found = detail.find((x) => Number(x.id) === id);
        if (found) enterEditMode(found);
      });
    });

    listEl.querySelectorAll(".del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-id"));
        if (!id) return;

        const ok = confirm("ยืนยันลบคิวนี้?");
        if (!ok) return;

        try {
          await api(`/api/bookings/${id}`, { method: "DELETE" });
          if (editId === id) exitEditMode();
          setMsg("ลบคิวแล้ว", "ok");
          await refresh();
          await refreshMonth();
        } catch (e) {
          if (e.message === "unauthorized") await ensureAuth();
          setMsg(e.message, "err");
        }
      });
    });
  }

  async function refresh() {
    const date = dateEl?.value || todayLocalYYYYMMDD();
    const sum = await api(`/api/summary?date=${encodeURIComponent(date)}`);

    lastDetail = Array.isArray(sum.detail) ? sum.detail : [];

    if (countMale) countMale.textContent = sum.counts?.male ?? 0;
    if (countFemale) countFemale.textContent = sum.counts?.female ?? 0;
    if (countTotal) countTotal.textContent = sum.counts?.total ?? 0;

    if (summaryHint) {
      const d = new Date(date + "T00:00:00");
      summaryHint.textContent = d.toLocaleDateString("th-TH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    renderList(lastDetail);
    applyDisabledTimes();
    paintSelectedDayInCalendar();
  }

  // ====== Calendar month ======
  function monthTitleFromYM(ym) {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }

  function daysInMonth(year, monthIndex0) {
    return new Date(year, monthIndex0 + 1, 0).getDate();
  }

  function firstDowSunday0(year, monthIndex0) {
    return new Date(year, monthIndex0, 1).getDay();
  }

  function paintSelectedDayInCalendar() {
    if (!calGrid || !dateEl) return;
    const dateStr = dateEl.value;
    const dd = Number(String(dateStr).slice(8, 10));
    calGrid.querySelectorAll(".calCell").forEach((cell) => {
      const v = Number(cell.getAttribute("data-day"));
      cell.classList.toggle("selected", v === dd);
    });
  }

  async function refreshMonth() {
    if (!calGrid || !calTitle || !dateEl) return;

    const dateStr = dateEl.value || todayLocalYYYYMMDD();
    const ym = ymFromDateStr(dateStr);

    calTitle.textContent = monthTitleFromYM(ym);

    const r = await api(`/api/month?ym=${encodeURIComponent(ym)}`);
    const hasDays = new Set((r.days || []).map(Number));

    const [year, month] = ym.split("-").map(Number);
    const monthIndex0 = month - 1;

    const total = daysInMonth(year, monthIndex0);
    const first = firstDowSunday0(year, monthIndex0);

    calGrid.innerHTML = "";

    for (let i = 0; i < first; i++) {
      const empty = document.createElement("div");
      empty.className = "calCell mutedDay";
      empty.style.cursor = "default";
      empty.innerHTML = `<div class="calNum"></div>`;
      calGrid.appendChild(empty);
    }

    for (let day = 1; day <= total; day++) {
      const cell = document.createElement("div");
      cell.className = "calCell" + (hasDays.has(day) ? " hasBookings" : "");
      cell.setAttribute("data-day", String(day));
      cell.innerHTML = `<div class="calNum">${day}</div>`;

      cell.addEventListener("click", async () => {
        const dd = String(day).padStart(2, "0");
        const newDate = `${ym}-${dd}`;
        dateEl.value = newDate;
        setMsg("");
        try {
          await refresh();
        } catch (e) {
          if (e.message === "unauthorized") await ensureAuth();
          setMsg(e.message, "err");
        }
      });

      calGrid.appendChild(cell);
    }

    paintSelectedDayInCalendar();
  }

  // ===== Boot flow =====
  async function bootAfterLogin() {
    setMsg("");

    const meta = await api("/api/meta");
    TIMES = Array.isArray(meta.times) ? meta.times : [];
    renderTimeOptions();

    document.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    });
    setActiveTab(currentCategory);

    // ✅ iOS: disable ต้องเกิด "ก่อน" picker เปิด
    if (timeEl) {
      const syncDisableBeforeOpen = () => {
        applyDisabledTimes();
        setTimeout(applyDisabledTimes, 0);
      };
      ["pointerdown", "touchstart", "mousedown"].forEach((evt) => {
        timeEl.addEventListener(evt, syncDisableBeforeOpen, { capture: true });
      });
      timeEl.addEventListener("focus", syncDisableBeforeOpen);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", async () => {
        setMsg("");
        try {
          await refresh();
          await refreshMonth();
          setMsg("อัปเดตแล้ว", "ok");
        } catch (e) {
          if (e.message === "unauthorized") await ensureAuth();
          setMsg(e.message, "err");
        }
      });
    }

    if (dateEl) {
      dateEl.addEventListener("change", async () => {
        setMsg("");
        try {
          await refresh();
          await refreshMonth();
        } catch (e) {
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
          time: normTime(timeEl?.value || ""),
          name: (nameEl?.value || "").trim(),
          phone: (phoneEl?.value || "").trim(),
          service: (serviceEl?.value || "").trim(),
          note: (noteEl?.value || "").trim(),
        };

        if (!payload.time) return setMsg("กรุณาเลือกเวลา", "err");
        if (!payload.name) return setMsg("กรุณากรอกชื่อลูกค้า", "err");
        if (!payload.service) return setMsg("กรุณากรอกทำอะไร", "err");

        try {
          if (editId) {
            await api(`/api/bookings/${editId}`, {
              method: "PUT",
              body: JSON.stringify(payload),
            });
            setMsg("แก้ไขคิวสำเร็จ ✅", "ok");
            exitEditMode();
            await refresh();
            await refreshMonth();
            return;
          }

          const r = await api("/api/bookings", {
            method: "POST",
            body: JSON.stringify(payload),
          });

          setMsg("จองคิวสำเร็จ ✅", "ok");

          // ✅ iOS-safe popup (ไม่ใช้ confirm)
          const bookingId = r?.booking?.id;
          if (bookingId) {
            const want = await askAddToCalendarPopup();
            if (want) {
              window.location.href = `/api/calendar/${bookingId}`;
              return; // พาไปหน้า Add to Calendar แล้วจบ flow
            }
          }

          const keepDate = payload.date;
          formEl.reset();
          if (dateEl) dateEl.value = keepDate;

          renderTimeOptions();
          await refresh();
          await refreshMonth();
        } catch (e) {
          if (e.message === "unauthorized") await ensureAuth();
          setMsg(e.message, "err");
        }
      });
    }

    await refresh();
    await refreshMonth();
  }

  async function bindLogin() {
    if (loginBtn) {
      loginBtn.addEventListener("click", async () => {
        setLoginMsg("");
        try {
          await api("/api/login", {
            method: "POST",
            body: JSON.stringify({ pin: pinEl?.value || "" }),
          });
          setLoginMsg("เข้าสู่ระบบสำเร็จ ✅", "ok");
          if (loginOverlay) loginOverlay.style.display = "none";
          if (pinEl) pinEl.value = "";
          await bootAfterLogin();
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
        try {
          await api("/api/logout", { method: "POST" });
        } finally {
          if (loginOverlay) loginOverlay.style.display = "grid";
        }
      });
    }
  }

  (async function init() {
    if (dateEl) dateEl.value = todayLocalYYYYMMDD();

    await bindLogin();

    const authed = await ensureAuth();
    if (authed) {
      await bootAfterLogin();
    } else {
      setLoginMsg("กรุณาใส่ PIN เพื่อเข้าสู่ระบบ", "");
      renderTimeOptions();
    }
  })();
});

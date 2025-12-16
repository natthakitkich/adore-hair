document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);

  // ====== FORM FIELDS ======
  const dateEl = $("#date");
  const nameEl = $("#name");
  const phoneEl = $("#phone");
  const timeEl = $("#time");
  const serviceEl = $("#service");
  const noteEl = $("#note");
  const formEl = $("#bookingForm");
  const msgEl = $("#msg");
  const listEl = $("#list");

  // ====== SUMMARY ======
  const countMale = $("#countMale");
  const countFemale = $("#countFemale");
  const countTotal = $("#countTotal");
  const summaryHint = $("#summaryHint");

  // ====== BUTTONS ======
  const refreshBtn = $("#refreshBtn");
  const submitBtn = $("#submitBtn");
  const cancelEditBtn = $("#cancelEditBtn");

  // ====== AUTH UI ======
  const loginOverlay = $("#loginOverlay");
  const pinEl = $("#pin");
  const loginBtn = $("#loginBtn");
  const loginMsg = $("#loginMsg");
  const logoutBtn = $("#logoutBtn");

  // ====== STATE ======
  let currentCategory = "male";
  let TIMES = [];
  let editId = null;

  // ====== HELPERS ======
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

    const data = await res.json().catch(() => ({}));
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

  function setActiveTab(cat) {
    currentCategory = cat;
    document.querySelectorAll(".tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === cat)
    );

    // แค่ placeholder ให้เหมือนเดิม
    serviceEl.placeholder =
      cat === "male"
        ? "เช่น ตัดผม / รองทรง / สระ+ตัด"
        : "เช่น สระ+ไดร์ / ทำสี / ยืด / ดัด";
  }

  function renderTimeOptions() {
    // ถ้า TIMES ยังว่าง ให้ใส่ option placeholder เพื่อกัน UX งง
    timeEl.innerHTML = "";

    if (!TIMES || TIMES.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "— กำลังโหลดเวลา —";
      timeEl.appendChild(opt);
      timeEl.disabled = true;
      return;
    }

    timeEl.disabled = false;

    for (const t of TIMES) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      timeEl.appendChild(opt);
    }
  }

  function enterEditMode(b) {
    editId = b.id;

    dateEl.value = b.date;
    setActiveTab(b.category);

    // เวลา/ชื่อ/โทร/บริการ/หมายเหตุ
    timeEl.value = b.time;
    nameEl.value = b.name;
    phoneEl.value = b.phone;
    serviceEl.value = b.service;
    noteEl.value = b.note || "";

    submitBtn.textContent = "บันทึกการแก้ไข";
    cancelEditBtn.style.display = "inline-block";
    setMsg(`กำลังแก้ไขคิว ${b.time} (${categoryLabel(b.category)})`);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exitEditMode() {
    editId = null;
    submitBtn.textContent = "บันทึกการจอง";
    cancelEditBtn.style.display = "none";
    setMsg("");

    const keepDate = dateEl.value;
    formEl.reset();
    dateEl.value = keepDate;

    // reload options
    renderTimeOptions();
  }

  function renderList(detail) {
    listEl.innerHTML = "";

    if (!detail || detail.length === 0) {
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
        <td><a href="tel:${escapeAttr(b.phone)}" style="color:var(--accent)">${escapeHtml(b.phone)}</a></td>
        <td class="actionsBtn">
          <button class="smallBtn edit" data-id="${b.id}">แก้ไข</button>
          <button class="smallBtn danger" data-id="${b.id}">ลบ</button>
        </td>
      `;

      listEl.appendChild(tr);
    }

    // edit
    listEl.querySelectorAll(".smallBtn.edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        const found = detail.find((x) => Number(x.id) === id);
        if (found) enterEditMode(found);
      });
    });

    // delete
    listEl.querySelectorAll(".smallBtn.danger").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-id"));
        if (!id) return;

        const ok = confirm("ต้องการลบคิวนี้ใช่ไหม?");
        if (!ok) return;

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

    countMale.textContent = sum.counts?.male ?? 0;
    countFemale.textContent = sum.counts?.female ?? 0;
    countTotal.textContent = sum.counts?.total ?? 0;

    // แสดงวันที่ไทย
    const d = new Date(date + "T00:00:00");
    summaryHint.textContent = d.toLocaleDateString("th-TH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    renderList(sum.detail || []);
  }

  // ====== INIT ======
  (async function init() {
    // ตั้งค่า default date
    dateEl.value = todayLocalYYYYMMDD();

    // tabs
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    });

    // ปุ่ม refresh
    refreshBtn.addEventListener("click", async () => {
      setMsg("");
      try {
        await refresh();
        setMsg("อัปเดตแล้ว ✅", "ok");
      } catch (e) {
        if (e.message === "unauthorized") await ensureAuth();
        setMsg(e.message, "err");
      }
    });

    // เปลี่ยนวัน
    dateEl.addEventListener("change", async () => {
      setMsg("");
      try {
        await refresh();
      } catch (e) {
        if (e.message === "unauthorized") await ensureAuth();
        setMsg(e.message, "err");
      }
    });

    // ยกเลิกแก้ไข
    cancelEditBtn.addEventListener("click", () => exitEditMode());

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

        // โหลด meta + refresh หลัง login
        const meta = await api("/api/meta");
        TIMES = meta.times || [];
        renderTimeOptions();
        await refresh();
      } catch (e) {
        setLoginMsg(e.message, "err");
      }
    });

    pinEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") loginBtn.click();
    });

    // logout
    logoutBtn.addEventListener("click", async () => {
      try {
        await api("/api/logout", { method: "POST" });
      } finally {
        loginOverlay.style.display = "grid";
      }
    });

    // ====== SUBMIT BOOKING ======
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

      // validation เบื้องต้น
      if (!payload.time) return setMsg("กรุณาเลือกเวลา", "err");
      if (!payload.name) return setMsg("กรุณากรอกชื่อลูกค้า", "err");
      if (!payload.phone) return setMsg("กรุณากรอกเบอร์โทร", "err");
      if (!payload.service) return setMsg("กรุณากรอกทำอะไร", "err");

      try {
        if (editId) {
          await api(`/api/bookings/${editId}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          setMsg("แก้ไขคิวสำเร็จ ✅", "ok");
          exitEditMode();
        } else {
          const r = await api("/api/bookings", {
            method: "POST",
            body: JSON.stringify(payload)
          });

          setMsg("จองคิวสำเร็จ ✅", "ok");
          formEl.reset();
          renderTimeOptions();

          // ✅ เด้งถามเพิ่มลง iPhone Calendar ไหม
          const add = confirm("บันทึกคิวแล้ว ✅\nต้องการเพิ่มลงปฏิทิน iPhone ไหม?");
          if (add && r?.booking?.id) {
            // เปิด .ics (iOS จะเด้งหน้า Add to Calendar)
            window.location.href = `/api/calendar/${r.booking.id}`;
          }
        }

        await refresh();
      } catch (e) {
        if (e.message === "unauthorized") await ensureAuth();
        setMsg(e.message, "err");
      }
    });

    // ====== AUTH FIRST ======
    const authed = await ensureAuth();
    if (!authed) {
      // ยังไม่ login: ยังไม่ให้โหลดเวลา/summary
      renderTimeOptions(); // โชว์ placeholder
      setActiveTab("male");
      submitBtn.textContent = "บันทึกการจอง";
      cancelEditBtn.style.display = "none";
      return;
    }

    // ถ้า login แล้ว: โหลด meta แล้ว refresh
    try {
      const meta = await api("/api/meta");
      TIMES = meta.times || [];
      renderTimeOptions();
      await refresh();
    } catch (e) {
      // ถ้า meta ไม่ได้ ให้โชว์ error
      setMsg(e.message, "err");
      renderTimeOptions();
    }

    // default tab + button text
    setActiveTab("male");
    submitBtn.textContent = "บันทึกการจอง";
    cancelEditBtn.style.display = "none";
  })();
});

document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);

  // ====== Elements ======
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

  let currentCategory = "male";
  let TIMES = [];
  let editId = null;

  // ====== Helpers ======
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
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function setActiveTab(cat) {
    currentCategory = cat;
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.toggle("active", t.dataset.tab === cat));

    serviceEl.placeholder =
      cat === "male"
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
        <td><b>${b.time}</b></td>
        <td><span class="badge ${badgeClass}">${categoryLabel(b.category)}</span></td>
        <td>${escapeHtml(b.name)}</td>
        <td>${escapeHtml(b.service)}</td>
        <td>${escapeHtml(b.note || "")}</td>
        <td><a href="tel:${escapeAttr(b.phone)}" style="color:var(--accent)">${escapeHtml(
        b.phone
      )}</a></td>
        <td class="actionsBtn">
          <button class="smallBtn edit" data-id="${b.id}">แก้ไข</button>
          <button class="smallBtn danger" data-id="${b.id}">ลบ</button>
        </td>
      `;
      listEl.appendChild(tr);
    }

    listEl.querySelectorAll(".smallBtn.edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        const found = detail.find((x) => x.id === id);
        if (found) enterEditMode(found);
      });
    });

    listEl.querySelectorAll(".smallBtn.danger").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-id"));
        if (!id) return;
        if (!confirm("ยืนยันลบคิวนี้?")) return;
        try {
          await api(`/api/bookings/${id}`, { method: "DELETE" });
          if (editId === id) exitEditMode();
          setMsg("ลบคิวแล้ว", "ok");
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
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    renderList(sum.detail);
  }

  // ===== iPhone Calendar (ICS) - Bangkok time (no timezone bug) =====
  function pad2(n) {
    return String(n).padStart(2, "0");
  }
  function formatICSLocal(dt) {
    return (
      dt.getFullYear() +
      pad2(dt.getMonth() + 1) +
      pad2(dt.getDate()) +
      "T" +
      pad2(dt.getHours()) +
      pad2(dt.getMinutes()) +
      "00"
    );
  }
  function makeIcsBangkok({ title, date, time, durationMin = 60, notes = "" }) {
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);

    // ✅ local time safe for Safari/iOS
    const start = new Date(y, m - 1, d, hh, mm, 0);
    const end = new Date(start.getTime() + durationMin * 60000);

    const dtstamp = formatICSLocal(new Date());
    const dtstart = formatICSLocal(start);
    const dtend = formatICSLocal(end);
    const uid = `${Date.now()}-${Math.random().toString(16).slice(2)}@adore-hair`;

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Adore Hair//Queue//TH",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Asia/Bangkok:${dtstart}`,
      `DTEND;TZID=Asia/Bangkok:${dtend}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${notes.replace(/\n/g, "\\n")}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
  }

  // ===== INIT =====
  (async function init() {
    dateEl.value = todayLocalYYYYMMDD();
    submitBtn.textContent = "บันทึกการจอง";
    cancelEditBtn.style.display = "none";

    // tabs
    document
      .querySelectorAll(".tab")
      .forEach((btn) => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));

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

        // after login: load meta times + refresh
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

    logoutBtn.addEventListener("click", async () => {
      try {
        await api("/api/logout", { method: "POST" });
      } finally {
        loginOverlay.style.display = "grid";
      }
    });

    // actions
    refreshBtn.addEventListener("click", async () => {
      setMsg("");
      try {
        await refresh();
        setMsg("อัปเดตแล้ว", "ok");
      } catch (e) {
        if (e.message === "unauthorized") await ensureAuth();
        setMsg(e.message, "err");
      }
    });

    dateEl.addEventListener("change", async () => {
      setMsg("");
      try {
        await refresh();
      } catch (e) {
        if (e.message === "unauthorized") await ensureAuth();
        setMsg(e.message, "err");
      }
    });

    cancelEditBtn.addEventListener("click", () => exitEditMode());

    // submit booking
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
          await api(`/api/bookings/${editId}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          setMsg("แก้ไขคิวสำเร็จ ✅", "ok");
          exitEditMode();
          await refresh();
          return;
        }

        await api("/api/bookings", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        setMsg("จองคิวสำเร็จ ✅", "ok");
        await refresh();

        // ✅ Ask add to iPhone Calendar
        const ok = confirm("จองคิวสำเร็จ ✅\nต้องการเพิ่มลงปฏิทิน iPhone ไหม?");
        if (ok) {
          const title =
            `${currentCategory === "male" ? "ตัดผมผู้ชาย" : "ทำผมผู้หญิง"} – Adore hair`;

          const notes =
`ลูกค้า: ${payload.name}
บริการ: ${payload.service || "-"}
โทร: ${payload.phone || "-"}
หมายเหตุ: ${payload.note || "-"}`;

          const ics = makeIcsBangkok({
            title,
            date: payload.date,
            time: payload.time,
            durationMin: 60,
            notes
          });

          const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          window.location.href = url;
          setTimeout(() => URL.revokeObjectURL(url), 15000);
        }

        // reset form (keep date, keep time list)
        const keepDate = dateEl.value;
        formEl.reset();
        dateEl.value = keepDate;
        renderTimeOptions();
      } catch (e) {
        if (e.message === "unauthorized") await ensureAuth();
        setMsg(e.message, "err");
      }
    });

    // First gate: must login first
    const authed = await ensureAuth();
    if (authed) {
      const meta = await api("/api/meta");
      TIMES = meta.times || [];
      renderTimeOptions();
      await refresh();
    }
  })();
});

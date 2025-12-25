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
    return d.toISOString().slice(0, 10);
  }

  function normTime(t) {
    return String(t || "").slice(0, 5);
  }

  function setMsg(text, type = "") {
    msgEl.className = "msg " + type;
    msgEl.textContent = text || "";
  }

  function setLoginMsg(text, type = "") {
    loginMsg.className = "msg " + type;
    loginMsg.textContent = text || "";
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function api(path, opts = {}) {
    return fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    }).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "error");
      return d;
    });
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

  // ===== Tabs (Stylist) =====
  function setActiveStylist(name) {
    currentStylist = name;
    document.querySelectorAll(".tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.stylist === name);
    });
    applyDisabledTimes();
  }

  // ===== Time select =====
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

  function resolveStylistFromRow(b) {
    if (b.stylist) return b.stylist;
    return b.category === "male" ? "Bank" : "Sindy";
  }

  function applyDisabledTimes() {
    const booked = new Set(
      lastDetail
        .filter((b) => resolveStylistFromRow(b) === currentStylist)
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
      const stylist = resolveStylistFromRow(b);
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
      btn.onclick = () => {
        const b = lastDetail.find((x) => x.id == btn.dataset.id);
        if (!b) return;

        editId = b.id;
        dateEl.value = b.date;
        setActiveStylist(resolveStylistFromRow(b));
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
      };
    });

    listEl.querySelectorAll(".del").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("ยืนยันลบคิวนี้?")) return;
        await api(`/api/bookings/${btn.dataset.id}`, { method: "DELETE" });
        editId = null;
        await refresh();
      };
    });
  }

  // ===== Refresh =====
  async function refresh() {
    const d = dateEl.value;
    const r = await api(`/api/summary?date=${d}`);
    lastDetail = r.detail || [];

    const bank = lastDetail.filter(
      (b) => resolveStylistFromRow(b) === "Bank"
    ).length;
    const sindy = lastDetail.filter(
      (b) => resolveStylistFromRow(b) === "Sindy"
    ).length;

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
  }

  // ===== Boot =====
  async function boot() {
    const meta = await api("/api/meta");
    TIMES = meta.times || [];
    renderTimeOptions();

    document.querySelectorAll(".tab").forEach((b) => {
      b.onclick = () => setActiveStylist(b.dataset.stylist);
    });

    refreshBtn.onclick = refresh;
    cancelEditBtn.onclick = () => location.reload();

    formEl.onsubmit = async (e) => {
      e.preventDefault();
      setMsg("");

      const genderEl = document.querySelector("input[name=gender]:checked");
      if (!genderEl) return setMsg("กรุณาเลือกเพศลูกค้า", "err");

      const payload = {
        date: dateEl.value,
        stylist: currentStylist,
        gender: genderEl.value,
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

      location.reload();
    };

    await refresh();
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
    if (await ensureAuth()) boot();
  })();
});

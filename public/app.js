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

  const countBank = $("#countMale");
  const countSindy = $("#countFemale");
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
  let currentStylist = "bank"; // bank | sindy
  let TIMES = [];
  let editId = null;
  let lastDetail = [];

  // ===== Helpers =====
  const today = () => new Date().toISOString().slice(0, 10);

  function setMsg(t, type = "") {
    msgEl.className = "msg " + type;
    msgEl.textContent = t || "";
  }

  function setLoginMsg(t, type = "") {
    loginMsg.className = "msg " + type;
    loginMsg.textContent = t || "";
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
  document.querySelectorAll(".tab").forEach((b) => {
    b.onclick = () => {
      currentStylist = b.dataset.tab;
      document
        .querySelectorAll(".tab")
        .forEach((x) => x.classList.toggle("active", x === b));
      applyDisabledTimes();
    };
  });

  // ===== Time select =====
  function renderTimes() {
    timeEl.innerHTML = `<option value="">เลือกเวลา</option>`;
    TIMES.forEach((t) => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      timeEl.appendChild(o);
    });
    applyDisabledTimes();
  }

  function applyDisabledTimes() {
    const booked = new Set(
      lastDetail
        .filter((b) => b.stylist === currentStylist)
        .map((b) => b.time)
    );

    [...timeEl.options].forEach((o) => {
      if (!o.value) return;
      o.disabled = booked.has(o.value) && (!editId || o.value !== timeEl.value);
    });
  }

  // ===== Calendar =====
  function monthTitle(ym) {
    const d = new Date(ym + "-01");
    return d.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }

  async function refreshMonth() {
    const ym = dateEl.value.slice(0, 7);
    calTitle.textContent = monthTitle(ym);

    const r = await api(`/api/month?ym=${ym}`);
    const days = new Set(r.days || []);

    const [y, m] = ym.split("-").map(Number);
    const first = new Date(y, m - 1, 1).getDay();
    const total = new Date(y, m, 0).getDate();

    calGrid.innerHTML = "";
    for (let i = 0; i < first; i++) {
      calGrid.appendChild(document.createElement("div"));
    }

    for (let d = 1; d <= total; d++) {
      const c = document.createElement("div");
      c.className = "calCell" + (days.has(d) ? " hasBookings" : "");
      c.textContent = d;
      c.onclick = () => {
        dateEl.value = `${ym}-${String(d).padStart(2, "0")}`;
        refresh();
      };
      calGrid.appendChild(c);
    }
  }

  // ===== List =====
  function renderList() {
    listEl.innerHTML = "";
    if (!lastDetail.length) {
      listEl.innerHTML = `<tr><td colspan="7">ยังไม่มีคิว</td></tr>`;
      return;
    }

    lastDetail.forEach((b) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${b.time}</td>
        <td>
          <span class="badge">${b.stylist === "bank" ? "Bank" : "Sindy"}</span>
          <span class="badge">${b.gender === "male" ? "ชาย" : "หญิง"}</span>
        </td>
        <td>${b.name}</td>
        <td>${b.service}</td>
        <td>${b.phone || "-"}</td>
        <td>
          <button class="smallBtn edit">แก้ไข</button>
          <button class="smallBtn danger del">ลบ</button>
        </td>
      `;

      tr.querySelector(".del").onclick = async () => {
        if (!confirm("ลบคิวนี้?")) return;
        await api(`/api/bookings/${b.id}`, { method: "DELETE" });
        refresh();
        refreshMonth();
      };

      tr.querySelector(".edit").onclick = () => {
        editId = b.id;
        dateEl.value = b.date;
        currentStylist = b.stylist;
        timeEl.value = b.time;
        nameEl.value = b.name;
        phoneEl.value = b.phone || "";
        serviceEl.value = b.service;
        document.querySelector(`input[name=gender][value=${b.gender}]`).checked =
          true;
        applyDisabledTimes();
      };

      listEl.appendChild(tr);
    });
  }

  // ===== Refresh =====
  async function refresh() {
    const r = await api(`/api/summary?date=${dateEl.value}`);
    lastDetail = r.detail || [];

    countBank.textContent = r.counts.bank || 0;
    countSindy.textContent = r.counts.sindy || 0;
    countTotal.textContent = r.counts.total || 0;

    summaryHint.textContent = new Date(dateEl.value).toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    renderList();
    applyDisabledTimes();
  }

  // ===== Submit (แก้ปัญหากดแล้วเงียบ) =====
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

    if (!payload.time || !payload.name || !payload.service) {
      return setMsg("กรอกข้อมูลให้ครบ", "err");
    }

    submitBtn.disabled = true;

    try {
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

      editId = null;
      formEl.reset();
      setMsg("บันทึกเรียบร้อย", "ok");
      await refresh();
      await refreshMonth();
    } catch (err) {
      setMsg(err.message, "err");
    } finally {
      submitBtn.disabled = false;
    }
  };

  // ===== Init =====
  (async () => {
    dateEl.value = today();
    if (!(await ensureAuth())) return;

    const meta = await api("/api/meta");
    TIMES = meta.times || [];
    renderTimes();
    await refresh();
    await refreshMonth();
  })();

  // ===== Login =====
  loginBtn.onclick = async () => {
    try {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ pin: pinEl.value }),
      });
      loginOverlay.style.display = "none";
      location.reload();
    } catch (e) {
      setLoginMsg("PIN ไม่ถูกต้อง", "err");
    }
  };

  logoutBtn.onclick = async () => {
    await api("/api/logout", { method: "POST" });
    location.reload();
  };
});

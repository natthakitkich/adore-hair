/* =========================
   Phase 8 – Edit with Conflict Check
========================= */
document.addEventListener('DOMContentLoaded', () => {

  const API = '';
  const OWNER_PIN = '1234';
  const AUTH_KEY = 'adore_owner_auth';

  /* ---------- ELEMENTS ---------- */
  const editOverlay = document.getElementById('editOverlay');
  const editDate = document.getElementById('editDate');
  const editTime = document.getElementById('editTime');
  const editStylist = document.getElementById('editStylist');
  const editName = document.getElementById('editName');
  const editPhone = document.getElementById('editPhone');
  const editService = document.getElementById('editService');

  const saveEditBtn = document.getElementById('saveEditBtn');
  const deleteEditBtn = document.getElementById('deleteEditBtn');
  const closeEditBtn = document.getElementById('closeEditBtn');

  /* ---------- STATE ---------- */
  let editingBooking = null;
  let allBookingsOfDay = [];

  /* ---------- OPEN EDIT ---------- */
  window.openEdit = async (booking) => {
    editingBooking = booking;

    editDate.value = booking.date;
    editStylist.value = booking.stylist;
    editName.value = booking.name;
    editPhone.value = booking.phone || '';
    editService.value = booking.service || '';

    document.querySelectorAll('[name=editGender]').forEach(r => {
      r.checked = r.value === booking.gender;
    });

    // build time options
    buildTimeOptions(booking.time);

    editOverlay.classList.remove('hidden');
  };

  function buildTimeOptions(selected) {
    editTime.innerHTML = '';
    for (let h = 13; h <= 22; h++) {
      const t = `${String(h).padStart(2, '0')}:00:00`;
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t.slice(0, 5);
      if (t === selected) opt.selected = true;
      editTime.appendChild(opt);
    }
  }

  /* ---------- SAVE EDIT ---------- */
  saveEditBtn.onclick = async () => {
    const newDate = editDate.value;
    const newTime = editTime.value;
    const stylist = editingBooking.stylist;

    const gender =
      document.querySelector('[name=editGender]:checked')?.value;

    // โหลดคิวของวันใหม่
    const res = await fetch(`${API}/bookings?date=${newDate}`);
    allBookingsOfDay = await res.json();

    // เช็กชนคิว
    const conflict = allBookingsOfDay.find(b =>
      b.id !== editingBooking.id &&
      b.time === newTime &&
      b.stylist === stylist
    );

    if (conflict) {
      alert('คิวนี้ถูกจองแล้ว กรุณาเลือกวันหรือเวลาใหม่');
      return;
    }

    // อัปเดตได้
    await fetch(`${API}/bookings/${editingBooking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: newDate,
        time: newTime,
        name: editName.value,
        phone: editPhone.value,
        gender,
        service: editService.value
      })
    });

    alert('แก้ไขคิวสำเร็จ');
    editOverlay.classList.add('hidden');
    location.reload();
  };

  /* ---------- DELETE ---------- */
  deleteEditBtn.onclick = async () => {
    if (!confirm('ยืนยันการลบคิวนี้?')) return;

    await fetch(`${API}/bookings/${editingBooking.id}`, {
      method: 'DELETE'
    });

    editOverlay.classList.add('hidden');
    location.reload();
  };

  closeEditBtn.onclick = () => {
    editOverlay.classList.add('hidden');
    editingBooking = null;
  };

});

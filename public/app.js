const dateInput = document.getElementById('date');
const timeSelect = document.getElementById('time');
const submitBtn = document.getElementById('submit');
const msg = document.getElementById('msg');

const bankCount = document.getElementById('bankCount');
const sindyCount = document.getElementById('sindyCount');
const assistCount = document.getElementById('assistCount');

dateInput.valueAsDate = new Date();

dateInput.addEventListener('change', loadSlots);
submitBtn.addEventListener('click', submitBooking);

async function loadSlots() {
  timeSelect.innerHTML = `<option value="">เลือกเวลา</option>`;
  const date = dateInput.value;

  const res = await fetch(`/slots?date=${date}`);
  const { slots } = await res.json();

  Object.keys(slots).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  });

  loadStats(date);
}

async function loadStats(date) {
  const res = await fetch(`/bookings?date=${date}`);
  const data = await res.json();

  bankCount.textContent = data.filter(b => b.stylist === 'Bank').length;
  sindyCount.textContent = data.filter(b => b.stylist === 'Sindy').length;
  assistCount.textContent = data.filter(b => b.stylist === 'Assist').length;
}

async function submitBooking() {
  const gender = document.querySelector('input[name="gender"]:checked')?.value;

  const payload = {
    date: dateInput.value,
    time: timeSelect.value,
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    service: document.getElementById('service').value,
    stylist: 'Bank',
    gender
  };

  if (!payload.time || !payload.gender || !payload.name) {
    msg.textContent = 'กรุณากรอกข้อมูลให้ครบ';
    return;
  }

  const res = await fetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    msg.textContent = 'บันทึกแล้ว';
    loadSlots();
  } else {
    msg.textContent = 'เกิดข้อผิดพลาด';
  }
}

loadSlots();

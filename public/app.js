const API = '';

let bookings = [];
let currentDate = '';
let currentStylist = 'Bank';

function formatTime(time) {
  return time.slice(0, 5);
}

function init() {
  const dateInput = document.getElementById('date');
  currentDate = new Date().toISOString().slice(0, 10);
  dateInput.value = currentDate;

  dateInput.onchange = () => {
    currentDate = dateInput.value;
    loadBookings();
  };

  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      currentStylist = tab.dataset.tab;
      renderTime();
      renderTable();
      updateSummary();
    };
  });

  loadBookings();
}

async function loadBookings() {
  const res = await fetch(`${API}/bookings?date=${currentDate}`);
  bookings = await res.json();
  renderTime();
  renderTable();
  updateSummary();
}

function renderTime() {
  const time = document.getElementById('time');
  time.innerHTML = '';

  for (let h = 13; h <= 22; h++) {
    const t = `${String(h).padStart(2, '0')}:00:00`;
    const used = bookings.find(
      b => b.time === t && b.stylist === currentStylist
    );

    const o = document.createElement('option');
    o.value = t;
    o.textContent = formatTime(t);
    if (used) o.disabled = true;
    time.appendChild(o);
  }
}

document.getElementById('bookingForm').onsubmit = async e => {
  e.preventDefault();

  const gender = document.querySelector('[name=gender]:checked').value;

  await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: currentDate,
      time: time.value,
      stylist: currentStylist,
      name: name.value,
      phone: phone.value,
      gender,
      service: service.value
    })
  });

  e.target.reset();
  loadBookings();
};

function renderTable() {
  const list = document.getElementById('list');
  list.innerHTML = '';

  bookings
    .filter(b => b.stylist === currentStylist)
    .forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatTime(b.time)}</td>
        <td>${b.stylist}</td>
        <td>${b.gender === 'male' ? '👨' : '👩'}</td>
        <td>${b.name}</td>
        <td>${b.service || ''}</td>
        <td>${b.phone || ''}</td>
      `;
      list.appendChild(tr);
    });
}

function updateSummary() {
  const bank = bookings.filter(b => b.stylist === 'Bank').length;
  const sindy = bookings.filter(b => b.stylist === 'Sindy').length;
  const assist = bookings.filter(b => b.stylist === 'Assist').length;

  countBank.textContent = bank;
  countSindy.textContent = sindy;
  countAssist.textContent = assist;
  countTotal.textContent = bank + sindy + assist;
}

init();

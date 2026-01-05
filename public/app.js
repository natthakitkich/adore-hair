/* =========================
   GLOBAL STATE
========================= */
var currentDate = new Date();
var selectedDate = null;

// mock หรือ backend จริงต้อง return รูปแบบนี้
// {
//   "2026-01-05": 3,
//   "2026-01-06": 6
// }
var queueDensityByDate = {};

/* =========================
   UTILS (Safari-safe)
========================= */
function pad(n) {
  return n < 10 ? '0' + n : n;
}

function formatDateKey(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/* =========================
   DENSITY CLASS
========================= */
function getDensityClass(count) {
  if (count >= 7) return 'density-full';
  if (count >= 5) return 'density-high';
  if (count >= 3) return 'density-mid';
  if (count >= 1) return 'density-low';
  return '';
}

/* =========================
   CALENDAR RENDER
========================= */
function renderCalendar() {
  var calGrid = document.getElementById('calGrid');
  if (!calGrid) return;

  calGrid.innerHTML = '';

  var year = currentDate.getFullYear();
  var month = currentDate.getMonth();

  var firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
  var totalDays = daysInMonth(year, month);

  // ✅ empty cells before day 1
  for (var i = 0; i < firstDay; i++) {
    var empty = document.createElement('div');
    empty.className = 'calCell';
    empty.style.visibility = 'hidden';
    calGrid.appendChild(empty);
  }

  // days
  for (var d = 1; d <= totalDays; d++) {
    (function (day) {
      var cell = document.createElement('div');
      cell.className = 'calCell';

      var num = document.createElement('div');
      num.className = 'calNum';
      num.innerText = day;

      var dateObj = new Date(year, month, day);
      var key = formatDateKey(dateObj);
      var count = queueDensityByDate[key] || 0;
      var densityClass = getDensityClass(count);

      if (densityClass) {
        num.className += ' ' + densityClass;
      }

      cell.appendChild(num);

      cell.onclick = function () {
        selectedDate = dateObj;
        updateSelectedCell();
      };

      calGrid.appendChild(cell);
    })(d);
  }

  updateSelectedCell();
}

/* =========================
   SELECTED DAY HIGHLIGHT
========================= */
function updateSelectedCell() {
  var cells = document.querySelectorAll('.calCell');
  for (var i = 0; i < cells.length; i++) {
    cells[i].classList.remove('selected');
  }

  if (!selectedDate) return;

  var year = currentDate.getFullYear();
  var month = currentDate.getMonth();
  if (
    selectedDate.getFullYear() !== year ||
    selectedDate.getMonth() !== month
  ) return;

  var day = selectedDate.getDate();
  var firstDay = new Date(year, month, 1).getDay();
  var index = firstDay + day - 1;

  if (cells[index]) {
    cells[index].classList.add('selected');
  }
}

/* =========================
   MONTH NAV
========================= */
function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

/* =========================
   INIT
========================= */
function initCalendar(densityMap) {
  queueDensityByDate = densityMap || {};
  renderCalendar();
}

/* =========================
   EXPOSE (for existing code)
========================= */
window.initCalendar = initCalendar;
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;

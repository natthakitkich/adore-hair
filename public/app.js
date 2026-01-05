/* =================================================
   Adore Hair – app.js
   RECOVER VERSION (A)
   - ใช้ server.js เดิม
   - กู้ behavior เดิมทั้งหมด
================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const API = "/api";

  /* =========================
     ELEMENTS
  ========================= */
  const loginOverlay = document.getElementById("loginOverlay");
  const editOverlay  = document.getElementById("editOverlay");

  const loginBtn  = document.getElementById("loginBtn");
  const pinInput  = document.getElementById("pinInput");
  const loginMsg  = document.getElementById("loginMsg");
  const logoutBtn = document.getElementById("logoutBtn");

  const calendarGrid  = document.getElementById("calendarGrid");
  const calendarTitle = document.getElementById("calendarTitle");

  const bookingTable = document.getElementById("bookingTable");

  /* =========================
     STATE
  ========================= */
  let currentDate   = "";
  let currentMonth  = new Date();
  let currentBarber = "Bank";
  let bookings      = [];

  /* =========================
     FORCE INITIAL STATE
  ========================= */
  if (loginOverlay) loginOverlay.classList.add("show");
  if (editOverlay)  editOverlay.classList.remove

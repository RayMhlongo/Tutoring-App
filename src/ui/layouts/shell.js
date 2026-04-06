import { APP_NAME, ROUTES } from "../../core/constants.js";
import { escapeHtml } from "../components/primitives.js";

const labels = {
  dashboard: "Dashboard",
  students: "Students",
  tutors: "Tutors",
  schedule: "Schedule",
  lessons: "Lessons",
  attendance: "Attendance",
  payments: "Payments",
  expenses: "Expenses",
  reports: "Reports",
  insights: "Insights",
  backup: "Backup",
  settings: "Settings"
};

export function renderAppShell(activeRoute, businessName, online) {
  const nav = ROUTES
    .map((route) => `<button class="nav-btn ${route === activeRoute ? "active" : ""}" data-route="${route}">${labels[route]}</button>`)
    .join("");

  return `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <img src="./assets/logo/data-insights-logo.svg" alt="EduPulse logo">
          <div>
            <h1>${escapeHtml(businessName || APP_NAME)}</h1>
            <p>Offline-first tutoring manager</p>
          </div>
        </div>
        <div class="top-actions">
          <button id="themeToggleBtn" class="btn btn-ghost" type="button">Theme</button>
          <button id="logoutBtn" class="btn btn-ghost" type="button">Lock</button>
        </div>
      </header>

      <div class="statusbar">
        <span class="pill ${online ? "ok" : "warn"}">${online ? "Online" : "Offline"}</span>
        <span class="pill">Local-first save enabled</span>
      </div>

      <nav class="nav" aria-label="Primary">${nav}</nav>
      <main id="viewRoot" class="content" tabindex="-1"></main>
    </div>
  `;
}
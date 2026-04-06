import { renderAppShell } from "../ui/layouts/shell.js";
import { toast } from "../ui/components/primitives.js";
import { applyThemeFromSettings, toggleTheme } from "../ui/theme/theme.js";
import { initDb, getSettings, patchSettings } from "../data/db/client.js";
import { seedDemoData } from "../data/seed/demo.js";
import { currentRoute, setRoute } from "./router.js";
import { setState } from "./store.js";
import { registerPwa } from "../pwa/register.js";
import { renderAuthGate, bindAuthGate } from "../features/auth/index.js";
import { ensureAuthDefaults, isAuthenticated, logout } from "../features/auth/service.js";

import { renderDashboard, bindDashboard } from "../features/dashboard/index.js";
import { renderStudents, bindStudents } from "../features/students/index.js";
import { renderTutors, bindTutors } from "../features/tutors/index.js";
import { renderSchedule, bindSchedule } from "../features/schedule/index.js";
import { renderLessons, bindLessons } from "../features/lessons/index.js";
import { renderAttendance, bindAttendance } from "../features/attendance/index.js";
import { renderPayments, bindPayments } from "../features/payments/index.js";
import { renderExpenses, bindExpenses } from "../features/expenses/index.js";
import { renderReports, bindReports } from "../features/reports/index.js";
import { renderInsights, bindInsights } from "../features/insights/index.js";
import { renderBackup, bindBackup } from "../features/backup/index.js";
import { renderSettings, bindSettings } from "../features/settings/index.js";

const FEATURES = {
  dashboard: { render: renderDashboard, bind: bindDashboard },
  students: { render: renderStudents, bind: bindStudents },
  tutors: { render: renderTutors, bind: bindTutors },
  schedule: { render: renderSchedule, bind: bindSchedule },
  lessons: { render: renderLessons, bind: bindLessons },
  attendance: { render: renderAttendance, bind: bindAttendance },
  payments: { render: renderPayments, bind: bindPayments },
  expenses: { render: renderExpenses, bind: bindExpenses },
  reports: { render: renderReports, bind: bindReports },
  insights: { render: renderInsights, bind: bindInsights },
  backup: { render: renderBackup, bind: bindBackup },
  settings: { render: renderSettings, bind: bindSettings }
};

async function renderRoute() {
  const appRoot = document.getElementById("app");
  const route = currentRoute();
  const feature = FEATURES[route] || FEATURES.dashboard;
  setState({ route });

  const settings = await getSettings();
  appRoot.innerHTML = renderAppShell(route, settings.businessName, navigator.onLine);

  const viewRoot = document.getElementById("viewRoot");
  viewRoot.innerHTML = await feature.render();

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.route));
  });

  document.getElementById("themeToggleBtn")?.addEventListener("click", async () => {
    await toggleTheme();
    toast("Theme switched.", "info");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await logout();
    await renderApp();
  });

  const rerender = async () => renderRoute();
  feature.bind?.(viewRoot, rerender);
}

async function renderApp() {
  await applyThemeFromSettings();
  const appRoot = document.getElementById("app");
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    appRoot.innerHTML = renderAuthGate();
    bindAuthGate(appRoot, () => renderApp());
    return;
  }

  await renderRoute();
}

export async function bootstrap() {
  await initDb();
  const env = window.__APP_ENV__ || {};
  const settings = await getSettings();
  if ((env.EDUPULSE_GOOGLE_CLIENT_ID || env.EDUPULSE_AI_ENDPOINT || env.EDUPULSE_AI_KEY) && (!settings.backup?.googleClientId || !settings.ai?.endpoint || !settings.ai?.apiKey)) {
    await patchSettings({
      backup: {
        googleClientId: settings.backup?.googleClientId || String(env.EDUPULSE_GOOGLE_CLIENT_ID || "")
      },
      ai: {
        endpoint: settings.ai?.endpoint || String(env.EDUPULSE_AI_ENDPOINT || settings.ai?.endpoint || ""),
        apiKey: settings.ai?.apiKey || String(env.EDUPULSE_AI_KEY || ""),
        model: settings.ai?.model || String(env.EDUPULSE_AI_MODEL || settings.ai?.model || "gpt-4.1-mini")
      }
    });
  }
  await ensureAuthDefaults();
  await seedDemoData();
  await registerPwa();

  window.addEventListener("hashchange", () => renderRoute());
  window.addEventListener("online", () => {
    setState({ online: true });
    toast("Back online.", "success");
  });
  window.addEventListener("offline", () => {
    setState({ online: false });
    toast("You are offline. Data still saves locally.", "warn");
  });
  window.addEventListener("edupulse-sw-update", () => {
    toast("Update available. Reload app when ready.", "info");
  });

  await renderApp();
}
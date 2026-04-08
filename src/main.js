import { ROUTES, ROUTE_LABELS } from "./core/constants.js";
import { esc } from "./core/helpers.js";
import { loadState, saveState } from "./core/store.js";
import { mountError, toast, authView, pageShell } from "./ui/render.js";
import { renderRoute, bindRoute } from "./features/pages.js";

const appEl = document.getElementById("app");
let state = null;
let route = "dashboard";

const ui = {
  students: { query: "", group: "all", touched: false },
  tutors: { query: "", group: "all", touched: false },
  schedule: { query: "", group: "all", touched: false },
  lessons: { query: "", group: "all", touched: false },
  attendance: { query: "", group: "all", touched: false },
  payments: { query: "", group: "all", touched: false },
  expenses: { query: "", group: "all", touched: false },
  reports: { type: "business", from: "", to: "", studentId: "", tutorId: "", status: "", aiText: "", ruleText: "", generating: false },
  insights: { prompt: "monthly" }
};

function routeFromHash() {
  const clean = window.location.hash.replace("#", "").trim();
  if (ROUTES.includes(clean)) return clean;
  return "dashboard";
}

function navHtml() {
  const short = {
    dashboard: "Home",
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
  return ROUTES.map(
    (r) => `<button class="nav-btn ${r === route ? "active" : ""}" type="button" data-route="${esc(r)}">${esc(short[r] || ROUTE_LABELS[r] || r)}</button>`
  ).join("");
}

function applyTheme() {
  const mode = state.settings.theme || "light";
  const preferredDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "auto" && preferredDark);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

function persistState() {
  saveState(state).catch(() => {
    toast("Save warning: local data write failed");
  });
}

function renderAuth() {
  appEl.innerHTML = authView();
  document.getElementById("loginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const user = String(fd.get("username") || "").trim();
    if (user === state.settings.username) {
      state.session.ok = true;
      persistState();
      render();
      return;
    }
    toast("Invalid username");
  });
}

function renderApp() {
  const ctx = { state, route, ui };
  appEl.innerHTML = pageShell({
    businessName: state.settings.businessName,
    subtitle: "Offline-first tutoring operations",
    online: navigator.onLine,
    navHtml: navHtml(),
    contentHtml: renderRoute(ctx)
  });

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.route;
      if (!next || !ROUTES.includes(next)) return;
      route = next;
      window.location.hash = next;
      render();
    });
  });

  const nav = document.getElementById("routeNav");
  const active = nav?.querySelector(".nav-btn.active");
  if (nav && active) {
    active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  bindRoute(
    ctx,
    (msg) => {
      persistState();
      toast(msg);
    },
    () => {
      persistState();
      render();
    }
  );
}

function render() {
  try {
    if (!state) return;
    applyTheme();
    if (!state.session.ok) {
      renderAuth();
      return;
    }
    renderApp();
  } catch (error) {
    mountError(error?.message || "Unexpected startup error");
  }
}

window.addEventListener("hashchange", () => {
  route = routeFromHash();
  render();
});

window.addEventListener("online", () => {
  toast("Back online");
  render();
});

window.addEventListener("offline", () => {
  toast("Offline mode enabled");
  render();
});

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return;
  try {
    const reg = await navigator.serviceWorker.register("./service-worker.js");
    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          toast("App update ready. Reload to apply.");
        }
      });
    });
  } catch {
    // ignore registration errors
  }
}

async function bootstrap() {
  try {
    state = await loadState();
    route = routeFromHash();
    render();
    await registerServiceWorker();
  } catch (error) {
    mountError(error?.message || "Startup failed");
  }
}

bootstrap();

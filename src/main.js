import { ROUTES, ROUTE_LABELS } from "./core/constants.js";
import { esc } from "./core/helpers.js";
import { loadState, saveState } from "./core/store.js";
import { mountError, toast, authView, pageShell } from "./ui/render.js";
import { renderRoute, bindRoute } from "./features/pages.js";

const appEl = document.getElementById("app");
let state = loadState();
let route = "dashboard";

const ui = {
  students: { query: "", group: "all", touched: false },
  tutors: { query: "", group: "all", touched: false },
  schedule: { query: "", group: "all", touched: false },
  lessons: { query: "", group: "all", touched: false },
  attendance: { query: "", group: "all", touched: false },
  payments: { query: "", group: "all", touched: false },
  expenses: { query: "", group: "all", touched: false },
  reports: { type: "business", from: "", to: "", aiText: "", ruleText: "", generating: false },
  insights: { prompt: "monthly" }
};

function routeFromHash() {
  const clean = window.location.hash.replace("#", "").trim();
  if (ROUTES.includes(clean)) return clean;
  return "dashboard";
}

function navHtml() {
  return ROUTES.map(
    (r) => `<button class="nav-btn ${r === route ? "active" : ""}" type="button" data-route="${esc(r)}">${esc(ROUTE_LABELS[r] || r)}</button>`
  ).join("");
}

function applyTheme() {
  const mode = state.settings.theme || "light";
  const preferredDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "auto" && preferredDark);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

function renderAuth() {
  appEl.innerHTML = authView();
  document.getElementById("loginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const user = String(fd.get("username") || "").trim();
    const passcode = String(fd.get("passcode") || "").trim();
    if (user === state.settings.username && passcode === state.settings.passcode) {
      state.session.ok = true;
      saveState(state);
      render();
      return;
    }
    toast("Invalid username or passcode");
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

  document.getElementById("lockBtn")?.addEventListener("click", () => {
    state.session.ok = false;
    saveState(state);
    renderAuth();
  });

  bindRoute(
    ctx,
    (msg) => {
      saveState(state);
      toast(msg);
    },
    () => {
      saveState(state);
      render();
    }
  );
}

function render() {
  try {
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

if ("serviceWorker" in navigator && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

route = routeFromHash();
render();

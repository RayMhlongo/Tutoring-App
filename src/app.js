import {
  getAccountIdFromProfile,
  getActiveProfile,
  getAppSettings,
  getSetting,
  initStorage,
  loadAccountSnapshot,
  migrateLegacyLocalStorage,
  setSetting
} from "./storage.js";
import { restoreFromLocalFile } from "./backup.js";
import { requestBackgroundSync, initSyncEngine, refreshQueueCount, subscribeSyncState, syncNow } from "./sync.js";
import { initTheme, toggleThemeMode } from "./theme.js";
import { initUI, setConnectionStatusLabel, setSyncStatusLabel, showToast } from "./ui.js";
import { logError, logInfo, logWarn } from "./logger.js";
import {
  authenticateGoogleCredential,
  authenticateLocal,
  ensureAuthSettingsDefaults,
  getAuthState,
  setLocalAdminCredentials,
  updateAuthSettings
} from "./auth.js";

const splashScreen = document.getElementById("splashScreen");
const appShell = document.getElementById("appShell");
const authRoot = document.getElementById("authRoot");
const installBtn = document.getElementById("installBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
let deferredInstallPrompt = null;

function registerGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    logError("Unhandled runtime error", {
      file: event.filename || "",
      line: event.lineno || 0,
      column: event.colno || 0
    }, event.error || event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    logError("Unhandled promise rejection", {}, event.reason);
  });
}

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installBtn.hidden = false;
    logInfo("Install prompt captured");
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installBtn.hidden = true;
    logInfo("PWA installed");
    showToast("App installed successfully.", "success");
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./service-worker.js");
    logInfo("Service worker registered");
  } catch {
    logWarn("Service worker registration failed");
    // no-op: app remains functional without service worker
  }
}

async function hideSplashAndShowApp() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  splashScreen.classList.remove("is-visible");
  await new Promise((resolve) => setTimeout(resolve, 250));
  splashScreen.setAttribute("aria-hidden", "true");
  splashScreen.style.display = "none";
}

function connectStatusSignals() {
  setConnectionStatusLabel(navigator.onLine);
  window.addEventListener("online", () => setConnectionStatusLabel(true));
  window.addEventListener("offline", () => setConnectionStatusLabel(false));
  subscribeSyncState((syncState) => setSyncStatusLabel(syncState));
}

function setAuthError(message) {
  let errorEl = authRoot.querySelector("#authError");
  if (!errorEl) {
    errorEl = document.createElement("p");
    errorEl.id = "authError";
    errorEl.className = "help-text";
    errorEl.style.color = "#8f1f1f";
    authRoot.querySelector(".auth-card")?.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

function bindPasswordVisibilityToggles(rootElement) {
  rootElement.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-target");
      if (!targetId) return;
      const input = document.getElementById(targetId);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
    });
  });
}

async function ensureAuthenticated() {
  await ensureAuthSettingsDefaults();
  while (true) {
    const state = await getAuthState();
    if (!state.auth.localEnabled && !(state.auth.googleEnabled && state.auth.googleClientId)) {
      await updateAuthSettings({ localEnabled: true });
      state.auth.localEnabled = true;
    }
    if (state.authenticated) {
      authRoot.hidden = true;
      return state.session;
    }

    const { authGateTemplate } = await import("../components/auth.js");
    const settings = await getAppSettings();
    authRoot.hidden = false;
    authRoot.innerHTML = authGateTemplate({
      businessName: settings.businessName || "Data Insights by Ray",
      auth: state.auth,
      localCredentialsReady: state.localCredentialsReady,
      online: navigator.onLine
    });
    bindPasswordVisibilityToggles(authRoot);

    const session = await new Promise((resolve) => {
      const setupForm = authRoot.querySelector("#localSetupForm");
      const loginForm = authRoot.querySelector("#localLoginForm");
      const googleWrap = authRoot.querySelector("#googleSignInButton");

      setupForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const password = String(form.get("password") || "");
        const confirm = String(form.get("confirmPassword") || "");
        if (password !== confirm) {
          setAuthError("Passwords do not match.");
          return;
        }
        try {
          await setLocalAdminCredentials(form.get("username"), password);
          resolve(null);
        } catch (error) {
          setAuthError(error.message || "Unable to set admin credentials.");
        }
      });

      loginForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
          const created = await authenticateLocal(form.get("username"), form.get("password"));
          resolve(created);
        } catch (error) {
          setAuthError(error.message || "Login failed.");
        }
      });

      const shouldInitGoogle = Boolean(
        state.auth.googleEnabled &&
        state.auth.googleClientId &&
        googleWrap &&
        navigator.onLine &&
        window.google?.accounts?.id
      );

      if (shouldInitGoogle) {
        try {
          window.google.accounts.id.initialize({
            client_id: state.auth.googleClientId,
            callback: async (response) => {
              try {
                const created = await authenticateGoogleCredential(response.credential);
                resolve(created);
              } catch (error) {
                setAuthError(error.message || "Google login failed.");
              }
            }
          });
          window.google.accounts.id.renderButton(googleWrap, {
            type: "standard",
            shape: "pill",
            theme: "outline",
            text: "signin_with",
            size: "large",
            width: 280
          });
        } catch {
          setAuthError("Google login could not initialize.");
        }
      }
    });

    if (session) {
      authRoot.hidden = true;
      return session;
    }
  }
}

async function maybePromptRestoreFlow() {
  const alreadyHandled = await getSetting("startupRestoreChoiceDone", false);
  if (alreadyHandled) return;
  const profile = await getActiveProfile();
  const accountId = getAccountIdFromProfile(profile);
  const snapshot = await loadAccountSnapshot(accountId);
  const hasData = Object.values(snapshot).some((rows) => Array.isArray(rows) && rows.length > 0);
  if (hasData) {
    await setSetting("startupRestoreChoiceDone", true);
    return;
  }

  const wantsRestore = window.confirm("Restore your tutoring data from a backup file? Choose Cancel to start fresh.");
  if (!wantsRestore) {
    await setSetting("startupRestoreChoiceDone", true);
    return;
  }

  await new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve();
        return;
      }
      try {
        const passphrase = window.prompt("Enter backup passphrase if the file is encrypted:", "") || "";
        await restoreFromLocalFile(accountId, file, passphrase);
        showToast("Backup restored successfully.", "success");
      } catch (error) {
        showToast(`Restore failed: ${error.message}`, "error");
      } finally {
        resolve();
      }
    });
    input.click();
  });
  await setSetting("startupRestoreChoiceDone", true);
}

async function bootstrap() {
  registerGlobalErrorHandlers();
  logInfo("App bootstrap started");
  await registerServiceWorker();
  setupInstallPrompt();
  await initStorage();
  await migrateLegacyLocalStorage();
  await initTheme(themeToggleBtn);
  const initialSettings = await getAppSettings();
  if (initialSettings.appName || initialSettings.businessName) {
    document.title = initialSettings.appName || initialSettings.businessName;
    const brandTitle = document.getElementById("brandTitle");
    if (brandTitle) {
      brandTitle.textContent = initialSettings.businessName;
    }
  }
  themeToggleBtn?.addEventListener("click", async () => {
    await toggleThemeMode(themeToggleBtn);
  });
  await hideSplashAndShowApp();
  await ensureAuthenticated();
  await maybePromptRestoreFlow();
  appShell.hidden = false;

  const refs = {
    main: document.getElementById("mainContent"),
    navButtons: [...document.querySelectorAll(".nav-btn")],
    modalRoot: document.getElementById("modalRoot"),
    toast: document.getElementById("toast"),
    connectionState: document.getElementById("connectionState"),
    syncState: document.getElementById("syncState"),
    activeAccountLabel: document.getElementById("activeAccountLabel"),
    syncNowBtn: document.getElementById("syncNowBtn"),
    logoutBtn: document.getElementById("logoutBtn")
  };
  await initUI(refs);
  connectStatusSignals();
  initSyncEngine();
  await refreshQueueCount();
  await requestBackgroundSync();
  if (navigator.onLine) {
    await syncNow();
  }
  logInfo("App bootstrap completed");
}

bootstrap().catch((error) => {
  appShell.hidden = false;
  splashScreen.style.display = "none";
  authRoot.hidden = true;
  logError("Startup crash", {}, error);
  // eslint-disable-next-line no-console
  console.error(error);
  showToast(`Startup error: ${error.message}`, "error");
});

import { getAppSettings, patchAppSettings } from "./storage.js";

function setThemeToggleLabel(button, mode) {
  if (!button) return;
  button.textContent = mode === "dark" ? "Light" : "Dark";
  button.setAttribute("aria-label", mode === "dark" ? "Switch to light mode" : "Switch to dark mode");
}

export function applyThemeMode(mode = "light", button = null) {
  const normalized = mode === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", normalized);
  setThemeToggleLabel(button, normalized);
  return normalized;
}

export async function initTheme(button = null) {
  const settings = await getAppSettings();
  const root = document.documentElement;
  const palette = settings.themePalette || {};

  if (palette.primary) root.style.setProperty("--color-primary", palette.primary);
  if (palette.secondary) root.style.setProperty("--color-secondary", palette.secondary);
  if (palette.accent) root.style.setProperty("--color-accent", palette.accent);

  const themeMode = settings.ui?.themeMode || "light";
  applyThemeMode(themeMode, button);
}

export async function toggleThemeMode(button = null) {
  const settings = await getAppSettings();
  const current = settings.ui?.themeMode === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  await patchAppSettings({
    ui: {
      ...(settings.ui || {}),
      themeMode: next
    }
  });
  return applyThemeMode(next, button);
}

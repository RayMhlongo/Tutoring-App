import { patchSettings, getSettings } from "../../data/db/client.js";

export async function applyThemeFromSettings() {
  const settings = await getSettings();
  document.documentElement.dataset.theme = settings.themeMode === "dark" ? "dark" : "light";
  document.documentElement.style.setProperty("--accent", settings.accentColor || "#0d9f8f");
}

export async function toggleTheme() {
  const settings = await getSettings();
  const next = settings.themeMode === "dark" ? "light" : "dark";
  await patchSettings({ themeMode: next });
  await applyThemeFromSettings();
}
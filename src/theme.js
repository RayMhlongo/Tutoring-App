import { getAppSettings } from "./storage.js";

export async function initTheme() {
  const settings = await getAppSettings();
  const root = document.documentElement;
  const palette = settings.themePalette || {};

  if (palette.primary) root.style.setProperty("--color-primary", palette.primary);
  if (palette.secondary) root.style.setProperty("--color-secondary", palette.secondary);
  if (palette.accent) root.style.setProperty("--color-accent", palette.accent);
}

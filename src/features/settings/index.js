import { card, field, toast } from "../../ui/components/primitives.js";
import { getSettings, patchSettings } from "../../data/db/client.js";
import { updatePasscode } from "../auth/service.js";

export async function renderSettings() {
  const settings = await getSettings();
  return `
    ${card("Business Settings", `
      <form id="businessSettingsForm" class="form-grid">
        ${field("Business Name", "businessName", settings.businessName || "", "text", "required")}
        ${field("Accent Color", "accentColor", settings.accentColor || "#0d9f8f", "color")}
        ${field("Currency (ISO)", "currency", settings.currency || "ZAR")}
        <button class="btn" type="submit">Save business settings</button>
      </form>
    `)}

    ${card("Backup Integrations", `
      <form id="backupSettingsForm" class="form-grid">
        <label class="switch"><input type="checkbox" name="encryptByDefault" ${settings.backup?.encryptByDefault ? "checked" : ""}> Encrypt backups by default</label>
        ${field("Passphrase hint", "passphraseHint", settings.backup?.passphraseHint || "")}
        <label class="switch"><input type="checkbox" name="googleDriveEnabled" ${settings.backup?.googleDriveEnabled ? "checked" : ""}> Enable Google Drive backup</label>
        ${field("Google OAuth Client ID", "googleClientId", settings.backup?.googleClientId || "")}
        <button class="btn" type="submit">Save backup settings</button>
      </form>
    `)}

    ${card("AI Integrations", `
      <form id="aiSettingsForm" class="form-grid">
        <label class="switch"><input type="checkbox" name="enabled" ${settings.ai?.enabled ? "checked" : ""}> Enable AI summaries</label>
        ${field("Provider Endpoint", "endpoint", settings.ai?.endpoint || "")}
        ${field("API Key", "apiKey", settings.ai?.apiKey || "", "password")}
        ${field("Model", "model", settings.ai?.model || "")}
        <button class="btn" type="submit">Save AI settings</button>
      </form>
    `)}

    ${card("Security", `
      <form id="passcodeForm" class="form-grid">
        ${field("Current passcode", "currentPasscode", "", "password", "required")}
        ${field("New passcode", "nextPasscode", "", "password", "required")}
        <button class="btn" type="submit">Update passcode</button>
      </form>
    `)}
  `;
}

export function bindSettings(root, rerender) {
  root.querySelector("#businessSettingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await patchSettings({
      businessName: String(form.get("businessName") || ""),
      accentColor: String(form.get("accentColor") || "#0d9f8f"),
      currency: String(form.get("currency") || "ZAR").toUpperCase()
    });
    toast("Business settings saved.", "success");
    await rerender();
  });

  root.querySelector("#backupSettingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await patchSettings({
      backup: {
        encryptByDefault: form.get("encryptByDefault") === "on",
        passphraseHint: String(form.get("passphraseHint") || ""),
        googleDriveEnabled: form.get("googleDriveEnabled") === "on",
        googleClientId: String(form.get("googleClientId") || "")
      }
    });
    toast("Backup settings saved.", "success");
  });

  root.querySelector("#aiSettingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await patchSettings({
      ai: {
        enabled: form.get("enabled") === "on",
        endpoint: String(form.get("endpoint") || ""),
        apiKey: String(form.get("apiKey") || ""),
        model: String(form.get("model") || "gpt-4.1-mini")
      }
    });
    toast("AI settings saved.", "success");
  });

  root.querySelector("#passcodeForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await updatePasscode(String(form.get("currentPasscode") || ""), String(form.get("nextPasscode") || ""));
      toast("Passcode updated.", "success");
      event.currentTarget.reset();
    } catch (error) {
      toast(error.message, "error");
    }
  });
}
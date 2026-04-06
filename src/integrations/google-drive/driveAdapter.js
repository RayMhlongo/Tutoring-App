import { sanitizeText } from "../../utils/common.js";

function ensureGisScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-gis]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google GIS failed to load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google GIS failed to load."));
    document.head.append(script);
  });
}

async function getToken(clientId) {
  await ensureGisScript();
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response) => {
        if (response.error) reject(new Error(response.error));
        else resolve(response.access_token);
      }
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

async function getDriveToken(backupSettings) {
  const clientId = sanitizeText(backupSettings?.googleClientId, 300);
  if (!backupSettings?.googleDriveEnabled || !clientId) {
    throw new Error("Google Drive backup is not configured.");
  }
  return getToken(clientId);
}

export async function uploadBackupToDrive(payload, backupSettings) {
  const token = await getDriveToken(backupSettings);

  const metadata = {
    name: `edupulse-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    mimeType: "application/json",
    appProperties: {
      edupulseBackup: "true"
    }
  };

  const boundary = `----edupulse-${Math.random().toString(36).slice(2)}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    JSON.stringify(payload),
    `--${boundary}--`
  ].join("\r\n");

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) throw new Error(`Drive upload failed (${response.status}).`);
  return response.json();
}

export async function downloadLatestBackupFromDrive(backupSettings) {
  const token = await getDriveToken(backupSettings);
  const q = encodeURIComponent("appProperties has { key='edupulseBackup' and value='true' } and trashed=false");
  const listResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime)&orderBy=createdTime desc&pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!listResponse.ok) throw new Error("Unable to list Drive backups.");
  const listData = await listResponse.json();
  const latest = Array.isArray(listData.files) ? listData.files[0] : null;
  if (!latest?.id) throw new Error("No Drive backups found.");

  const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${latest.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!fileResponse.ok) throw new Error("Unable to download latest Drive backup.");
  const payload = await fileResponse.json();
  return { file: latest, payload };
}
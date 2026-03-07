import { loadAccountSnapshot, replaceAccountDataset, getAppSettings, patchAppSettings } from "./storage.js";
import { exportAccountDataAsCsv } from "./reports.js";
import { downloadText, sanitizeText, uid } from "./utils.js";

const BACKUP_VERSION = 1;

function bufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveAesKey(passphrase, salt) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptJson(payload, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const plainBytes = new TextEncoder().encode(JSON.stringify(payload));
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainBytes);
  return {
    encrypted: true,
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    cipherText: bufferToBase64(cipherBuffer)
  };
}

async function decryptJson(payload, passphrase) {
  const salt = new Uint8Array(base64ToBuffer(payload.salt));
  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const cipher = base64ToBuffer(payload.cipherText);
  const key = await deriveAesKey(passphrase, salt);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  const plainText = new TextDecoder().decode(plainBuffer);
  return JSON.parse(plainText);
}

function buildFileName(accountId, ext) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `xfactor-backup-${accountId}-${stamp}.${ext}`;
}

export async function createBackupPayload(accountId, options = {}) {
  const [snapshot, settings] = await Promise.all([
    loadAccountSnapshot(accountId),
    getAppSettings()
  ]);

  const includeSettings = options.includeSettings !== false;
  const includeReports = options.includeReports !== false;
  if (!includeReports) {
    snapshot.reports = [];
  }
  return {
    meta: {
      version: BACKUP_VERSION,
      accountId,
      createdAt: new Date().toISOString()
    },
    tables: snapshot,
    settings: includeSettings ? settings : null
  };
}

export async function exportBackupJson(accountId, config = {}, passphrase = "") {
  const payload = await createBackupPayload(accountId, config);
  let outputPayload = payload;
  if (config.encryptBackups) {
    const clean = sanitizeText(passphrase, 256);
    if (!clean) throw new Error("A backup passphrase is required for encrypted backup.");
    outputPayload = {
      meta: payload.meta,
      backupType: "encrypted-json",
      data: await encryptJson(payload, clean)
    };
  }
  downloadText(buildFileName(accountId, "json"), JSON.stringify(outputPayload, null, 2), "application/json;charset=utf-8");
  return outputPayload;
}

export async function exportBackupCsv(accountId) {
  await exportAccountDataAsCsv(accountId);
}

export async function restoreFromBackupPayload(accountId, payload, passphrase = "") {
  let parsed = payload;
  if (payload?.backupType === "encrypted-json" && payload?.data?.encrypted) {
    const clean = sanitizeText(passphrase, 256);
    if (!clean) throw new Error("Passphrase is required to decrypt backup.");
    parsed = await decryptJson(payload.data, clean);
  }

  if (!parsed?.tables) {
    throw new Error("Backup file format is invalid.");
  }
  await replaceAccountDataset(accountId, parsed.tables);
  if (parsed.settings) {
    await patchAppSettings(parsed.settings);
  }
}

export async function restoreFromLocalFile(accountId, file, passphrase = "") {
  const text = await file.text();
  const parsed = JSON.parse(text);
  await restoreFromBackupPayload(accountId, parsed, passphrase);
}

function getTokenClient(clientId) {
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google OAuth client not available.");
  }
  return window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: "https://www.googleapis.com/auth/drive.file"
  });
}

async function requestDriveToken(clientId) {
  return new Promise((resolve, reject) => {
    try {
      const tokenClient = getTokenClient(clientId);
      tokenClient.callback = (response) => {
        if (response.error) reject(new Error(response.error));
        else resolve(response.access_token);
      };
      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (error) {
      reject(error);
    }
  });
}

async function uploadDriveFile(accessToken, filename, content, mimeType = "application/json") {
  const metadata = {
    name: filename,
    mimeType,
    appProperties: {
      xfactorBackup: "true"
    }
  };
  const boundary = `----xfactor-${uid("bnd")}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    "",
    content,
    `--${boundary}--`
  ].join("\r\n");

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });
  if (!response.ok) {
    throw new Error(`Drive upload failed (${response.status}).`);
  }
  return response.json();
}

async function listDriveBackups(accessToken) {
  const q = encodeURIComponent("appProperties has { key='xfactorBackup' and value='true' } and trashed=false");
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime)&pageSize=20`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) throw new Error("Unable to list Drive backups.");
  const data = await response.json();
  return data.files || [];
}

async function downloadDriveFile(accessToken, fileId) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) throw new Error("Unable to download Drive backup.");
  return response.text();
}

export async function backupToGoogleDrive(accountId, passphrase = "") {
  const settings = await getAppSettings();
  const auth = settings.auth || {};
  if (!auth.googleClientId) {
    throw new Error("Google client ID is not configured.");
  }
  const backupPayload = await createBackupPayload(accountId, settings.backup || {});
  let uploadContent = JSON.stringify(backupPayload, null, 2);
  if (settings.backup?.encryptBackups) {
    const clean = sanitizeText(passphrase, 256);
    if (!clean) throw new Error("Passphrase is required for encrypted Drive backup.");
    uploadContent = JSON.stringify({
      meta: backupPayload.meta,
      backupType: "encrypted-json",
      data: await encryptJson(backupPayload, clean)
    });
  }
  const token = await requestDriveToken(auth.googleClientId);
  return uploadDriveFile(token, buildFileName(accountId, "json"), uploadContent);
}

export async function restoreLatestFromGoogleDrive(accountId, passphrase = "") {
  const settings = await getAppSettings();
  const auth = settings.auth || {};
  if (!auth.googleClientId) {
    throw new Error("Google client ID is not configured.");
  }
  const token = await requestDriveToken(auth.googleClientId);
  const files = await listDriveBackups(token);
  if (!files.length) {
    throw new Error("No Google Drive backups found.");
  }
  files.sort((a, b) => (a.createdTime > b.createdTime ? -1 : 1));
  const latest = files[0];
  const text = await downloadDriveFile(token, latest.id);
  const parsed = JSON.parse(text);
  await restoreFromBackupPayload(accountId, parsed, passphrase);
  return latest;
}

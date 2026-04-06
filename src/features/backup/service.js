import { APP_NAME, APP_VERSION, ENTITY_TABLES, TABLES } from "../../core/constants.js";
import { db, getCounts, getSettings } from "../../data/db/client.js";
import { decryptJson, encryptJson } from "../../utils/crypto.js";
import { downloadText, nowIso, sanitizeText, uid } from "../../utils/common.js";
import { uploadBackupToDrive, downloadLatestBackupFromDrive } from "../../integrations/google-drive/driveAdapter.js";

async function loadSnapshot() {
  const snapshot = {};
  for (const tableName of ENTITY_TABLES) {
    snapshot[tableName] = await db[tableName].toArray();
  }
  return snapshot;
}

async function restorePayload(parsed, passphrase = "") {
  let payload = parsed;
  if (parsed.encrypted) {
    const safePassphrase = sanitizeText(passphrase, 120);
    if (!safePassphrase) throw new Error("Passphrase required.");
    payload = await decryptJson(parsed.cipher, safePassphrase);
  }
  if (!payload.tables) throw new Error("Invalid backup format.");

  await db.transaction("rw", ...ENTITY_TABLES.map((name) => db[name]), async () => {
    for (const tableName of ENTITY_TABLES) {
      await db[tableName].clear();
      const rows = Array.isArray(payload.tables[tableName]) ? payload.tables[tableName] : [];
      if (rows.length) await db[tableName].bulkPut(rows);
    }
  });

  return payload.meta || null;
}

export const BackupService = {
  async createBackup({ encrypted = false, passphrase = "" } = {}) {
    const [settings, counts, tables] = await Promise.all([getSettings(), getCounts(), loadSnapshot()]);
    const payload = {
      meta: {
        id: uid("bak"),
        dateTime: nowIso(),
        businessName: settings.businessName || APP_NAME,
        appVersion: APP_VERSION,
        recordCounts: counts
      },
      tables
    };

    if (encrypted) {
      const safePassphrase = sanitizeText(passphrase, 120);
      if (!safePassphrase) throw new Error("Passphrase required for encrypted backup.");
      return {
        meta: payload.meta,
        encrypted: true,
        cipher: await encryptJson(payload, safePassphrase)
      };
    }
    return payload;
  },

  async previewRestore(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed.encrypted) {
      return {
        encrypted: true,
        meta: parsed.meta || null,
        canRestore: false,
        warning: "Encrypted backup. Passphrase required."
      };
    }
    return {
      encrypted: false,
      meta: parsed.meta || null,
      canRestore: true,
      counts: Object.fromEntries(Object.entries(parsed.tables || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]))
    };
  },

  async restore(file, { overwrite = false, passphrase = "" } = {}) {
    if (!overwrite) throw new Error("Restore blocked. Confirm overwrite first.");
    const text = await file.text();
    const parsed = JSON.parse(text);
    return restorePayload(parsed, passphrase);
  },

  async restoreLatestFromDrive({ overwrite = false, passphrase = "" } = {}) {
    if (!overwrite) throw new Error("Restore blocked. Confirm overwrite first.");
    const settings = await getSettings();
    const result = await downloadLatestBackupFromDrive(settings.backup);
    const meta = await restorePayload(result.payload, passphrase);
    return { file: result.file, meta };
  },

  async queueCloudBackup(options = {}) {
    const dedupeKey = `${new Date().toISOString().slice(0, 16)}::manual`;
    const existing = await db[TABLES.backupJobs].where("dedupeKey").equals(dedupeKey).first();
    if (existing) return existing;

    const payload = await this.createBackup(options);
    const job = {
      id: uid("job"),
      dedupeKey,
      status: "pending",
      message: "Queued while offline or awaiting upload",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      payload
    };
    await db[TABLES.backupJobs].put(job);
    return job;
  },

  async processQueue() {
    const settings = await getSettings();
    const jobs = await db[TABLES.backupJobs].where("status").equals("pending").toArray();
    if (!jobs.length) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;
    for (const job of jobs) {
      try {
        if (!navigator.onLine) throw new Error("Offline");
        await uploadBackupToDrive(job.payload, settings.backup);
        job.status = "done";
        job.message = "Uploaded to Google Drive";
        processed += 1;
      } catch (error) {
        job.status = "failed";
        job.message = error.message || "Upload failed";
        failed += 1;
      }
      job.updatedAt = nowIso();
      await db[TABLES.backupJobs].put(job);
    }
    return { processed, failed };
  },

  async downloadBackup(options = {}) {
    const payload = await this.createBackup(options);
    downloadText(`edupulse-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    return payload;
  }
};
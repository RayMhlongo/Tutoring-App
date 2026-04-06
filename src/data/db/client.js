import { TABLES, DEFAULT_SETTINGS } from "../../core/constants.js";
import { nowIso } from "../../utils/common.js";
import { createDb } from "./schema.js";

const DexieRef = window.Dexie;
if (!DexieRef) {
  throw new Error("Dexie failed to load. Ensure assets/vendor/dexie.min.js is present.");
}

export const db = createDb(DexieRef);

export async function initDb() {
  await db.open();
  const app = await db.settings.get("app");
  if (!app) {
    await db.settings.put({ key: "app", value: DEFAULT_SETTINGS, updatedAt: nowIso() });
  }
  const session = await db.settings.get("session");
  if (!session) {
    await db.settings.put({ key: "session", value: { authenticated: false }, updatedAt: nowIso() });
  }
}

export async function getSettings() {
  const row = await db.settings.get("app");
  return row?.value || DEFAULT_SETTINGS;
}

export async function patchSettings(partial) {
  const current = await getSettings();
  const next = {
    ...current,
    ...partial,
    auth: { ...(current.auth || {}), ...(partial.auth || {}) },
    backup: { ...(current.backup || {}), ...(partial.backup || {}) },
    ai: { ...(current.ai || {}), ...(partial.ai || {}) },
    notifications: { ...(current.notifications || {}), ...(partial.notifications || {}) }
  };
  await db.settings.put({ key: "app", value: next, updatedAt: nowIso() });
  return next;
}

export async function getSession() {
  const row = await db.settings.get("session");
  return row?.value || { authenticated: false };
}

export async function setSession(value) {
  await db.settings.put({ key: "session", value, updatedAt: nowIso() });
}

export async function logActivity(entry) {
  await db.activityLog.put({
    id: entry.id,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    message: entry.message,
    createdAt: nowIso()
  });
}

export async function getCounts() {
  const counts = {};
  for (const tableName of Object.values(TABLES)) {
    if (tableName === TABLES.settings || tableName === TABLES.backupJobs || tableName === TABLES.activityLog) continue;
    counts[tableName] = await db[tableName].where("archivedAt").equals(null).count();
  }
  return counts;
}
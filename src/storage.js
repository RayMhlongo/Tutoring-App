import { APP_INFO, DEFAULT_SETTINGS, SNAPSHOT_TABLES, SYNC, TABLES } from "./config.js";
import { isoNow, sanitizeEmail, sanitizeObject, sanitizeText, uid } from "./utils.js";

const DexieRef = window.Dexie;

if (!DexieRef) {
  throw new Error("Dexie is required. Ensure Dexie script is loaded before app modules.");
}

export const db = new DexieRef(APP_INFO.dbName);

db.version(1).stores({
  [TABLES.students]: "id, accountId, surname, firstName, grade, updatedAt, deleted",
  [TABLES.lessons]: "id, accountId, studentId, date, subject, updatedAt, deleted",
  [TABLES.attendance]: "id, accountId, studentId, lessonId, dateTime, updatedAt, deleted",
  [TABLES.payments]: "id, accountId, studentId, date, status, updatedAt, deleted",
  [TABLES.expenses]: "id, accountId, date, category, updatedAt, deleted",
  [TABLES.reports]: "id, accountId, type, createdAt, updatedAt, deleted",
  [TABLES.syncQueue]: "++queueId, changeId, accountId, table, recordId, status, attempts, nextRetryAt, createdAt, [accountId+table+recordId], [status+nextRetryAt]",
  [TABLES.settings]: "key, updatedAt"
});

db.version(APP_INFO.dbVersion).stores({
  [TABLES.students]: "id, accountId, surname, firstName, grade, updatedAt, deleted",
  [TABLES.tutors]: "id, accountId, surname, firstName, updatedAt, deleted",
  [TABLES.lessons]: "id, accountId, studentId, date, subject, updatedAt, deleted",
  [TABLES.assignments]: "id, accountId, studentId, tutorId, dueDate, updatedAt, deleted",
  [TABLES.attendance]: "id, accountId, studentId, lessonId, dateTime, updatedAt, deleted",
  [TABLES.payments]: "id, accountId, studentId, date, status, updatedAt, deleted",
  [TABLES.expenses]: "id, accountId, date, category, updatedAt, deleted",
  [TABLES.schedule]: "id, accountId, date, timeStart, studentId, subject, updatedAt, deleted",
  [TABLES.messages]: "id, accountId, userId, channel, createdAt, updatedAt, deleted",
  [TABLES.notifications]: "id, accountId, type, status, createdAt, updatedAt, deleted",
  [TABLES.performanceMetrics]: "id, accountId, metricType, date, updatedAt, deleted",
  [TABLES.businessMetrics]: "id, accountId, metricType, date, updatedAt, deleted",
  [TABLES.reports]: "id, accountId, type, createdAt, updatedAt, deleted",
  [TABLES.syncQueue]: "++queueId, changeId, accountId, table, recordId, status, attempts, nextRetryAt, createdAt, [accountId+table+recordId], [status+nextRetryAt]",
  [TABLES.settings]: "key, updatedAt"
});

function mergeSettings(base, incoming) {
  if (Array.isArray(base) || Array.isArray(incoming)) {
    return incoming ?? base;
  }
  if (!base || typeof base !== "object") return incoming ?? base;
  if (!incoming || typeof incoming !== "object") return incoming ?? base;

  const out = { ...base };
  Object.keys(incoming).forEach((key) => {
    out[key] = mergeSettings(base[key], incoming[key]);
  });
  return out;
}

function normalizeTenantId(input, fallback = APP_INFO.tenantId) {
  const raw = sanitizeText(input || fallback, 80).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return raw || sanitizeText(fallback, 80).toLowerCase() || "tenant-default";
}

export async function initStorage() {
  await db.open();
  const existing = await db.settings.get("appSettings");
  if (!existing) {
    await db.settings.put({
      key: "appSettings",
      value: DEFAULT_SETTINGS,
      updatedAt: isoNow()
    });
  }
}

export async function migrateLegacyLocalStorage() {
  const legacyKeys = ["xfactor-data", "xfactor_students", "xfactor_lessons", "xfactor_payments", "xfactor_expenses"];
  const marker = await db.settings.get("legacyMigrated");
  if (marker?.value === true) return;

  const appSettings = await getAppSettings();
  const accountId = appSettings.activeProfileId || "local-profile";

  for (const key of legacyKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const payload = JSON.parse(raw);
      if (key === "xfactor-data" && payload && typeof payload === "object") {
        const mappings = [
          [TABLES.students, payload.students],
          [TABLES.lessons, payload.lessons],
          [TABLES.payments, payload.payments],
          [TABLES.expenses, payload.expenses],
          [TABLES.attendance, payload.attendance],
          [TABLES.schedule, payload.schedule]
        ];
        for (const [table, rows] of mappings) {
          if (!Array.isArray(rows)) continue;
          for (const row of rows) {
            await saveRecord(table, { ...row, accountId }, { queue: false, op: "upsert" });
          }
        }
      }
      if (key === "xfactor_students" && Array.isArray(payload)) {
        for (const row of payload) {
          await saveRecord(TABLES.students, { ...row, accountId }, { queue: false, op: "upsert" });
        }
      }
      if (key === "xfactor_lessons" && Array.isArray(payload)) {
        for (const row of payload) {
          await saveRecord(TABLES.lessons, { ...row, accountId }, { queue: false, op: "upsert" });
        }
      }
      if (key === "xfactor_payments" && Array.isArray(payload)) {
        for (const row of payload) {
          await saveRecord(TABLES.payments, { ...row, accountId }, { queue: false, op: "upsert" });
        }
      }
      if (key === "xfactor_expenses" && Array.isArray(payload)) {
        for (const row of payload) {
          await saveRecord(TABLES.expenses, { ...row, accountId }, { queue: false, op: "upsert" });
        }
      }
    } catch {
      // Ignore malformed local legacy payloads.
    }
  }

  await db.settings.put({
    key: "legacyMigrated",
    value: true,
    updatedAt: isoNow()
  });
}

export async function getSetting(key, fallback = null) {
  const found = await db.settings.get(key);
  return found ? found.value : fallback;
}

export async function setSetting(key, value) {
  await db.settings.put({
    key,
    value: sanitizeObject(value),
    updatedAt: isoNow()
  });
}

export async function getAppSettings() {
  const stored = await getSetting("appSettings", DEFAULT_SETTINGS);
  return mergeSettings(DEFAULT_SETTINGS, sanitizeObject(stored) || {});
}

export async function patchAppSettings(partial) {
  const current = await getAppSettings();
  const next = mergeSettings(current, sanitizeObject(partial) || {});
  await setSetting("appSettings", next);
  return next;
}

export async function setActiveProfile(profileId) {
  const settings = await getAppSettings();
  const exists = settings.syncProfiles.some((profile) => profile.id === profileId);
  if (!exists) throw new Error("Selected profile does not exist.");
  settings.activeProfileId = profileId;
  settings.syncProfiles = settings.syncProfiles.map((profile) => ({
    ...profile,
    active: profile.id === profileId
  }));
  await setSetting("appSettings", settings);
  return settings;
}

export async function saveSyncProfile(profileInput) {
  const settings = await getAppSettings();
  const tenantId = normalizeTenantId(profileInput.tenantId || profileInput.id || profileInput.label || "tenant");
  const incomingId = profileInput.id || uid("acct");
  const profile = {
    id: incomingId,
    label: sanitizeText(profileInput.label || profileInput.gmail || "Profile", 60),
    gmail: sanitizeEmail(profileInput.gmail || ""),
    tenantId,
    plan: sanitizeText(profileInput.plan || settings.tenantPlans?.[profileInput.id || ""] || "starter", 20).toLowerCase() || "starter",
    subscriptionStatus: sanitizeText(profileInput.subscriptionStatus || "trial", 24).toLowerCase() || "trial",
    endpoint: sanitizeText(profileInput.endpoint || "", 1000),
    active: Boolean(profileInput.active)
  };

  const index = settings.syncProfiles.findIndex((entry) => entry.id === profile.id);
  if (index >= 0) {
    settings.syncProfiles[index] = { ...settings.syncProfiles[index], ...profile };
  } else {
    settings.syncProfiles.push(profile);
  }

  if (profile.active) {
    settings.activeProfileId = profile.id;
    settings.syncProfiles = settings.syncProfiles.map((entry) => ({ ...entry, active: entry.id === profile.id }));
  }
  settings.tenantPlans = {
    ...(settings.tenantPlans || {}),
    [profile.id]: profile.plan
  };

  await setSetting("appSettings", settings);
  return settings;
}

export async function removeSyncProfile(profileId) {
  const settings = await getAppSettings();
  if (profileId === "local-profile") {
    throw new Error("The default local profile cannot be removed.");
  }
  settings.syncProfiles = settings.syncProfiles.filter((profile) => profile.id !== profileId);
  if (settings.tenantPlans && typeof settings.tenantPlans === "object") {
    delete settings.tenantPlans[profileId];
  }
  if (!settings.syncProfiles.length) {
    settings.syncProfiles = [...DEFAULT_SETTINGS.syncProfiles];
    settings.activeProfileId = DEFAULT_SETTINGS.activeProfileId;
  } else if (settings.activeProfileId === profileId) {
    settings.activeProfileId = settings.syncProfiles[0].id;
    settings.syncProfiles = settings.syncProfiles.map((profile, index) => ({ ...profile, active: index === 0 }));
  }
  await setSetting("appSettings", settings);
  return settings;
}

export async function getActiveProfile() {
  const settings = await getAppSettings();
  const active = settings.syncProfiles.find((profile) => profile.id === settings.activeProfileId) || settings.syncProfiles[0];
  if (!active) {
    return {
      id: "local-profile",
      label: "Local",
      tenantId: APP_INFO.tenantId,
      endpoint: "",
      active: true
    };
  }
  return {
    ...active,
    tenantId: normalizeTenantId(active.tenantId || active.id || APP_INFO.tenantId),
    subscriptionStatus: sanitizeText(active.subscriptionStatus || "trial", 24).toLowerCase() || "trial"
  };
}

export function getAccountIdFromProfile(profile) {
  return profile?.id || "local-profile";
}

function normalizeRecord(table, record, accountId) {
  const now = isoNow();
  const sanitized = sanitizeObject(record) || {};
  const hasId = sanitizeText(sanitized.id || "").length > 0;
  const tenantId = normalizeTenantId(sanitized.tenantId || accountId || APP_INFO.tenantId);
  return {
    ...sanitized,
    id: hasId ? sanitizeText(sanitized.id, 120) : uid(table.slice(0, 3)),
    tenantId,
    accountId: sanitizeText(sanitized.accountId || accountId, 120),
    createdAt: sanitized.createdAt || now,
    updatedAt: now,
    deleted: Boolean(sanitized.deleted)
  };
}

export async function saveRecord(table, record, options = {}) {
  const settings = await getAppSettings();
  const accountId = options.accountId || settings.activeProfileId;
  const activeProfile = settings.syncProfiles.find((profile) => profile.id === accountId);
  const tenantId = normalizeTenantId(options.tenantId || record?.tenantId || activeProfile?.tenantId || accountId || APP_INFO.tenantId);
  const op = options.op || "upsert";
  const queue = options.queue !== false;
  const data = normalizeRecord(table, { ...(record || {}), tenantId }, accountId);

  await db[table].put(data);
  if (queue) {
    await enqueueSyncChange({
      tenantId: data.tenantId,
      accountId: data.accountId,
      table,
      op,
      recordId: data.id,
      payload: data
    });
  }
  return data;
}

export async function markRecordDeleted(table, id, accountId) {
  const existing = await db[table].get(id);
  if (!existing) return null;
  return saveRecord(table, { ...existing, deleted: true }, { op: "delete", accountId });
}

export async function getRecordById(table, id) {
  return db[table].get(id);
}

export async function listRecords(table, accountId, options = {}) {
  const direction = options.direction === "asc" ? "asc" : "desc";
  const includeDeleted = options.includeDeleted === true;
  const indexed = await db[table].where("accountId").equals(accountId).toArray();
  const filtered = indexed.filter((record) => includeDeleted || !record.deleted);
  filtered.sort((a, b) => {
    const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return direction === "asc" ? aDate - bDate : bDate - aDate;
  });
  return filtered;
}

export async function replaceAccountDataset(accountId, snapshot = {}) {
  const tables = [...SNAPSHOT_TABLES];
  await db.transaction("rw", ...tables.map((table) => db[table]), async () => {
    for (const table of tables) {
      const current = await db[table].where("accountId").equals(accountId).toArray();
      await db[table].bulkDelete(current.map((item) => item.id));
      const rows = Array.isArray(snapshot[table]) ? snapshot[table] : [];
      for (const row of rows) {
        await db[table].put(normalizeRecord(table, row, accountId));
      }
    }
  });
}

export async function loadAccountSnapshot(accountId) {
  const tables = [...SNAPSHOT_TABLES];
  const snapshot = {};
  for (const table of tables) {
    snapshot[table] = await listRecords(table, accountId);
  }
  return snapshot;
}

export async function enqueueSyncChange(change) {
  const nowMs = Date.now();
  const queueEntry = {
    queueId: change.queueId,
    changeId: change.changeId || uid("chg"),
    tenantId: normalizeTenantId(change.tenantId || change.accountId || APP_INFO.tenantId),
    accountId: sanitizeText(change.accountId, 120),
    table: sanitizeText(change.table, 80),
    recordId: sanitizeText(change.recordId, 120),
    op: sanitizeText(change.op || "upsert", 32),
    payload: sanitizeObject(change.payload),
    status: "pending",
    attempts: 0,
    nextRetryAt: nowMs,
    createdAt: isoNow(),
    updatedAt: isoNow(),
    lastError: ""
  };

  const collisions = await db.syncQueue
    .where("[accountId+table+recordId]")
    .equals([queueEntry.accountId, queueEntry.table, queueEntry.recordId])
    .toArray();

  const existing = collisions.find((item) => item.status === "pending" || item.status === "failed");
  if (existing) {
    await db.syncQueue.update(existing.queueId, {
      ...queueEntry,
      queueId: existing.queueId,
      changeId: existing.changeId,
      attempts: existing.attempts,
      createdAt: existing.createdAt
    });
    return existing.queueId;
  }

  return db.syncQueue.add(queueEntry);
}

export async function getQueueCount(accountId) {
  const rows = await db.syncQueue.where("accountId").equals(accountId).toArray();
  return rows.filter((row) => row.status === "pending" || row.status === "failed").length;
}

export async function getQueuedChanges(accountId, limit = SYNC.queueBatchSize) {
  const nowMs = Date.now();
  const rows = await db.syncQueue.where("accountId").equals(accountId).toArray();
  return rows
    .filter((row) => (row.status === "pending" || row.status === "failed") && Number(row.nextRetryAt || 0) <= nowMs)
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
    .slice(0, limit);
}

export async function markQueueSynced(queueId) {
  await db.syncQueue.update(queueId, {
    status: "synced",
    lastError: "",
    syncedAt: isoNow(),
    updatedAt: isoNow()
  });
}

export async function markQueueFailed(queueId, errorMessage, attempts = 1) {
  const delay = Math.min(SYNC.baseRetryDelayMs * Math.pow(2, Math.max(0, attempts - 1)), 15 * 60 * 1000);
  await db.syncQueue.update(queueId, {
    status: attempts >= SYNC.maxRetries ? "dead" : "failed",
    attempts,
    lastError: sanitizeText(errorMessage || "Sync failed", 500),
    nextRetryAt: Date.now() + delay,
    updatedAt: isoNow()
  });
}

export async function resetDeadQueueToPending(accountId) {
  const rows = await db.syncQueue.where("accountId").equals(accountId).toArray();
  const deadRows = rows.filter((row) => row.status === "dead");
  await Promise.all(deadRows.map((row) => db.syncQueue.update(row.queueId, {
    status: "pending",
    attempts: 0,
    nextRetryAt: Date.now(),
    updatedAt: isoNow()
  })));
}

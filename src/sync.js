import { normalizeEndpoint, sendQueuedChange } from "./api.js";
import {
  getActiveProfile,
  getAccountIdFromProfile,
  getAppSettings,
  getQueueCount,
  getQueuedChanges,
  markQueueFailed,
  markQueueSynced,
  resetDeadQueueToPending
} from "./storage.js";
import { SYNC } from "./config.js";

const state = {
  running: false,
  lastSyncedAt: "",
  lastError: "",
  queueCount: 0
};

const listeners = new Set();
let heartbeatTimer = null;

function emit() {
  listeners.forEach((listener) => listener({ ...state }));
}

export function getSyncStateSnapshot() {
  return { ...state };
}

export function subscribeSyncState(listener) {
  listeners.add(listener);
  listener({ ...state });
  return () => listeners.delete(listener);
}

export async function refreshQueueCount() {
  const profile = await getActiveProfile();
  const accountId = getAccountIdFromProfile(profile);
  state.queueCount = await getQueueCount(accountId);
  emit();
  return state.queueCount;
}

export async function requestBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  if (!("sync" in registration)) return;
  try {
    await registration.sync.register("xfactor-sync-queue");
  } catch {
    // Background sync can fail if unsupported by browser policy.
  }
}

export async function syncNow(force = false) {
  if (state.running) return false;
  const [settings, profile] = await Promise.all([getAppSettings(), getActiveProfile()]);
  const accountId = getAccountIdFromProfile(profile);
  const resolvedEndpoint = normalizeEndpoint(profile?.endpoint || settings?.auth?.googleSheetsEndpoint || "");
  const hasEndpoint = Boolean(resolvedEndpoint);
  const effectiveProfile = { ...profile, endpoint: resolvedEndpoint };

  state.queueCount = await getQueueCount(accountId);
  emit();

  if (!navigator.onLine && !force) {
    state.lastError = "Offline. Sync paused.";
    emit();
    return false;
  }

  const queue = await getQueuedChanges(accountId);
  if (!queue.length) {
    state.lastError = "";
    state.lastSyncedAt = new Date().toISOString();
    emit();
    return true;
  }
  if (!hasEndpoint && !force) {
    state.lastError = "No Google Sheets endpoint configured. Add it in Settings > Google Sync Accounts.";
    emit();
    return false;
  }

  state.running = true;
  state.lastError = "";
  emit();
  let hadErrors = false;

  for (const change of queue) {
    try {
      if (!effectiveProfile.endpoint && !force) {
        throw new Error("Missing endpoint");
      }
      await sendQueuedChange(effectiveProfile, change);
      await markQueueSynced(change.queueId);
    } catch (error) {
      hadErrors = true;
      const attempts = Number(change.attempts || 0) + 1;
      await markQueueFailed(change.queueId, error?.message || "Sync request failed.", attempts);
      state.lastError = error?.message || "Sync request failed.";
    }
  }

  state.queueCount = await getQueueCount(accountId);
  state.running = false;
  state.lastSyncedAt = new Date().toISOString();
  emit();
  return !hadErrors;
}

export function initSyncEngine() {
  window.addEventListener("online", async () => {
    state.lastError = "";
    emit();
    await refreshQueueCount();
    await requestBackgroundSync();
    await syncNow();
  });

  window.addEventListener("offline", () => {
    state.lastError = "Offline. Changes are saved locally.";
    emit();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", async (event) => {
      if (event.data?.type === "TRIGGER_SYNC_FROM_SW") {
        await syncNow();
      }
    });
  }

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  heartbeatTimer = window.setInterval(async () => {
    await refreshQueueCount();
    if (navigator.onLine) {
      await syncNow();
    }
  }, SYNC.heartbeatMs);
}

export async function requeueDeadItems() {
  const profile = await getActiveProfile();
  await resetDeadQueueToPending(getAccountIdFromProfile(profile));
  await refreshQueueCount();
}

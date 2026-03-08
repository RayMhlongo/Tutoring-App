import { sanitizeObject, sanitizeText } from "./utils.js";
import { logError, logWarn } from "./logger.js";

const API_MAX_ATTEMPTS = 3;
const API_BASE_RETRY_MS = 650;

export function normalizeEndpoint(url) {
  const endpoint = sanitizeText(url, 1400);
  if (!endpoint) return "";
  if (!/^https:\/\/(script\.google\.com|script\.googleusercontent\.com)\//i.test(endpoint)) return "";
  return endpoint;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shouldRetryStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

async function postForm(endpoint, params) {
  const payload = new URLSearchParams(params);
  let lastError = null;

  for (let attempt = 1; attempt <= API_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: payload
      });
      if (!response.ok) {
        if (attempt < API_MAX_ATTEMPTS && shouldRetryStatus(response.status)) {
          logWarn("Transient API error, retrying", { endpoint, status: response.status, attempt });
          await sleep(API_BASE_RETRY_MS * Math.pow(2, attempt - 1));
          continue;
        }
        throw new Error(`Network error (${response.status})`);
      }
      const raw = await response.text();
      try {
        return JSON.parse(raw);
      } catch (parseError) {
        throw new Error("Invalid response from Google Apps Script.");
      }
    } catch (error) {
      lastError = error;
      if (attempt < API_MAX_ATTEMPTS) {
        logWarn("API request failed, retrying", { endpoint, attempt }, error);
        await sleep(API_BASE_RETRY_MS * Math.pow(2, attempt - 1));
        continue;
      }
      logError("API request failed", { endpoint, attempts: API_MAX_ATTEMPTS }, error);
    }
  }
  throw lastError || new Error("API request failed.");
}

export async function pingEndpoint(endpoint) {
  const safeEndpoint = normalizeEndpoint(endpoint);
  if (!safeEndpoint) {
    throw new Error("Please enter a valid Google Apps Script web app URL.");
  }
  const result = await postForm(safeEndpoint, {
    action: "ping",
    timestamp: String(Date.now())
  });
  if (!result?.ok) {
    throw new Error(result?.error || "Could not connect to endpoint.");
  }
  return result;
}

export async function sendQueuedChange(profile, change) {
  const endpoint = normalizeEndpoint(profile?.endpoint || "");
  if (!endpoint) {
    throw new Error("No endpoint configured for this profile.");
  }

  const sanitizedPayload = sanitizeObject(change.payload);
  const body = {
    action: "syncChange",
    changeId: sanitizeText(change.changeId, 140),
    tenantId: sanitizeText(change.tenantId || change.payload?.tenantId || profile?.tenantId || "", 120),
    accountId: sanitizeText(change.accountId, 120),
    table: sanitizeText(change.table, 80),
    op: sanitizeText(change.op, 24),
    recordId: sanitizeText(change.recordId, 120),
    payload: JSON.stringify(sanitizedPayload)
  };
  const result = await postForm(endpoint, body);
  if (!result?.ok) {
    throw new Error(result?.error || "Sync rejected by endpoint.");
  }
  return result;
}

export async function fetchRemoteSnapshot(profile) {
  const endpoint = normalizeEndpoint(profile?.endpoint || "");
  if (!endpoint) {
    throw new Error("No endpoint configured for this profile.");
  }
  const result = await postForm(endpoint, {
    action: "getAll",
    accountId: sanitizeText(profile.id, 120),
    tenantId: sanitizeText(profile.tenantId || profile.id, 120)
  });
  if (!result?.ok) {
    throw new Error(result?.error || "Failed to pull remote data.");
  }
  return result.data || {};
}

export async function exportSnapshotToGoogle(profile, snapshot) {
  const endpoint = normalizeEndpoint(profile?.endpoint || "");
  if (!endpoint) {
    throw new Error("No endpoint configured for this profile.");
  }
  const result = await postForm(endpoint, {
    action: "exportSnapshot",
    accountId: sanitizeText(profile.id, 120),
    tenantId: sanitizeText(profile.tenantId || profile.id, 120),
    payload: JSON.stringify(sanitizeObject(snapshot))
  });
  if (!result?.ok) {
    throw new Error(result?.error || "Snapshot export failed.");
  }
  return result;
}

export async function saveStudentQrToDrive(profile, payload) {
  const endpoint = normalizeEndpoint(profile?.endpoint || "");
  if (!endpoint) {
    throw new Error("No endpoint configured for this profile.");
  }
  const tenantId = sanitizeText(payload?.tenantId || profile?.tenantId || profile?.id || "", 120);
  const studentId = sanitizeText(payload?.studentId || "", 120);
  const dataUrl = sanitizeText(payload?.dataUrl || "", 600000);
  if (!tenantId || !studentId || !dataUrl) {
    throw new Error("tenantId, studentId, and dataUrl are required.");
  }
  const result = await postForm(endpoint, {
    action: "saveQr",
    tenantId,
    studentId,
    dataUrl
  });
  if (!result?.ok) {
    throw new Error(result?.error || "QR upload to Google Drive failed.");
  }
  return result;
}

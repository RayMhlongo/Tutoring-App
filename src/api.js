import { sanitizeObject, sanitizeText } from "./utils.js";

export function normalizeEndpoint(url) {
  const endpoint = sanitizeText(url, 1400);
  if (!endpoint) return "";
  if (!/^https:\/\/(script\.google\.com|script\.googleusercontent\.com)\//i.test(endpoint)) return "";
  return endpoint;
}

async function postForm(endpoint, params) {
  const payload = new URLSearchParams(params);
  const response = await fetch(endpoint, {
    method: "POST",
    body: payload
  });

  if (!response.ok) {
    throw new Error(`Network error (${response.status})`);
  }
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid response from Google Apps Script.");
  }
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
    accountId: sanitizeText(profile.id, 120)
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
    payload: JSON.stringify(sanitizeObject(snapshot))
  });
  if (!result?.ok) {
    throw new Error(result?.error || "Snapshot export failed.");
  }
  return result;
}

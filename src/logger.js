import { isoNow, sanitizeObject, sanitizeText, uid } from "./utils.js";

const STORAGE_KEY = "dataInsightsRuntimeLogs";
const MAX_LOGS = 300;

function safeReadLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteLogs(logs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
  } catch {
    // Ignore quota/private mode failures.
  }
}

function normalizeError(error) {
  if (!error) return "";
  if (typeof error === "string") return sanitizeText(error, 600);
  const message = sanitizeText(error.message || "", 400);
  const stack = sanitizeText(error.stack || "", 1200);
  return stack ? `${message} | ${stack}` : message;
}

function write(level, message, context = {}, error = null) {
  const entry = {
    id: uid("log"),
    level: sanitizeText(level || "info", 16).toLowerCase(),
    message: sanitizeText(message || "Runtime event", 300),
    error: normalizeError(error),
    context: sanitizeObject(context || {}),
    time: isoNow()
  };
  const logs = safeReadLogs();
  logs.push(entry);
  safeWriteLogs(logs);

  // eslint-disable-next-line no-console
  console[entry.level === "error" ? "error" : entry.level === "warn" ? "warn" : "log"](
    `[${entry.level}] ${entry.message}`,
    entry.context,
    entry.error
  );
  return entry;
}

export function logInfo(message, context = {}) {
  return write("info", message, context);
}

export function logWarn(message, context = {}, error = null) {
  return write("warn", message, context, error);
}

export function logError(message, context = {}, error = null) {
  return write("error", message, context, error);
}

export function getRecentLogs(limit = 50) {
  const logs = safeReadLogs();
  return logs.slice(Math.max(0, logs.length - Math.max(1, limit)));
}

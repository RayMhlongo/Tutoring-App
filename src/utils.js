const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
};

export function uid(prefix = "id") {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isoNow() {
  return new Date().toISOString();
}

export function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function sanitizeText(value, maxLength = 1000) {
  const raw = String(value ?? "").trim();
  const noControl = raw.replace(/[\u0000-\u001f\u007f]/g, " ");
  return noControl.replace(/\s+/g, " ").slice(0, maxLength);
}

export function sanitizeEmail(value) {
  const email = sanitizeText(value, 180).toLowerCase();
  if (!email) return "";
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return valid ? email : "";
}

export function sanitizePhone(value) {
  return sanitizeText(value, 32).replace(/[^\d+ -]/g, "");
}

export function sanitizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function sanitizeObject(value, depth = 0) {
  if (depth > 4) return null;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const out = {};
    Object.entries(value).forEach(([key, entry]) => {
      out[sanitizeText(key, 80)] = sanitizeObject(entry, depth + 1);
    });
    return out;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return sanitizeText(value, 3000);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (match) => HTML_ESCAPE_MAP[match]);
}

export function formatCurrency(value, currency = "ZAR") {
  try {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  } catch {
    return `R${Number(value || 0).toFixed(2)}`;
  }
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-ZA");
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleDateString("en-ZA")} ${date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
}

export function sumBy(records, selector) {
  return records.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
}

export function groupBy(records, selector) {
  return records.reduce((grouped, item) => {
    const key = selector(item);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
    return grouped;
  }, {});
}

export function toCSV(rows) {
  return rows
    .map((row) => row.map((cell) => {
      const value = String(cell ?? "");
      const escaped = value.replace(/"/g, '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    }).join(","))
    .join("\n");
}

export function downloadText(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function debounce(fn, wait = 220) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

export function monthKey(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return todayISODate().slice(0, 7);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

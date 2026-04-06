export function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function dateOnly(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function money(amount, currency = "ZAR") {
  const n = Number(amount || 0);
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(safe);
}

export function clampText(value, max = 120) {
  const text = String(value ?? "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

export function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function toCsv(headers, rows) {
  const csvEscape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
}

export function summarizeByStatus(rows, key = "status") {
  return rows.reduce((acc, row) => {
    const status = String(row?.[key] ?? "unknown").toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
}

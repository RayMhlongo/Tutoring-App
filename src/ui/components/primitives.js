export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function badge(status) {
  const safe = escapeHtml(status || "active");
  return `<span class="badge badge-${safe.toLowerCase()}">${safe}</span>`;
}

export function card(title, body, actions = "") {
  return `
    <section class="card">
      <header class="card-head">
        <h2>${escapeHtml(title)}</h2>
        <div class="card-actions">${actions}</div>
      </header>
      <div class="card-body">${body}</div>
    </section>
  `;
}

export function emptyState(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

export function field(label, name, value = "", type = "text", attrs = "") {
  const tag = type === "textarea"
    ? `<textarea class="input" name="${escapeHtml(name)}" ${attrs}>${escapeHtml(value)}</textarea>`
    : `<input class="input" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" ${attrs}>`;
  return `<label class="field"><span>${escapeHtml(label)}</span>${tag}</label>`;
}

export function selectField(label, name, options = [], selected = "") {
  const rows = options
    .map((opt) => {
      const value = typeof opt === "string" ? opt : opt.value;
      const text = typeof opt === "string" ? opt : opt.label;
      return `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(text)}</option>`;
    })
    .join("");
  return `<label class="field"><span>${escapeHtml(label)}</span><select class="input" name="${escapeHtml(name)}">${rows}</select></label>`;
}

export function table(headers, rows) {
  if (!rows.length) return emptyState("No records yet.");
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function toast(message, type = "info") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.className = `toast is-show ${type}`;
  window.clearTimeout(window.__toastTimer);
  window.__toastTimer = window.setTimeout(() => {
    el.className = "toast";
  }, 2600);
}
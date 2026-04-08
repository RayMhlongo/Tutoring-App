import { esc } from "../core/helpers.js";

export function mountError(message) {
  const panel = document.getElementById("bootError");
  const text = document.getElementById("bootErrorText");
  if (panel && text) {
    panel.hidden = false;
    text.textContent = message;
  }
}

export function toast(message) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = message;
  t.className = "toast show";
  clearTimeout(window.__toastTimeout);
  window.__toastTimeout = setTimeout(() => {
    t.className = "toast";
  }, 2600);
}

export function pageShell({ businessName, subtitle, online, navHtml, contentHtml }) {
  return `
    <header class="topbar">
      <div class="brand-wrap">
        <h1 class="brand-title">${esc(businessName)}</h1>
        <p class="brand-sub">${esc(subtitle)}</p>
      </div>
      <div class="top-actions">
        <span class="pill ${online ? "ok" : "warn"}">${online ? "Online" : "Offline"}</span>
      </div>
    </header>
    <div class="route-nav-wrap">
      <nav class="route-nav" aria-label="Primary" id="routeNav">
        ${navHtml}
      </nav>
    </div>
    <main class="page-body">${contentHtml}</main>
  `;
}

export function authView() {
  return `
    <div class="auth-wrap">
      <section class="surface auth-card">
        <h2>Access</h2>
        <p class="muted">Enter admin username</p>
        <form id="loginForm" class="form-grid one">
          <label class="field"><span>Username</span><input class="input" name="username" value="admin" required /></label>
          <button class="btn primary" type="submit">Unlock EduPulse</button>
        </form>
      </section>
    </div>
  `;
}

export function section(title, subtitle, body) {
  return `
    <section class="surface section">
      <div class="section-head">
        <h2>${esc(title)}</h2>
        ${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ""}
      </div>
      ${body}
    </section>
  `;
}

export function statGrid(items) {
  return `<div class="stat-grid">${items
    .map(
      (item) => `
      <article class="stat-card">
        <p class="stat-label">${esc(item.label)}</p>
        <p class="stat-value">${esc(item.value)}</p>
        ${item.hint ? `<p class="stat-hint">${esc(item.hint)}</p>` : ""}
      </article>`
    )
    .join("")}</div>`;
}

export function emptyState(message, actionText = "") {
  return `<div class="empty"><p>${esc(message)}</p>${actionText ? `<p class="muted">${esc(actionText)}</p>` : ""}</div>`;
}

export function table(headers, rows) {
  if (!rows.length) return emptyState("No records match your current filters.", "Adjust filters or add a new record.");
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${row.map((col) => `<td>${typeof col === "string" ? col : esc(col)}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function statusBadge(status) {
  const key = String(status || "unknown").toLowerCase();
  return `<span class="badge ${esc(key)}">${esc(status)}</span>`;
}

export function segmented(name, values, active) {
  return `<div class="segmented" role="tablist" id="${esc(name)}">${values
    .map(
      (value) =>
        `<button class="chip ${value === active ? "active" : ""}" type="button" data-seg="${esc(name)}" data-value="${esc(
          value
        )}">${esc(value)}</button>`
    )
    .join("")}</div>`;
}

export function modal(title, content, footer) {
  return `
    <dialog id="appModal" class="modal">
      <form method="dialog" class="modal-card">
        <header class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="btn ghost" value="cancel" type="submit">Close</button>
        </header>
        <div class="modal-content">${content}</div>
        ${footer ? `<footer class="modal-foot">${footer}</footer>` : ""}
      </form>
    </dialog>
  `;
}

import { card, field, table, emptyState, escapeHtml } from "./primitives.js";

export function renderCrudModule({
  title,
  description,
  formId,
  fields,
  records,
  columns,
  search = "",
  includeArchive = false,
  createLabel = "Save"
}) {
  const formFields = fields.join("");
  const body = `
    <p class="muted">${escapeHtml(description)}</p>
    <form id="${formId}" class="form-grid">${formFields}<button class="btn" type="submit">${escapeHtml(createLabel)}</button></form>
    <div class="toolbar">
      <label class="field field-inline"><span>Search</span><input id="${formId}_search" class="input" value="${escapeHtml(search)}" placeholder="Search ${escapeHtml(title.toLowerCase())}"></label>
      <label class="switch"><input id="${formId}_archived" type="checkbox" ${includeArchive ? "checked" : ""}> Show archived</label>
    </div>
    ${records.length ? table(columns, records) : emptyState(`No ${title.toLowerCase()} added yet.`)}
  `;
  return card(title, body);
}

export function bindCrudModule({ root, formId, onSubmit, onSearchChange, onArchiveToggle, onArchiveClick }) {
  root.querySelector(`#${formId}`)?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    await onSubmit(payload);
    event.currentTarget.reset();
  });

  root.querySelector(`#${formId}_search`)?.addEventListener("input", (event) => {
    onSearchChange(event.target.value);
  });

  root.querySelector(`#${formId}_archived`)?.addEventListener("change", (event) => {
    onArchiveToggle(Boolean(event.target.checked));
  });

  root.querySelectorAll("[data-archive-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await onArchiveClick(button.dataset.archiveId);
    });
  });
}

export { field, selectField };

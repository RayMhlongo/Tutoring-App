import { tutorsRepo } from "../../data/repos/index.js";
import { renderCrudModule, bindCrudModule, field } from "../../ui/components/crudView.js";
import { escapeHtml, toast } from "../../ui/components/primitives.js";
import { getState, updateFilter } from "../../app/store.js";

const KEY = "tutors";

export async function renderTutors() {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false };
  const rows = filter.search ? await tutorsRepo.search(filter.search) : await tutorsRepo.list({ includeArchived: filter.includeArchived });
  const tableRows = rows.map((t) => [
    `${escapeHtml(t.firstName)} ${escapeHtml(t.surname)}`,
    escapeHtml(t.subjects || ""),
    escapeHtml(t.contactNumber || ""),
    escapeHtml(t.availability || ""),
    t.archivedAt ? "Archived" : `<button class="btn btn-xs" data-archive-id="${escapeHtml(t.id)}">Archive</button>`
  ]);

  return renderCrudModule({
    title: "Tutors",
    description: "Manage tutor profiles, subjects, availability, and contact details.",
    formId: "tutorsForm",
    fields: [
      field("First name", "firstName", "", "text", "required"),
      field("Surname", "surname", "", "text", "required"),
      field("Subjects", "subjects"),
      field("Contact", "contactNumber"),
      field("Availability", "availability"),
      field("Notes", "notes", "", "textarea")
    ],
    records: tableRows,
    columns: ["Tutor", "Subjects", "Contact", "Availability", "Actions"],
    search: filter.search,
    includeArchive: filter.includeArchived,
    createLabel: "Add tutor"
  });
}

export function bindTutors(root, rerender) {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false };
  bindCrudModule({
    root,
    formId: "tutorsForm",
    onSubmit: async (payload) => {
      try {
        await tutorsRepo.create(payload);
        toast("Tutor added.", "success");
      } catch (error) {
        toast(error.message, "error");
      }
      await rerender();
    },
    onSearchChange: (search) => {
      updateFilter(KEY, { ...filter, search });
      rerender();
    },
    onArchiveToggle: (includeArchived) => {
      updateFilter(KEY, { ...filter, includeArchived });
      rerender();
    },
    onArchiveClick: async (id) => {
      await tutorsRepo.archive(id);
      toast("Tutor archived.", "info");
      await rerender();
    }
  });
}
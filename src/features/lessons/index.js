import { lessonsRepo } from "../../data/repos/index.js";
import { renderCrudModule, bindCrudModule, field, selectField } from "../../ui/components/crudView.js";
import { escapeHtml, toast } from "../../ui/components/primitives.js";
import { getState, updateFilter } from "../../app/store.js";

const KEY = "lessons";

export async function renderLessons() {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false };
  const rows = filter.search ? await lessonsRepo.search(filter.search) : await lessonsRepo.list({ includeArchived: filter.includeArchived });
  const tableRows = rows.map((l) => [
    escapeHtml(l.date || ""),
    escapeHtml(l.subject || ""),
    escapeHtml(l.studentId || ""),
    escapeHtml(l.tutorId || ""),
    escapeHtml(String(l.durationMinutes || 0)),
    escapeHtml(l.status || "planned"),
    l.archivedAt ? "Archived" : `<button class="btn btn-xs" data-archive-id="${escapeHtml(l.id)}">Archive</button>`
  ]);

  return renderCrudModule({
    title: "Lessons",
    description: "Capture lesson outcomes, homework, and status.",
    formId: "lessonsForm",
    fields: [
      field("Date", "date", "", "date", "required"),
      field("Subject", "subject", "", "text", "required"),
      field("Student ID", "studentId", "", "text", "required"),
      field("Tutor ID", "tutorId", "", "text", "required"),
      field("Start", "startTime", "", "time"),
      field("End", "endTime", "", "time"),
      field("Duration (mins)", "durationMinutes", "60", "number"),
      field("Lesson type", "lessonType"),
      field("Outcome", "outcome"),
      field("Homework", "homework", "", "textarea"),
      field("Notes", "notes", "", "textarea"),
      selectField("Status", "status", ["planned", "completed", "missed", "cancelled"], "planned")
    ],
    records: tableRows,
    columns: ["Date", "Subject", "Student", "Tutor", "Mins", "Status", "Actions"],
    search: filter.search,
    includeArchive: filter.includeArchived,
    createLabel: "Add lesson"
  });
}

export function bindLessons(root, rerender) {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false };
  bindCrudModule({
    root,
    formId: "lessonsForm",
    onSubmit: async (payload) => {
      try {
        await lessonsRepo.create(payload);
        toast("Lesson added.", "success");
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
      await lessonsRepo.archive(id);
      toast("Lesson archived.", "info");
      await rerender();
    }
  });
}
import { attendanceRepo } from "../../data/repos/index.js";
import { renderCrudModule, bindCrudModule, field, selectField } from "../../ui/components/crudView.js";
import { escapeHtml, toast, card } from "../../ui/components/primitives.js";
import { getState, updateFilter } from "../../app/store.js";
import { parseStudentQrPayload, startQrScanner } from "../../integrations/qr/qr.js";

const KEY = "attendance";

export async function renderAttendance() {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false };
  const rows = filter.search ? await attendanceRepo.search(filter.search) : await attendanceRepo.list({ includeArchived: filter.includeArchived });
  const tableRows = rows.map((a) => [
    escapeHtml(a.date || ""),
    escapeHtml(a.studentId || ""),
    escapeHtml(a.tutorId || ""),
    escapeHtml(a.lessonId || ""),
    escapeHtml(a.status || "present"),
    a.archivedAt ? "Archived" : `<button class="btn btn-xs" data-archive-id="${escapeHtml(a.id)}">Archive</button>`
  ]);

  const main = renderCrudModule({
    title: "Attendance",
    description: "Mark attendance quickly or scan a student QR code.",
    formId: "attendanceForm",
    fields: [
      field("Date", "date", "", "date", "required"),
      field("Student ID", "studentId", "", "text", "required"),
      field("Tutor ID", "tutorId"),
      field("Lesson ID", "lessonId"),
      selectField("Status", "status", ["present", "late", "absent", "excused"], "present"),
      field("Note", "note", "", "textarea")
    ],
    records: tableRows,
    columns: ["Date", "Student", "Tutor", "Lesson", "Status", "Actions"],
    search: filter.search,
    includeArchive: filter.includeArchived,
    createLabel: "Mark attendance"
  });

  const qr = card(
    "QR Check-in",
    `
      <p class="muted">Use QR check-in for quick attendance capture.</p>
      <div class="toolbar">
        <button id="startQrBtn" class="btn" type="button">Start scanner</button>
        <button id="stopQrBtn" class="btn btn-ghost" type="button" disabled>Stop scanner</button>
      </div>
      <div id="qrReader" class="scanner"></div>
      <p id="qrStatus" class="muted">Scanner idle.</p>
    `
  );

  return `${main}${qr}`;
}

export function bindAttendance(root, rerender) {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false };
  let scanner = null;
  bindCrudModule({
    root,
    formId: "attendanceForm",
    onSubmit: async (payload) => {
      try {
        await attendanceRepo.create(payload);
        toast("Attendance saved.", "success");
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
      await attendanceRepo.archive(id);
      toast("Attendance archived.", "info");
      await rerender();
    }
  });

  const startBtn = root.querySelector("#startQrBtn");
  const stopBtn = root.querySelector("#stopQrBtn");
  const status = root.querySelector("#qrStatus");

  startBtn?.addEventListener("click", async () => {
    try {
      scanner = await startQrScanner("qrReader", async (text, activeScanner) => {
        const studentId = parseStudentQrPayload(text);
        if (!studentId) return;
        await attendanceRepo.create({ date: new Date().toISOString().slice(0, 10), studentId, status: "present" });
        status.textContent = `Checked in: ${studentId}`;
        toast(`Checked in ${studentId}.`, "success");
        await activeScanner.stop();
        stopBtn.disabled = true;
        startBtn.disabled = false;
        await rerender();
      });
      status.textContent = "Scanner running...";
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } catch (error) {
      toast(error.message, "error");
    }
  });

  stopBtn?.addEventListener("click", async () => {
    if (!scanner) return;
    await scanner.stop();
    scanner = null;
    status.textContent = "Scanner stopped.";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });
}
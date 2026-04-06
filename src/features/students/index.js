import { attendanceRepo, lessonsRepo, paymentsRepo, studentsRepo } from "../../data/repos/index.js";
import { renderCrudModule, bindCrudModule, field } from "../../ui/components/crudView.js";
import { escapeHtml, toast, card, table, emptyState } from "../../ui/components/primitives.js";
import { getState, updateFilter } from "../../app/store.js";
import { formatCurrency } from "../../utils/common.js";
import { getSettings } from "../../data/db/client.js";

const KEY = "students";

function timelineRows(rows, keys) {
  return rows.map((row) => keys.map((k) => escapeHtml(row[k] || "")));
}

function joinSubjects(subjects) {
  return Array.isArray(subjects) ? subjects.join(", ") : String(subjects || "");
}

function parseSubjects(raw) {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(",");
}

export async function renderStudents() {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false, selectedId: "", profileEdit: false };
  const rows = filter.search ? await studentsRepo.search(filter.search) : await studentsRepo.list({ includeArchived: filter.includeArchived });
  const settings = await getSettings();

  const tableRows = rows.map((s) => [
    `${escapeHtml(s.firstName)} ${escapeHtml(s.surname)}`,
    escapeHtml(s.grade || ""),
    escapeHtml(s.school || ""),
    escapeHtml(joinSubjects(s.subjects)),
    escapeHtml(s.contactNumber || ""),
    `<button class="btn btn-xs" data-view-id="${escapeHtml(s.id)}">View</button> ${s.archivedAt ? "Archived" : `<button class="btn btn-xs" data-archive-id="${escapeHtml(s.id)}">Archive</button>`}`
  ]);

  let profileCard = "";
  if (filter.selectedId) {
    const student = await studentsRepo.getById(filter.selectedId);
    if (student) {
      const [lessons, attendance, payments] = await Promise.all([
        lessonsRepo.list(),
        attendanceRepo.list(),
        paymentsRepo.list()
      ]);

      const studentLessons = lessons.filter((item) => item.studentId === student.id).slice(0, 10);
      const studentAttendance = attendance.filter((item) => item.studentId === student.id).slice(0, 10);
      const studentPayments = payments.filter((item) => item.studentId === student.id).slice(0, 10);
      const totalDue = studentPayments.reduce((sum, item) => sum + Number(item.amountDue || 0), 0);
      const totalPaid = studentPayments.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
      const balance = totalDue - totalPaid;

      const profileSection = filter.profileEdit
        ? `
          <h3>Edit Profile</h3>
          <form id="studentProfileEditForm" class="form-grid">
            <input type="hidden" name="id" value="${escapeHtml(student.id)}">
            <label class="field"><span>First name</span><input class="input" name="firstName" value="${escapeHtml(student.firstName || "")}" required></label>
            <label class="field"><span>Surname</span><input class="input" name="surname" value="${escapeHtml(student.surname || "")}" required></label>
            <label class="field"><span>Grade</span><input class="input" name="grade" value="${escapeHtml(student.grade || "")}"></label>
            <label class="field"><span>School</span><input class="input" name="school" value="${escapeHtml(student.school || "")}"></label>
            <label class="field"><span>Subjects (comma separated)</span><input class="input" name="subjects" value="${escapeHtml(joinSubjects(student.subjects))}"></label>
            <label class="field"><span>Guardian</span><input class="input" name="guardianName" value="${escapeHtml(student.guardianName || "")}"></label>
            <label class="field"><span>Contact</span><input class="input" name="contactNumber" value="${escapeHtml(student.contactNumber || "")}"></label>
            <label class="field"><span>Notes</span><textarea class="input" name="notes">${escapeHtml(student.notes || "")}</textarea></label>
            <div class="toolbar">
              <button class="btn" type="submit">Save profile</button>
              <button id="cancelStudentProfileEditBtn" class="btn btn-ghost" type="button">Cancel</button>
            </div>
          </form>
        `
        : `
          <h3>Profile</h3>
          <p><strong>Grade:</strong> ${escapeHtml(student.grade || "-")}</p>
          <p><strong>School:</strong> ${escapeHtml(student.school || "-")}</p>
          <p><strong>Subjects:</strong> ${escapeHtml(joinSubjects(student.subjects) || "-")}</p>
          <p><strong>Guardian:</strong> ${escapeHtml(student.guardianName || "-")}</p>
          <p><strong>Contact:</strong> ${escapeHtml(student.contactNumber || "-")}</p>
          <p><strong>Notes:</strong> ${escapeHtml(student.notes || "-")}</p>
          <div class="toolbar">
            <button id="editStudentProfileBtn" class="btn btn-ghost" type="button">Edit profile</button>
            <span class="pill">Due: ${formatCurrency(totalDue, settings.currency)}</span>
            <span class="pill">Paid: ${formatCurrency(totalPaid, settings.currency)}</span>
            <span class="pill ${balance > 0 ? "warn" : "ok"}">Balance: ${formatCurrency(balance, settings.currency)}</span>
          </div>
        `;

      profileCard = card(
        `Student Profile: ${student.firstName} ${student.surname}`,
        `
          <div class="profile-grid">
            <section class="profile-pane">${profileSection}</section>
            <section class="profile-pane">
              <h3>Lesson History</h3>
              ${studentLessons.length ? table(["Date", "Subject", "Outcome", "Status"], timelineRows(studentLessons, ["date", "subject", "outcome", "status"])) : emptyState("No lessons logged.")}
            </section>
            <section class="profile-pane">
              <h3>Attendance History</h3>
              ${studentAttendance.length ? table(["Date", "Status", "Tutor", "Lesson"], timelineRows(studentAttendance, ["date", "status", "tutorId", "lessonId"])) : emptyState("No attendance logs.")}
            </section>
            <section class="profile-pane">
              <h3>Payment History</h3>
              ${studentPayments.length ? table(["Date", "Due", "Paid", "Status"], studentPayments.map((p) => [escapeHtml(p.date || ""), formatCurrency(p.amountDue, settings.currency), formatCurrency(p.amountPaid, settings.currency), escapeHtml(p.status || "")])) : emptyState("No payments logged.")}
            </section>
          </div>
        `,
        `<button id="closeStudentProfileBtn" class="btn btn-ghost" type="button">Close</button>`
      );
    }
  }

  return `${renderCrudModule({
    title: "Students",
    description: "Manage student profiles, guardian info, notes, and archives.",
    formId: "studentsForm",
    fields: [
      field("First name", "firstName", "", "text", "required"),
      field("Surname", "surname", "", "text", "required"),
      field("Grade", "grade"),
      field("School", "school"),
      field("Subjects (comma separated)", "subjects"),
      field("Guardian", "guardianName"),
      field("Contact", "contactNumber"),
      field("Notes", "notes", "", "textarea")
    ],
    records: tableRows,
    columns: ["Student", "Grade", "School", "Subjects", "Contact", "Actions"],
    search: filter.search,
    includeArchive: filter.includeArchived,
    createLabel: "Add student"
  })}${profileCard}`;
}

export function bindStudents(root, rerender) {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false, selectedId: "", profileEdit: false };

  root.querySelectorAll("[data-view-id]").forEach((button) => {
    button.addEventListener("click", () => {
      updateFilter(KEY, { ...filter, selectedId: button.dataset.viewId || "", profileEdit: false });
      rerender();
    });
  });

  root.querySelector("#closeStudentProfileBtn")?.addEventListener("click", () => {
    updateFilter(KEY, { ...filter, selectedId: "", profileEdit: false });
    rerender();
  });

  root.querySelector("#editStudentProfileBtn")?.addEventListener("click", () => {
    updateFilter(KEY, { ...filter, profileEdit: true });
    rerender();
  });

  root.querySelector("#cancelStudentProfileEditBtn")?.addEventListener("click", () => {
    updateFilter(KEY, { ...filter, profileEdit: false });
    rerender();
  });

  root.querySelector("#studentProfileEditForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = String(form.get("id") || "");
    if (!id) return;
    try {
      const current = await studentsRepo.getById(id);
      if (!current) throw new Error("Student not found.");
      await studentsRepo.update(id, {
        ...current,
        firstName: String(form.get("firstName") || ""),
        surname: String(form.get("surname") || ""),
        grade: String(form.get("grade") || ""),
        school: String(form.get("school") || ""),
        subjects: parseSubjects(form.get("subjects")),
        guardianName: String(form.get("guardianName") || ""),
        contactNumber: String(form.get("contactNumber") || ""),
        notes: String(form.get("notes") || "")
      });
      toast("Student profile updated.", "success");
      updateFilter(KEY, { ...filter, profileEdit: false });
      await rerender();
    } catch (error) {
      toast(error.message || "Profile update failed.", "error");
    }
  });

  bindCrudModule({
    root,
    formId: "studentsForm",
    onSubmit: async (payload) => {
      try {
        await studentsRepo.create(payload);
        toast("Student added.", "success");
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
      await studentsRepo.archive(id);
      toast("Student archived.", "info");
      await rerender();
    }
  });
}
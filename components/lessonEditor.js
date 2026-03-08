import { formatDate } from "../src/utils.js";
import { escapeHtml, renderMaybe } from "../src/view-utils.js";

export function lessonEditorTemplate(data) {
  const lessons = data.lessons || [];
  const students = data.students || [];
  const tutors = data.tutors || [];
  const subjects = data.subjects || [];
  const lessonCategories = data.lessonCategories || [];
  const defaultDuration = data.defaultDuration || 60;
  const prefillStudentId = data.prefillStudentId || "";
  const prefillContext = data.prefillContext || null;
  const studentNameById = data.studentNameById || {};

  return `
    <section class="view" data-view-root="lessons">
      <article class="card">
        <div class="card-title-row">
          <h2>Lesson Tracking</h2>
        </div>
        ${prefillContext ? `<p class="help-text">QR check-in loaded ${escapeHtml(prefillContext.studentName || prefillContext.studentId)}. Scheduled lesson details were prefilled.</p>` : ""}
        <form id="lessonForm" class="grid">
          <div class="split-3">
            <div class="field">
              <label for="lessonDate">Date</label>
              <input id="lessonDate" class="input" name="date" type="date" required>
            </div>
            <div class="field">
              <label for="lessonStudent">Student</label>
              <select id="lessonStudent" class="select" name="studentId" required>
                <option value="">Choose student</option>
                ${students.map((student) => `
                  <option value="${escapeHtml(student.id)}" ${prefillStudentId === student.id ? "selected" : ""}>
                    ${escapeHtml(student.firstName)} ${escapeHtml(student.surname)}
                  </option>
                `).join("")}
              </select>
            </div>
            <div class="field">
              <label for="lessonSubject">Subject</label>
              <select id="lessonSubject" class="select" name="subject" required>
                ${subjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="split-3">
            <div class="field">
              <label for="lessonTutor">Tutor</label>
              <select id="lessonTutor" class="select" name="tutorId">
                <option value="">Unassigned</option>
                ${tutors.map((tutor) => `<option value="${escapeHtml(tutor.id)}">${escapeHtml(tutor.firstName || "")} ${escapeHtml(tutor.surname || "")}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="lessonCategory">Lesson Category</label>
              <select id="lessonCategory" class="select" name="category">
                ${lessonCategories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="lessonDuration">Duration (minutes)</label>
              <input id="lessonDuration" class="input" name="durationMinutes" type="number" min="15" step="5" value="${escapeHtml(String(defaultDuration))}">
            </div>
          </div>
          <div class="field">
            <label for="lessonNotes">Lesson Notes</label>
            <textarea id="lessonNotes" class="textarea" name="lessonNotes" placeholder="What was covered?"></textarea>
          </div>
          <div class="field">
            <label for="lessonHomework">Homework Assigned</label>
            <textarea id="lessonHomework" class="textarea" name="homeworkAssigned"></textarea>
          </div>
          <div class="field">
            <label for="lessonProgress">Progress Summary</label>
            <textarea id="lessonProgress" class="textarea" name="progressSummary"></textarea>
          </div>
          <label class="field">
            <span>Homework Completed?</span>
            <select id="lessonHomeworkCompleted" class="select" name="homeworkCompleted">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
          <div class="action-row">
            <button class="btn btn-primary" type="submit">Save Lesson</button>
          </div>
        </form>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Lesson History</h3>
          <span class="badge badge-warning">${lessons.length} entries</span>
        </div>
        <div class="list">
          ${renderMaybe(lessons.length > 0, lessons.map((lesson) => `
            <div class="list-item">
              <div class="list-item-main">
                <div class="list-item-title">${formatDate(lesson.date)} | ${escapeHtml(lesson.subject || "General")}</div>
                <div class="list-item-sub">Student: ${escapeHtml(studentNameById[lesson.studentId] || lesson.studentName || lesson.studentId || "")} | Tutor: ${escapeHtml(lesson.tutorName || lesson.tutorId || "Unassigned")} | ${escapeHtml(String(lesson.durationMinutes || 0))} mins</div>
              </div>
              <div class="action-row">
                <button class="btn btn-outline btn-small" data-action="lesson-pdf" data-lesson-id="${escapeHtml(lesson.id)}" type="button">PDF</button>
                <button class="btn btn-outline btn-small" data-action="lesson-share" data-lesson-id="${escapeHtml(lesson.id)}" type="button">Share</button>
              </div>
            </div>
          `).join(""), `<div class="empty-state">No lesson records yet.</div>`)}
        </div>
      </article>
    </section>
  `;
}

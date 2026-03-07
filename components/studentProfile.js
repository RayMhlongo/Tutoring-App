import { escapeHtml, renderMaybe } from "../src/view-utils.js";

function customFieldInput(field) {
  if (field.type === "textarea") {
    return `
      <div class="field">
        <label for="studentCustom_${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
        <textarea id="studentCustom_${escapeHtml(field.key)}" class="textarea" name="custom_${escapeHtml(field.key)}"></textarea>
      </div>
    `;
  }
  return `
    <div class="field">
      <label for="studentCustom_${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
      <input id="studentCustom_${escapeHtml(field.key)}" class="input" name="custom_${escapeHtml(field.key)}" type="text">
    </div>
  `;
}

export function studentManagementTemplate(data) {
  const students = data.students || [];
  const grades = data.grades || [];
  const subjects = data.subjects || [];
  const customFields = data.customFields || [];
  const searchQuery = data.searchQuery || "";

  return `
    <section class="view" data-view-root="students">
      <article class="card">
        <div class="card-title-row">
          <h2>Student Registration</h2>
          <button class="btn btn-secondary btn-small" id="btnOpenScanner" type="button">Scan Student</button>
        </div>
        <form id="studentForm" class="grid">
          <div class="split-2">
            <div class="field">
              <label for="studentFirstName">First Name</label>
              <input id="studentFirstName" class="input" name="firstName" type="text" required>
            </div>
            <div class="field">
              <label for="studentSurname">Surname</label>
              <input id="studentSurname" class="input" name="surname" type="text" required>
            </div>
          </div>
          <div class="split-3">
            <div class="field">
              <label for="studentGrade">Grade</label>
              <select id="studentGrade" class="select" name="grade" required>
                ${grades.map((grade) => `<option value="${escapeHtml(grade)}">${escapeHtml(grade)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="studentSubjectPrimary">Primary Subject</label>
              <select id="studentSubjectPrimary" class="select" name="subjectPrimary">
                <option value="">Choose</option>
                ${subjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="studentSubjectSecondary">Secondary Subject</label>
              <select id="studentSubjectSecondary" class="select" name="subjectSecondary">
                <option value="">None</option>
                ${subjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("")}
              </select>
            </div>
          </div>
          ${customFields.map(customFieldInput).join("")}
          <div class="field">
            <label for="studentNotes">Notes</label>
            <textarea id="studentNotes" class="textarea" name="notes" placeholder="Additional context, goals, or support notes"></textarea>
          </div>
          <div class="action-row">
            <button class="btn btn-primary" type="submit">Save Student</button>
            <button class="btn btn-outline" type="reset">Clear</button>
          </div>
        </form>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Students</h3>
          <span class="badge badge-warning">${students.length} total</span>
        </div>
        <div class="field">
          <label for="studentSearch">Search students</label>
          <input id="studentSearch" class="input" type="search" value="${escapeHtml(searchQuery)}" placeholder="Type name, grade, or surname">
        </div>
        <div class="list" id="studentList">
          ${renderMaybe(students.length > 0, students.map((student) => `
            <article class="list-item" data-student-id="${escapeHtml(student.id)}">
              <div class="list-item-main">
                <div class="list-item-title">${escapeHtml(student.firstName)} ${escapeHtml(student.surname)}</div>
                <div class="list-item-sub">${escapeHtml(student.grade)} • ${escapeHtml((student.subjects || []).join(", ") || "No subject selected")}</div>
              </div>
              <div class="action-row">
                <button class="btn btn-outline btn-small" data-action="open-profile" data-student-id="${escapeHtml(student.id)}" type="button">Profile</button>
                <button class="btn btn-accent btn-small" data-action="open-qr" data-student-id="${escapeHtml(student.id)}" type="button">QR</button>
              </div>
            </article>
          `).join(""), `<div class="empty-state">No students yet. Add your first student above.</div>`)}
        </div>
      </article>
    </section>
  `;
}

export function studentProfileModalTemplate(profile) {
  const student = profile.student;
  const customFields = student.customFields || {};
  return `
    <section class="modal">
      <div class="card-title-row">
        <h2>${escapeHtml(student.firstName)} ${escapeHtml(student.surname)}</h2>
        <button class="btn btn-outline btn-small" data-modal-close type="button">Close</button>
      </div>
      <p class="help-text">${escapeHtml(student.grade)} • ID: ${escapeHtml(student.id)}</p>
      <hr class="hr">
      <div class="grid">
        <div>
          <h3>Profile</h3>
          <div class="list">
            ${Object.entries(customFields).map(([key, value]) => `
              <div class="list-item">
                <div class="list-item-main">
                  <div class="list-item-title">${escapeHtml(key)}</div>
                  <div class="list-item-sub">${escapeHtml(value || "-")}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
        <div>
          <h3>Lesson History (${profile.lessons.length})</h3>
          <div class="list">
            ${renderMaybe(profile.lessons.length > 0, profile.lessons.slice(0, 8).map((lesson) => `
              <div class="list-item">
                <div class="list-item-main">
                  <div class="list-item-title">${escapeHtml(lesson.subject || "General")} • ${escapeHtml(lesson.date || "")}</div>
                  <div class="list-item-sub">${escapeHtml(lesson.progressSummary || lesson.lessonNotes || "-")}</div>
                </div>
              </div>
            `).join(""), `<div class="empty-state">No lessons recorded yet.</div>`)}
          </div>
        </div>
        <div>
          <h3>Attendance (${profile.attendance.length})</h3>
          <div class="list">
            ${renderMaybe(profile.attendance.length > 0, profile.attendance.slice(0, 8).map((entry) => `
              <div class="list-item">
                <div class="list-item-main">
                  <div class="list-item-title">${escapeHtml(entry.date || "")}</div>
                  <div class="list-item-sub">${escapeHtml(entry.time || "")} via ${escapeHtml(entry.checkInMethod || "manual")}</div>
                </div>
              </div>
            `).join(""), `<div class="empty-state">No attendance data available.</div>`)}
          </div>
        </div>
      </div>
    </section>
  `;
}

export function studentQrModalTemplate(student) {
  return `
    <section class="modal">
      <div class="card-title-row">
        <h2>${escapeHtml(student.firstName)} ${escapeHtml(student.surname)} QR</h2>
        <button class="btn btn-outline btn-small" data-modal-close type="button">Close</button>
      </div>
      <div class="qr-wrap">
        <div class="qr-canvas-wrap">
          <canvas id="studentQrCanvas" width="240" height="240" aria-label="Student QR code"></canvas>
        </div>
        <p class="help-text">Student ID: ${escapeHtml(student.id)}</p>
        <p class="help-text">QR value: ${escapeHtml(student.qrValue || "")}</p>
        <div class="action-row">
          <button class="btn btn-primary btn-small" id="downloadQrBtn" type="button">Download</button>
          <button class="btn btn-secondary btn-small" id="printQrBtn" type="button">Print</button>
        </div>
      </div>
    </section>
  `;
}

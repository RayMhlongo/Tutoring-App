import { escapeHtml, renderMaybe } from "../src/view-utils.js";

export function tutorManagementTemplate(data) {
  const tutors = data.tutors || [];
  const subjects = data.subjects || [];

  return `
    <section class="view" data-view-root="tutors">
      <article class="card">
        <div class="card-title-row">
          <h2>Tutor Management</h2>
          <span class="badge badge-warning">${tutors.length} tutors</span>
        </div>
        <form id="tutorForm" class="grid">
          <div class="split-3">
            <div class="field">
              <label for="tutorFirstName">First Name</label>
              <input id="tutorFirstName" class="input" name="firstName" type="text" required>
            </div>
            <div class="field">
              <label for="tutorSurname">Surname</label>
              <input id="tutorSurname" class="input" name="surname" type="text" required>
            </div>
            <div class="field">
              <label for="tutorEmail">Email</label>
              <input id="tutorEmail" class="input" name="email" type="email">
            </div>
          </div>
          <div class="split-3">
            <div class="field">
              <label for="tutorSubjectPrimary">Primary Subject</label>
              <select id="tutorSubjectPrimary" class="select" name="subjectPrimary">
                <option value="">Choose</option>
                ${subjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="tutorSubjectSecondary">Secondary Subject</label>
              <select id="tutorSubjectSecondary" class="select" name="subjectSecondary">
                <option value="">None</option>
                ${subjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="tutorRating">Rating (0-5)</label>
              <input id="tutorRating" class="input" name="rating" type="number" min="0" max="5" step="0.1" value="0">
            </div>
          </div>
          <div class="field">
            <label for="tutorNotes">Notes</label>
            <textarea id="tutorNotes" class="textarea" name="notes"></textarea>
          </div>
          <div class="action-row">
            <button class="btn btn-primary" type="submit">Save Tutor</button>
          </div>
        </form>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Tutors</h3>
        </div>
        <div class="list">
          ${renderMaybe(tutors.length > 0, tutors.map((tutor) => `
            <div class="list-item">
              <div class="list-item-main">
                <div class="list-item-title">${escapeHtml(tutor.firstName || "")} ${escapeHtml(tutor.surname || "")}</div>
                <div class="list-item-sub">${escapeHtml((tutor.subjects || []).join(", ") || "No subjects set")} | ${escapeHtml(tutor.email || "No email")}</div>
              </div>
              <span class="badge badge-success">${Number(tutor.rating || 0).toFixed(1)}</span>
            </div>
          `).join(""), `<div class="empty-state">No tutors yet.</div>`)}
        </div>
      </article>
    </section>
  `;
}

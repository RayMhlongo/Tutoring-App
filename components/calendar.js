import { formatDate } from "../src/utils.js";
import { escapeHtml, renderMaybe } from "../src/view-utils.js";

function renderScheduleFields(fields) {
  return fields.map((field) => `
    <div class="field">
      <label for="scheduleCustom_${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
      ${field.type === "textarea"
        ? `<textarea id="scheduleCustom_${escapeHtml(field.key)}" class="textarea" name="custom_${escapeHtml(field.key)}"></textarea>`
        : `<input id="scheduleCustom_${escapeHtml(field.key)}" class="input" name="custom_${escapeHtml(field.key)}" type="text">`}
    </div>
  `).join("");
}

function renderDayView(entries) {
  return `
    <div class="list">
      ${renderMaybe(entries.length > 0, entries.map((entry) => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${escapeHtml(entry.timeStart || "")} - ${escapeHtml(entry.timeEnd || "")} | ${escapeHtml(entry.subject || "")}</div>
            <div class="list-item-sub">${escapeHtml(entry.studentId || "")} | ${escapeHtml(entry.category || "")}</div>
          </div>
        </div>
      `).join(""), `<div class="empty-state">No schedule items for selected day.</div>`)}
    </div>
  `;
}

function renderWeekView(weekDays, entries) {
  const byDate = entries.reduce((acc, entry) => {
    const key = entry.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  return `
    <div class="split-3">
      ${weekDays.map((date) => `
        <article class="card">
          <h3>${formatDate(date)}</h3>
          <div class="list">
            ${renderMaybe((byDate[date] || []).length > 0, (byDate[date] || []).map((entry) => `
              <div class="list-item">
                <div class="list-item-main">
                  <div class="list-item-title">${escapeHtml(entry.timeStart || "")} ${escapeHtml(entry.subject || "")}</div>
                  <div class="list-item-sub">${escapeHtml(entry.studentId || "")}</div>
                </div>
              </div>
            `).join(""), `<div class="empty-state">No lessons</div>`)}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderMonthView(monthGrid, entriesByDate) {
  return `
    <div class="grid cols-3">
      ${monthGrid.map((cell) => `
        <article class="card">
          <div class="card-title-row">
            <h3>${cell.dayNumber}</h3>
            <span class="badge badge-warning">${(entriesByDate[cell.date] || []).length}</span>
          </div>
          <div class="list">
            ${(entriesByDate[cell.date] || []).slice(0, 3).map((entry) => `
              <div class="list-item">
                <div class="list-item-main">
                  <div class="list-item-title">${escapeHtml(entry.timeStart || "")}</div>
                  <div class="list-item-sub">${escapeHtml(entry.studentId || "")}</div>
                </div>
              </div>
            `).join("") || `<div class="empty-state">No lessons</div>`}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

export function calendarTemplate(data) {
  const {
    dateAnchor,
    viewMode,
    students,
    subjects,
    lessonCategories,
    scheduleFields,
    entries,
    weekDays,
    monthGrid
  } = data;
  const entriesByDate = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  const visibleContent = viewMode === "day"
    ? renderDayView(entries.filter((entry) => entry.date === dateAnchor))
    : viewMode === "week"
      ? renderWeekView(weekDays, entries)
      : renderMonthView(monthGrid, entriesByDate);

  return `
    <section class="view" data-view-root="schedule">
      <article class="card">
        <div class="card-title-row">
          <h2>Weekly Calendar Scheduler</h2>
        </div>
        <form id="scheduleForm" class="grid">
          <div class="split-3">
            <div class="field">
              <label for="scheduleDate">Date</label>
              <input id="scheduleDate" class="input" name="date" type="date" value="${escapeHtml(dateAnchor)}" required>
            </div>
            <div class="field">
              <label for="scheduleTimeStart">Start Time</label>
              <input id="scheduleTimeStart" class="input" name="timeStart" type="time" value="08:00" required>
            </div>
            <div class="field">
              <label for="scheduleDuration">Duration (mins)</label>
              <input id="scheduleDuration" class="input" name="durationMinutes" type="number" min="15" step="5" value="60" required>
            </div>
          </div>
          <div class="split-3">
            <div class="field">
              <label for="scheduleStudent">Student</label>
              <select id="scheduleStudent" class="select" name="studentId" required>
                <option value="">Choose student</option>
                ${students.map((student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.firstName)} ${escapeHtml(student.surname)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="scheduleSubject">Subject</label>
              <select id="scheduleSubject" class="select" name="subject">
                ${subjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="scheduleCategory">Category</label>
              <select id="scheduleCategory" class="select" name="category">
                ${lessonCategories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field">
            <label for="scheduleLessonNotes">Lesson Notes</label>
            <textarea id="scheduleLessonNotes" class="textarea" name="lessonNotes"></textarea>
          </div>
          ${renderScheduleFields(scheduleFields)}
          <div class="action-row">
            <button class="btn btn-primary" type="submit">Save Schedule Item</button>
          </div>
        </form>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Schedule Calendar</h3>
          <div class="action-row">
            <button class="btn btn-outline btn-small" type="button" data-action="schedule-prev">Previous</button>
            <button class="btn btn-outline btn-small" type="button" data-action="schedule-today">Today</button>
            <button class="btn btn-outline btn-small" type="button" data-action="schedule-next">Next</button>
          </div>
        </div>
        <div class="action-row">
          <button class="btn ${viewMode === "day" ? "btn-secondary" : "btn-outline"} btn-small" data-action="schedule-mode" data-mode="day" type="button">Daily View</button>
          <button class="btn ${viewMode === "week" ? "btn-secondary" : "btn-outline"} btn-small" data-action="schedule-mode" data-mode="week" type="button">Weekly View</button>
          <button class="btn ${viewMode === "month" ? "btn-secondary" : "btn-outline"} btn-small" data-action="schedule-mode" data-mode="month" type="button">Monthly View</button>
          <button class="btn btn-outline btn-small" data-action="schedule-export" data-format="png" type="button">Export PNG</button>
          <button class="btn btn-outline btn-small" data-action="schedule-export" data-format="jpeg" type="button">Export JPEG</button>
        </div>
        <p class="help-text">Anchor date: ${formatDate(dateAnchor)}</p>
        <div id="scheduleExportRegion">
          ${visibleContent}
        </div>
      </article>
    </section>
  `;
}

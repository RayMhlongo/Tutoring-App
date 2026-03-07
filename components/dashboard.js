import { formatCurrency, formatDate } from "../src/utils.js";
import { escapeHtml, renderMaybe } from "../src/view-utils.js";

function renderPeopleList(items, emptyText, scoreLabel) {
  return renderMaybe(
    items.length > 0,
    items.map((item) => `
      <div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">${escapeHtml(item.studentName || item.subject || "")}</div>
          <div class="list-item-sub">${escapeHtml(item.grade || "")} ${scoreLabel ? `| ${scoreLabel}: ${Number(item[scoreLabel] ?? item.count ?? item.score ?? 0).toFixed(2)}` : ""}</div>
        </div>
      </div>
    `).join(""),
    `<div class="empty-state">${escapeHtml(emptyText)}</div>`
  );
}

export function dashboardViewTemplate(data) {
  const metrics = data.metrics || {};
  const todayLessons = data.todayLessons || [];
  const upcomingLessons = data.upcomingLessons || [];
  const activity = data.recentActivity || [];
  const analytics = data.analytics || {};
  const filters = data.filters || {};
  const filterOptions = data.filterOptions || { students: [], subjects: [], grades: [] };

  return `
    <section class="view" data-view-root="dashboard">
      <article class="card">
        <div class="card-title-row">
          <h2>Dashboard Filters</h2>
        </div>
        <form id="dashboardFilterApplyForm" class="split-3">
          <label class="field">
            <span>Student</span>
            <select class="select" name="studentId">
              <option value="">All students</option>
              ${filterOptions.students.map((student) => `<option value="${escapeHtml(student.id)}" ${filters.studentId === student.id ? "selected" : ""}>${escapeHtml(student.name)}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            <span>Subject</span>
            <select class="select" name="subject">
              <option value="">All subjects</option>
              ${filterOptions.subjects.map((subject) => `<option value="${escapeHtml(subject)}" ${filters.subject === subject ? "selected" : ""}>${escapeHtml(subject)}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            <span>Grade</span>
            <select class="select" name="grade">
              <option value="">All grades</option>
              ${filterOptions.grades.map((grade) => `<option value="${escapeHtml(grade)}" ${filters.grade === grade ? "selected" : ""}>${escapeHtml(grade)}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            <span>From Date</span>
            <input class="input" type="date" name="fromDate" value="${escapeHtml(filters.fromDate || "")}">
          </label>
          <label class="field">
            <span>To Date</span>
            <input class="input" type="date" name="toDate" value="${escapeHtml(filters.toDate || "")}">
          </label>
          <div class="action-row">
            <button class="btn btn-primary" type="submit">Apply</button>
            <button class="btn btn-outline" type="button" id="dashboardFilterResetBtn">Reset</button>
          </div>
        </form>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h2>Today at a Glance</h2>
        </div>
        <div class="grid cols-2">
          <div class="metric"><strong>${metrics.lessonsToday ?? 0}</strong><span>Today's lessons</span></div>
          <div class="metric"><strong>${metrics.checkedInToday ?? 0}</strong><span>Students present today</span></div>
          <div class="metric"><strong>${formatCurrency(metrics.outstandingPayments ?? 0)}</strong><span>Outstanding payments</span></div>
          <div class="metric"><strong>${formatCurrency(metrics.monthlyRevenue ?? 0)}</strong><span>Monthly revenue</span></div>
          <div class="metric"><strong>${formatCurrency(metrics.monthlyExpenses ?? 0)}</strong><span>Monthly expenses</span></div>
          <div class="metric"><strong>${formatCurrency((metrics.monthlyRevenue ?? 0) - (metrics.monthlyExpenses ?? 0))}</strong><span>Net this month</span></div>
        </div>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Today's Lessons</h3>
        </div>
        <div class="list">
          ${renderMaybe(todayLessons.length > 0, todayLessons.map((lesson) => `
            <div class="list-item">
              <div class="list-item-main">
                <div class="list-item-title">${escapeHtml(lesson.subject || "Lesson")} | ${formatDate(lesson.date)}</div>
                <div class="list-item-sub">${escapeHtml(lesson.studentId || "")} | ${escapeHtml(String(lesson.durationMinutes || 0))} mins</div>
              </div>
              <span class="badge badge-success">${escapeHtml(lesson.status || "completed")}</span>
            </div>
          `).join(""), `<div class="empty-state">No lessons logged for today yet.</div>`)}
        </div>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Upcoming Lessons</h3>
        </div>
        <div class="list">
          ${renderMaybe(upcomingLessons.length > 0, upcomingLessons.slice(0, 8).map((lesson) => `
            <div class="list-item">
              <div class="list-item-main">
                <div class="list-item-title">${formatDate(lesson.date)} | ${escapeHtml(lesson.subject || "General")}</div>
                <div class="list-item-sub">${escapeHtml(lesson.studentId || "")}</div>
              </div>
            </div>
          `).join(""), `<div class="empty-state">No upcoming lessons found.</div>`)}
        </div>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Progress Analytics</h3>
        </div>
        <div class="split-2">
          <div class="grid">
            <h3>Top Improving Students</h3>
            <div class="list">${renderPeopleList(analytics.topImprovingStudents || [], "No insights yet.", "improvingScore")}</div>
          </div>
          <div class="grid">
            <h3>Students Needing Help</h3>
            <div class="list">${renderPeopleList(analytics.studentsNeedingHelp || [], "No alerts at the moment.", "needsAttentionScore")}</div>
          </div>
          <div class="grid">
            <h3>Weak Subjects</h3>
            <div class="list">${renderPeopleList((analytics.weakSubjects || []).map((item) => ({ ...item, studentName: item.subject })), "No weak subjects identified.", "score")}</div>
          </div>
          <div class="grid">
            <h3>Most Studied Subjects</h3>
            <div class="list">${renderPeopleList((analytics.mostStudiedSubjects || []).map((item) => ({ ...item, studentName: item.subject })), "No subject data yet.", "count")}</div>
          </div>
        </div>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Recent Activity</h3>
        </div>
        <div class="list">
          ${renderMaybe(activity.length > 0, activity.map((item) => `
            <div class="list-item">
              <div class="list-item-main">
                <div class="list-item-title">${escapeHtml(item.title)}</div>
                <div class="list-item-sub">${escapeHtml(item.details || "")}</div>
              </div>
              <span class="badge badge-warning">${formatDate(item.dateTime)}</span>
            </div>
          `).join(""), `<div class="empty-state">Activity will appear after your first records are saved.</div>`)}
        </div>
      </article>
    </section>
  `;
}

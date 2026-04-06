import { APP_VERSION } from "../core/constants.js";
import { esc, money, dateOnly, clampText, toCsv, download, summarizeByStatus } from "../core/helpers.js";
import { activeRows, createRecord, addActivity, archiveRecord, backupEnvelope, applyBackup, resetState } from "../core/store.js";
import { section, statGrid, table, statusBadge, emptyState, segmented } from "../ui/render.js";

function fullName(row) {
  return `${row.firstName || ""} ${row.surname || ""}`.trim();
}

function mapById(rows) {
  const map = new Map();
  rows.forEach((r) => map.set(r.id, r));
  return map;
}

function topByCount(rows, key) {
  const counts = rows.reduce((acc, row) => {
    const value = String(row?.[key] || "Unknown");
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, total]) => ({ name, total }));
}

function getFilterFormHtml(config) {
  return `
    <form id="${config.id}" class="filter-bar">
      ${config.fields
        .map((field) => {
          if (field.type === "select") {
            return `<label class="field compact"><span>${esc(field.label)}</span><select class="input" name="${esc(field.name)}">${field.options
              .map((opt) => `<option value="${esc(opt)}">${esc(opt)}</option>`)
              .join("")}</select></label>`;
          }
          return `<label class="field compact"><span>${esc(field.label)}</span><input class="input" name="${esc(field.name)}" type="${
            field.type || "text"
          }" placeholder="${esc(field.placeholder || "")}" /></label>`;
        })
        .join("")}
      <button class="btn ghost" type="submit">Apply</button>
      <button class="btn ghost" type="button" data-action="clear-filters" data-target="${config.id}">Reset</button>
    </form>
  `;
}

function renderDashboard(ctx) {
  const { state } = ctx;
  const students = activeRows(state, "students");
  const tutors = activeRows(state, "tutors");
  const schedule = activeRows(state, "schedule");
  const lessons = activeRows(state, "lessons");
  const attendance = activeRows(state, "attendance");
  const payments = activeRows(state, "payments");
  const expenses = activeRows(state, "expenses");
  const today = dateOnly();

  const outstanding = payments.reduce((sum, p) => sum + Math.max(0, Number(p.amountDue || 0) - Number(p.amountPaid || 0)), 0);
  const paid = payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const spent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const present = attendance.filter((a) => a.status === "present").length;

  const upcoming = schedule
    .filter((x) => x.date >= today)
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`))
    .slice(0, 5)
    .map((row) => [row.date, row.start, row.type || "Lesson", row.studentName || row.studentId || "-", statusBadge(row.status || "planned")]);

  const recent = state.activityLog.slice(0, 6).map((x) => `<li><span>${esc(clampText(x.message, 58))}</span><time>${esc(x.createdAt.slice(0, 16).replace("T", " "))}</time></li>`).join("");

  return (
    section(
      "Business Dashboard",
      "Quick daily overview with focused operational cards",
      statGrid([
        { label: "Active Students", value: students.length },
        { label: "Active Tutors", value: tutors.length },
        { label: "Today Lessons", value: schedule.filter((x) => x.date === today).length },
        { label: "Attendance Present", value: present },
        { label: "Collected", value: money(paid, state.settings.currency) },
        { label: "Outstanding", value: money(outstanding, state.settings.currency), hint: "Follow up required" },
        { label: "Expenses", value: money(spent, state.settings.currency) },
        { label: "Lesson Records", value: lessons.length }
      ]) +
        `<div class="split-grid">
          <section class="surface slim">
            <div class="section-head"><h3>Upcoming Schedule</h3></div>
            ${table(["Date", "Time", "Type", "Student", "Status"], upcoming)}
          </section>
          <section class="surface slim">
            <div class="section-head"><h3>Recent Activity</h3></div>
            ${recent ? `<ul class="timeline">${recent}</ul>` : emptyState("No activity logged yet")}
          </section>
        </div>`
    )
  );
}

function renderEntityPage(ctx, entity, title, formFields, tableHeaders, rowMapper, summaryBuilder) {
  const rows = activeRows(ctx.state, entity);
  const ui = ctx.ui[entity] || { query: "", group: "all", touched: false };
  const query = (ui.query || "").trim().toLowerCase();

  const grouped = summaryBuilder(rows);
  const allGroups = ["all", ...Object.keys(grouped)];
  const selectedGroup = allGroups.includes(ui.group) ? ui.group : "all";

  const filtered = rows.filter((row) => {
    const groupOk = selectedGroup === "all" || String(summaryBuilder([row]).groupKey || row.status || "all").toLowerCase() === selectedGroup;
    const text = JSON.stringify(row).toLowerCase();
    const queryOk = !query || text.includes(query);
    return groupOk && queryOk;
  });

  const shouldShow = ui.touched || query.length > 0 || selectedGroup !== "all";
  const preview = rows.slice(0, 6);

  const chips = segmented(`${entity}-group`, allGroups, selectedGroup);

  return section(
    title,
    "Filter first, then drill into records",
    `
      <div class="stack-sm">
        ${statGrid(
          Object.entries(grouped).map(([label, value]) => ({
            label: label[0].toUpperCase() + label.slice(1),
            value
          }))
        )}
        <div class="surface inset">
          <div class="section-head mini"><h3>Find Records</h3></div>
          ${chips}
          <form id="${entity}-filters" class="filter-bar compact">
            <label class="field compact grow"><span>Search</span><input class="input" name="query" value="${esc(ui.query || "")}" placeholder="Search by any field" /></label>
            <button class="btn ghost" type="submit">Search</button>
            <button class="btn ghost" type="button" data-action="clear-entity-filter" data-entity="${entity}">Reset</button>
          </form>
        </div>
        <details class="surface inset" ${ui.addOpen ? "open" : ""}>
          <summary>Add ${title.slice(0, -1)}</summary>
          <form id="${entity}-form" class="form-grid two">
            ${formFields
              .map((f) => {
                if (f.type === "select") {
                  return `<label class="field"><span>${esc(f.label)}</span><select class="input" name="${esc(f.name)}" ${f.required ? "required" : ""}>${f.options
                    .map((opt) => `<option value="${esc(opt)}">${esc(opt)}</option>`)
                    .join("")}</select></label>`;
                }
                const tag = f.type === "textarea" ? "textarea" : "input";
                const type = f.type && f.type !== "textarea" ? `type="${esc(f.type)}"` : "";
                return `<label class="field ${f.wide ? "wide" : ""}"><span>${esc(f.label)}</span><${tag} class="input" name="${esc(f.name)}" ${
                  f.required ? "required" : ""
                } ${type} placeholder="${esc(f.placeholder || "")}"></${tag}></label>`;
              })
              .join("")}
            <div class="actions-row"><button class="btn primary" type="submit">Save</button></div>
          </form>
        </details>
        <section class="surface slim">
          <div class="section-head mini"><h3>${shouldShow ? "Filtered Results" : "Recent Records Preview"}</h3></div>
          ${table(
            tableHeaders,
            (shouldShow ? filtered : preview).map((row) => rowMapper(row, ctx))
          )}
          ${!shouldShow && rows.length > preview.length ? `<p class="muted">Showing ${preview.length} of ${rows.length}. Apply filters to view full records.</p>` : ""}
        </section>
      </div>
    `
  );
}

function studentSummary(rows) {
  const counts = rows.reduce(
    (acc, row) => {
      const key = (row.grade || "ungraded").toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { all: rows.length }
  );
  return counts;
}

function tutorSummary(rows) {
  const counts = rows.reduce(
    (acc, row) => {
      const key = row.subjects?.split(",")[0]?.trim()?.toLowerCase() || "general";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { all: rows.length }
  );
  return counts;
}

function byStatusSummary(rows) {
  return { all: rows.length, ...summarizeByStatus(rows) };
}

function renderStudents(ctx) {
  return renderEntityPage(
    ctx,
    "students",
    "Students",
    [
      { name: "firstName", label: "First Name", required: true },
      { name: "surname", label: "Surname", required: true },
      { name: "grade", label: "Grade", placeholder: "Grade 10" },
      { name: "school", label: "School" },
      { name: "subjects", label: "Subjects", placeholder: "Maths, Science" },
      { name: "guardian", label: "Guardian" },
      { name: "contact", label: "Contact Number" },
      { name: "notes", label: "Notes", type: "textarea", wide: true }
    ],
    ["Student", "Grade", "School", "Subjects", "Guardian", "Contact"],
    (row) => [
      `<strong>${esc(fullName(row))}</strong>`,
      esc(row.grade || "-"),
      esc(row.school || "-"),
      esc(row.subjects || "-"),
      esc(row.guardian || "-"),
      esc(row.contact || "-")
    ],
    studentSummary
  );
}

function renderTutors(ctx) {
  return renderEntityPage(
    ctx,
    "tutors",
    "Tutors",
    [
      { name: "firstName", label: "First Name", required: true },
      { name: "surname", label: "Surname", required: true },
      { name: "subjects", label: "Subjects", placeholder: "Maths, Accounting" },
      { name: "contact", label: "Contact Number" },
      { name: "availability", label: "Availability", type: "textarea", wide: true }
    ],
    ["Tutor", "Subjects", "Contact", "Availability"],
    (row) => [`<strong>${esc(fullName(row))}</strong>`, esc(row.subjects || "-"), esc(row.contact || "-"), esc(clampText(row.availability || "-", 70))],
    tutorSummary
  );
}

function resolveNames(state) {
  const studentMap = mapById(activeRows(state, "students"));
  const tutorMap = mapById(activeRows(state, "tutors"));
  return {
    studentMap,
    tutorMap,
    studentName: (id) => fullName(studentMap.get(id) || {}) || id || "-",
    tutorName: (id) => fullName(tutorMap.get(id) || {}) || id || "-"
  };
}

function renderSchedule(ctx) {
  const names = resolveNames(ctx.state);
  return renderEntityPage(
    ctx,
    "schedule",
    "Schedule",
    [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "start", label: "Start", type: "time", required: true },
      { name: "end", label: "End", type: "time", required: true },
      { name: "studentId", label: "Student ID", required: true },
      { name: "tutorId", label: "Tutor ID", required: true },
      { name: "type", label: "Lesson Type", placeholder: "One-on-one" },
      { name: "status", label: "Status", type: "select", options: ["planned", "completed", "missed", "cancelled"] }
    ],
    ["Date", "Time", "Student", "Tutor", "Type", "Status"],
    (row) => [
      esc(row.date || "-"),
      `${esc(row.start || "--:--")} - ${esc(row.end || "--:--")}`,
      esc(names.studentName(row.studentId)),
      esc(names.tutorName(row.tutorId)),
      esc(row.type || "Lesson"),
      statusBadge(row.status || "planned")
    ],
    byStatusSummary
  );
}

function renderLessons(ctx) {
  const names = resolveNames(ctx.state);
  return renderEntityPage(
    ctx,
    "lessons",
    "Lessons",
    [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "subject", label: "Subject", required: true },
      { name: "studentId", label: "Student ID", required: true },
      { name: "tutorId", label: "Tutor ID", required: true },
      { name: "duration", label: "Duration (minutes)", type: "number" },
      { name: "status", label: "Status", type: "select", options: ["planned", "completed", "missed", "cancelled"] },
      { name: "notes", label: "Notes", type: "textarea", wide: true },
      { name: "outcome", label: "Outcome", type: "textarea", wide: true }
    ],
    ["Date", "Subject", "Student", "Tutor", "Duration", "Status"],
    (row) => [
      esc(row.date || "-"),
      esc(row.subject || "-"),
      esc(names.studentName(row.studentId)),
      esc(names.tutorName(row.tutorId)),
      esc(row.duration || "60"),
      statusBadge(row.status || "planned")
    ],
    byStatusSummary
  );
}

function renderAttendance(ctx) {
  const names = resolveNames(ctx.state);
  return renderEntityPage(
    ctx,
    "attendance",
    "Attendance",
    [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "studentId", label: "Student ID", required: true },
      { name: "tutorId", label: "Tutor ID" },
      { name: "status", label: "Status", type: "select", options: ["present", "late", "absent", "excused"] },
      { name: "note", label: "Note", type: "textarea", wide: true }
    ],
    ["Date", "Student", "Tutor", "Status", "Note"],
    (row) => [
      esc(row.date || "-"),
      esc(names.studentName(row.studentId)),
      esc(names.tutorName(row.tutorId)),
      statusBadge(row.status || "present"),
      esc(clampText(row.note || "-", 40))
    ],
    byStatusSummary
  );
}

function renderPayments(ctx) {
  const names = resolveNames(ctx.state);
  return renderEntityPage(
    ctx,
    "payments",
    "Payments",
    [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "studentId", label: "Student ID", required: true },
      { name: "amountDue", label: "Amount Due", type: "number", required: true },
      { name: "amountPaid", label: "Amount Paid", type: "number", required: true },
      { name: "method", label: "Method", placeholder: "EFT" },
      { name: "reference", label: "Reference" },
      { name: "status", label: "Status", type: "select", options: ["paid", "partial", "unpaid", "overdue"] }
    ],
    ["Date", "Student", "Due", "Paid", "Balance", "Method", "Status"],
    (row) => {
      const due = Number(row.amountDue || 0);
      const paid = Number(row.amountPaid || 0);
      return [
        esc(row.date || "-"),
        esc(names.studentName(row.studentId)),
        money(due, ctx.state.settings.currency),
        money(paid, ctx.state.settings.currency),
        money(Math.max(0, due - paid), ctx.state.settings.currency),
        esc(row.method || "-"),
        statusBadge(row.status || "paid")
      ];
    },
    byStatusSummary
  );
}

function renderExpenses(ctx) {
  return renderEntityPage(
    ctx,
    "expenses",
    "Expenses",
    [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "category", label: "Category", required: true },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "note", label: "Note", type: "textarea", wide: true }
    ],
    ["Date", "Category", "Amount", "Note"],
    (row) => [esc(row.date || "-"), esc(row.category || "-"), money(row.amount || 0, ctx.state.settings.currency), esc(clampText(row.note || "-", 50))],
    byStatusSummary
  );
}

function reportRows(ctx) {
  const { state } = ctx;
  const outstanding = activeRows(state, "payments")
    .filter((x) => Number(x.amountDue || 0) > Number(x.amountPaid || 0))
    .map((x) => [x.date, x.studentId, x.amountDue, x.amountPaid, Number(x.amountDue || 0) - Number(x.amountPaid || 0)]);

  return {
    summary: [
      ["Active Students", activeRows(state, "students").length],
      ["Active Tutors", activeRows(state, "tutors").length],
      ["Scheduled Events", activeRows(state, "schedule").length],
      ["Lessons", activeRows(state, "lessons").length],
      ["Attendance", activeRows(state, "attendance").length],
      ["Payments", activeRows(state, "payments").length],
      ["Expenses", activeRows(state, "expenses").length]
    ],
    overdue: outstanding
  };
}

function renderReports(ctx) {
  const rows = reportRows(ctx);
  return section(
    "Reports",
    "Assessment-first reporting with A4 print support",
    `
    <div class="stack-sm">
      <section class="surface inset">
        <div class="section-head mini"><h3>Report Actions</h3></div>
        <form id="report-filters" class="filter-bar compact">
          <label class="field compact"><span>From</span><input class="input" type="date" name="from" /></label>
          <label class="field compact"><span>To</span><input class="input" type="date" name="to" /></label>
          <button class="btn ghost" type="submit">Preview</button>
        </form>
        <div class="actions-row">
          <button class="btn" type="button" data-action="export-summary-csv">Summary CSV</button>
          <button class="btn ghost" type="button" data-action="export-overdue-csv">Overdue CSV</button>
          <button class="btn ghost" type="button" data-action="print-a4">A4 Print / PDF</button>
        </div>
      </section>
      <section class="surface slim report-print">
        <div class="print-header">
          <h3>${esc(ctx.state.settings.businessName)}</h3>
          <p>${esc(dateOnly())} | EduPulse Report</p>
        </div>
        ${table(["Metric", "Value"], rows.summary.map((r) => [esc(r[0]), esc(r[1])]))}
        ${table(
          ["Date", "Student ID", "Due", "Paid", "Balance"],
          rows.overdue.map((r) => [esc(r[0]), esc(r[1]), money(r[2], ctx.state.settings.currency), money(r[3], ctx.state.settings.currency), money(r[4], ctx.state.settings.currency)])
        )}
      </section>
    </div>
  `
  );
}

function renderInsights(ctx) {
  const payments = activeRows(ctx.state, "payments");
  const attendance = activeRows(ctx.state, "attendance");
  const schedule = activeRows(ctx.state, "schedule");

  const overdue = payments.filter((x) => Number(x.amountDue || 0) > Number(x.amountPaid || 0));
  const atRisk = topByCount(attendance.filter((x) => ["absent", "late"].includes(String(x.status))), "studentId");
  const busy = topByCount(schedule, "date");
  const tutorLoad = topByCount(schedule, "tutorId");

  const tips = [
    `Outstanding payment records: ${overdue.length}.`,
    busy[0] ? `Busiest day is ${busy[0].name} with ${busy[0].total} sessions.` : "No scheduling trend yet.",
    atRisk[0] ? `Student risk: ${atRisk[0].name} has ${atRisk[0].total} attendance flags.` : "No attendance risk flags today.",
    tutorLoad[0] ? `Highest tutor load: ${tutorLoad[0].name} with ${tutorLoad[0].total} sessions.` : "Tutor load is currently light."
  ];

  return section(
    "Insights Assistant",
    "Rule-based smart summaries with optional AI-ready context",
    `
      ${statGrid([
        { label: "Overdue Payments", value: overdue.length },
        { label: "Attendance Flags", value: attendance.filter((x) => x.status !== "present").length },
        { label: "Upcoming Sessions", value: schedule.filter((x) => x.date >= dateOnly()).length },
        { label: "Busiest Day", value: busy[0]?.name || "N/A", hint: busy[0] ? `${busy[0].total} sessions` : "Need more data" }
      ])}
      <section class="surface slim inset">
        <div class="section-head mini"><h3>Manager Notes</h3></div>
        <ul class="checklist">${tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        <p class="muted">AI extension is optional. Core insight engine works fully offline.</p>
      </section>
    `
  );
}

function renderBackup(ctx) {
  const envelope = backupEnvelope(ctx.state, APP_VERSION);
  return section(
    "Backup & Restore",
    "Safe local backup with restore preview and overwrite confirmation",
    `
      <div class="stack-sm">
        <section class="surface inset">
          <div class="section-head mini"><h3>Backup Actions</h3></div>
          <div class="actions-row">
            <button class="btn" type="button" data-action="backup-json">Back Up Now</button>
            <button class="btn ghost" type="button" data-action="queue-drive" disabled title="Planned optional module">Queue Drive Backup</button>
          </div>
          <p class="muted">Last backup envelope preview: ${esc(JSON.stringify(envelope.meta))}</p>
        </section>
        <section class="surface inset">
          <div class="section-head mini"><h3>Restore</h3></div>
          <form id="restore-form" class="form-grid one">
            <label class="field"><span>Backup file</span><input class="input" type="file" name="file" accept="application/json" required /></label>
            <label class="check"><input type="checkbox" name="confirm" /> I understand this will overwrite current records.</label>
            <button class="btn danger" type="submit">Restore Backup</button>
          </form>
        </section>
        <section class="surface inset">
          <div class="section-head mini"><h3>Data Reset</h3></div>
          <button class="btn danger" data-action="factory-reset" type="button">Reset to Demo Data</button>
        </section>
      </div>
    `
  );
}

function renderSettings(ctx) {
  return section(
    "Settings",
    "Business profile, access, and appearance",
    `
      <form id="settings-form" class="form-grid two">
        <label class="field"><span>Business Name</span><input class="input" name="businessName" value="${esc(ctx.state.settings.businessName)}" required /></label>
        <label class="field"><span>Currency</span><input class="input" name="currency" value="${esc(ctx.state.settings.currency)}" /></label>
        <label class="field"><span>Admin Username</span><input class="input" name="username" value="${esc(ctx.state.settings.username)}" required /></label>
        <label class="field"><span>Admin Passcode</span><input class="input" type="password" name="passcode" value="${esc(ctx.state.settings.passcode)}" required /></label>
        <label class="field"><span>Theme</span>
          <select class="input" name="theme">
            <option value="light" ${ctx.state.settings.theme === "light" ? "selected" : ""}>Light</option>
            <option value="dark" ${ctx.state.settings.theme === "dark" ? "selected" : ""}>Dark</option>
            <option value="auto" ${ctx.state.settings.theme === "auto" ? "selected" : ""}>Auto</option>
          </select>
        </label>
        <div class="actions-row"><button class="btn primary" type="submit">Save Settings</button></div>
      </form>
    `
  );
}

export function renderRoute(ctx) {
  switch (ctx.route) {
    case "dashboard":
      return renderDashboard(ctx);
    case "students":
      return renderStudents(ctx);
    case "tutors":
      return renderTutors(ctx);
    case "schedule":
      return renderSchedule(ctx);
    case "lessons":
      return renderLessons(ctx);
    case "attendance":
      return renderAttendance(ctx);
    case "payments":
      return renderPayments(ctx);
    case "expenses":
      return renderExpenses(ctx);
    case "reports":
      return renderReports(ctx);
    case "insights":
      return renderInsights(ctx);
    case "backup":
      return renderBackup(ctx);
    case "settings":
      return renderSettings(ctx);
    default:
      return renderDashboard(ctx);
  }
}

function parseForm(form) {
  const fd = new FormData(form);
  return Object.fromEntries(fd.entries());
}

function numberValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function bindRoute(ctx, notify, rerender) {
  const { state, ui } = ctx;
  const entityFields = {
    students: ["firstName", "surname", "grade", "school", "subjects", "guardian", "contact", "notes"],
    tutors: ["firstName", "surname", "subjects", "contact", "availability"],
    schedule: ["date", "start", "end", "studentId", "tutorId", "type", "status"],
    lessons: ["date", "subject", "studentId", "tutorId", "duration", "status", "notes", "outcome"],
    attendance: ["date", "studentId", "tutorId", "status", "note"],
    payments: ["date", "studentId", "amountDue", "amountPaid", "method", "reference", "status"],
    expenses: ["date", "category", "amount", "note"]
  };

  Object.keys(entityFields).forEach((entity) => {
    const form = document.getElementById(`${entity}-form`);
    const filterForm = document.getElementById(`${entity}-filters`);

    filterForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = String(new FormData(filterForm).get("query") || "");
      ui[entity] = { ...(ui[entity] || {}), query, touched: true };
      rerender();
    });

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = parseForm(form);
      const payload = {};
      entityFields[entity].forEach((field) => {
        payload[field] = data[field] || "";
      });
      if (entity === "payments") {
        payload.amountDue = numberValue(payload.amountDue);
        payload.amountPaid = numberValue(payload.amountPaid);
      }
      if (entity === "expenses") payload.amount = numberValue(payload.amount);
      if (entity === "lessons") payload.duration = numberValue(payload.duration || 60);

      if (!payload.date && ["schedule", "lessons", "attendance", "payments", "expenses"].includes(entity)) {
        payload.date = dateOnly();
      }

      createRecord(state, entity, payload, `Added ${entity.slice(0, -1)} record`);
      notify(`${entity.slice(0, -1)} saved`);
      rerender();
    });
  });

  document.querySelectorAll("[data-seg]").forEach((button) => {
    button.addEventListener("click", () => {
      const entity = String(button.dataset.seg || "").split("-")[0];
      const value = String(button.dataset.value || "all").toLowerCase();
      ui[entity] = { ...(ui[entity] || {}), group: value, touched: true };
      rerender();
    });
  });

  document.querySelectorAll("[data-action='clear-entity-filter']").forEach((button) => {
    button.addEventListener("click", () => {
      const entity = String(button.dataset.entity || "");
      ui[entity] = { query: "", group: "all", touched: false };
      rerender();
    });
  });

  document.querySelector("[data-action='export-summary-csv']")?.addEventListener("click", () => {
    const rows = reportRows(ctx).summary;
    download(`edupulse-summary-${dateOnly()}.csv`, toCsv(["Metric", "Value"], rows), "text/csv;charset=utf-8");
    notify("Summary CSV exported");
  });

  document.querySelector("[data-action='export-overdue-csv']")?.addEventListener("click", () => {
    const rows = reportRows(ctx).overdue;
    download(`edupulse-overdue-${dateOnly()}.csv`, toCsv(["Date", "Student ID", "Due", "Paid", "Balance"], rows), "text/csv;charset=utf-8");
    notify("Overdue CSV exported");
  });

  document.querySelector("[data-action='print-a4']")?.addEventListener("click", () => {
    window.print();
  });

  document.querySelector("[data-action='backup-json']")?.addEventListener("click", () => {
    const envelope = backupEnvelope(state, APP_VERSION);
    download(`edupulse-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, JSON.stringify(envelope, null, 2), "application/json");
    addActivity(state, "Local backup exported");
    notify("Backup exported");
  });

  document.getElementById("restore-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const confirm = fd.get("confirm") === "on";
    if (!confirm) {
      notify("Tick overwrite confirmation first");
      return;
    }
    const file = fd.get("file");
    if (!(file instanceof File)) {
      notify("Choose a backup file");
      return;
    }

    try {
      const parsed = JSON.parse(await file.text());
      const next = applyBackup(state, parsed);
      Object.keys(state).forEach((k) => delete state[k]);
      Object.assign(state, next);
      notify("Backup restored");
      rerender();
    } catch {
      notify("Restore failed - invalid backup file");
    }
  });

  document.querySelector("[data-action='factory-reset']")?.addEventListener("click", () => {
    if (!window.confirm("Reset all current records and load demo data?")) return;
    const next = resetState(state);
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, next);
    addActivity(state, "Factory reset completed");
    notify("Reset complete");
    rerender();
  });

  document.getElementById("settings-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = parseForm(event.currentTarget);
    state.settings.businessName = String(data.businessName || "EduPulse by Ray");
    state.settings.currency = String(data.currency || "ZAR").toUpperCase();
    state.settings.username = String(data.username || "admin");
    state.settings.passcode = String(data.passcode || "1234");
    state.settings.theme = String(data.theme || "light");
    notify("Settings updated");
    rerender();
  });

  document.querySelector("[data-action='queue-drive']")?.addEventListener("click", () => {
    notify("Google Drive adapter is prepared as optional module.");
  });

  document.querySelectorAll("[data-archive-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const entity = button.dataset.entity;
      const id = button.dataset.archiveId;
      if (!entity || !id) return;
      archiveRecord(state, entity, id, `Archived ${entity.slice(0, -1)}`);
      notify("Record archived");
      rerender();
    });
  });
}

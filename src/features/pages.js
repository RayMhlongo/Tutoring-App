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

function inDateRange(value, from, to) {
  if (!value) return false;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
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
        { label: "Outstanding", value: money(outstanding, state.settings.currency), hint: "Follow up required" }
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
        + `<details class="surface inset"><summary>More Metrics</summary>${statGrid([
          { label: "Expenses", value: money(spent, state.settings.currency) },
          { label: "Lesson Records", value: lessons.length }
        ])}</details>`
    )
  );
}

function renderEntityPage(ctx, entity, title, formFields, tableHeaders, rowMapper, summaryBuilder, groupBy) {
  const rows = activeRows(ctx.state, entity);
  const ui = ctx.ui[entity] || { query: "", group: "all", touched: false };
  const query = (ui.query || "").trim().toLowerCase();

  const grouped = summaryBuilder(rows);
  const allGroups = ["all", ...Object.keys(grouped)];
  const selectedGroup = allGroups.includes(ui.group) ? ui.group : "all";

  const filtered = rows.filter((row) => {
    const groupOk = selectedGroup === "all" || String(groupBy(row) || "all").toLowerCase() === selectedGroup;
    const text = JSON.stringify(row).toLowerCase();
    const queryOk = !query || text.includes(query);
    return groupOk && queryOk;
  });

  const shouldShow = ui.touched || query.length > 0 || selectedGroup !== "all";
  const chips = segmented(`${entity}-group`, allGroups, selectedGroup);
  const summaryEntries = Object.entries(grouped).slice(0, 6);

  return section(
    title,
    "Filter first, then drill into records",
    `
      <div class="stack-sm">
        ${statGrid(
          summaryEntries.map(([label, value]) => ({
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
          <div class="section-head mini"><h3>${shouldShow ? "Filtered Results" : "Results"}</h3></div>
          ${
            shouldShow
              ? table(
                  tableHeaders,
                  filtered.map((row) => rowMapper(row, ctx))
                )
              : emptyState("Use search or category filters first.", "Results appear only after you narrow the data.")
          }
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
    studentSummary,
    (row) => row.grade || "ungraded"
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
    tutorSummary,
    (row) => row.subjects?.split(",")[0]?.trim()?.toLowerCase() || "general"
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
    byStatusSummary,
    (row) => row.status || "planned"
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
    byStatusSummary,
    (row) => row.status || "planned"
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
    byStatusSummary,
    (row) => row.status || "present"
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
    byStatusSummary,
    (row) => row.status || "paid"
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
    byStatusSummary,
    (row) => row.category || "general"
  );
}

function buildReport(ctx, type, from = "", to = "", studentId = "", tutorId = "", status = "") {
  const state = ctx.state;
  const names = resolveNames(state);
  const fitDate = (x) => (!from && !to ? true : inDateRange(x.date, from, to));
  const fitStudent = (x) => (!studentId ? true : x.studentId === studentId);
  const fitTutor = (x) => (!tutorId ? true : x.tutorId === tutorId);
  const fitStatus = (x) => (!status ? true : String(x.status || "").toLowerCase() === String(status).toLowerCase());
  const payments = activeRows(state, "payments").filter((x) => fitDate(x) && fitStudent(x) && fitStatus(x));
  const attendance = activeRows(state, "attendance").filter((x) => fitDate(x) && fitStudent(x) && fitTutor(x) && fitStatus(x));
  const lessons = activeRows(state, "lessons").filter((x) => fitDate(x) && fitStudent(x) && fitTutor(x) && fitStatus(x));
  const schedule = activeRows(state, "schedule").filter((x) => fitDate(x) && fitStudent(x) && fitTutor(x) && fitStatus(x));
  const expenses = activeRows(state, "expenses").filter((x) => fitDate(x));
  const students = activeRows(state, "students");
  const tutors = activeRows(state, "tutors");

  const outstandingRows = payments.filter((x) => Number(x.amountDue || 0) > Number(x.amountPaid || 0));
  const attendanceFlags = attendance.filter((x) => ["late", "absent"].includes(String(x.status)));
  const paidTotal = payments.reduce((sum, x) => sum + Number(x.amountPaid || 0), 0);
  const dueTotal = payments.reduce((sum, x) => sum + Number(x.amountDue || 0), 0);
  const expenseTotal = expenses.reduce((sum, x) => sum + Number(x.amount || 0), 0);

  const all = {
    business: {
      title: "Business Summary",
      summary: [
        { label: "Revenue", value: money(paidTotal, state.settings.currency) },
        { label: "Outstanding", value: money(Math.max(0, dueTotal - paidTotal), state.settings.currency) },
        { label: "Expenses", value: money(expenseTotal, state.settings.currency) },
        { label: "Lessons", value: lessons.length }
      ],
      headers: ["Metric", "Value"],
      rows: [
        ["Active Students", students.length],
        ["Active Tutors", tutors.length],
        ["Lessons in range", lessons.length],
        ["Attendance records", attendance.length],
        ["Payment records", payments.length],
        ["Schedule events", schedule.length]
      ],
      narrative: `Collected ${money(paidTotal, state.settings.currency)} from ${payments.length} payments. Outstanding balance is ${money(
        Math.max(0, dueTotal - paidTotal),
        state.settings.currency
      )}, with ${outstandingRows.length} overdue payment records.`
    },
    payments: {
      title: "Payments Summary",
      summary: [
        { label: "Paid", value: money(paidTotal, state.settings.currency) },
        { label: "Due", value: money(dueTotal, state.settings.currency) },
        { label: "Outstanding", value: money(Math.max(0, dueTotal - paidTotal), state.settings.currency) },
        { label: "Overdue Count", value: outstandingRows.length }
      ],
      headers: ["Date", "Student", "Due", "Paid", "Balance", "Status"],
      rows: payments.map((x) => [
        x.date || "-",
        names.studentName(x.studentId),
        money(x.amountDue || 0, state.settings.currency),
        money(x.amountPaid || 0, state.settings.currency),
        money(Math.max(0, Number(x.amountDue || 0) - Number(x.amountPaid || 0)), state.settings.currency),
        x.status || "paid"
      ]),
      narrative: `${outstandingRows.length} records have unpaid balances. Average collected per payment is ${money(
        payments.length ? paidTotal / payments.length : 0,
        state.settings.currency
      )}.`
    },
    overdue: {
      title: "Overdue Payments",
      summary: [
        { label: "Overdue Records", value: outstandingRows.length },
        { label: "Overdue Amount", value: money(outstandingRows.reduce((sum, x) => sum + Math.max(0, Number(x.amountDue || 0) - Number(x.amountPaid || 0)), 0), state.settings.currency) }
      ],
      headers: ["Date", "Student", "Due", "Paid", "Balance", "Reference"],
      rows: outstandingRows.map((x) => [
        x.date || "-",
        names.studentName(x.studentId),
        money(x.amountDue || 0, state.settings.currency),
        money(x.amountPaid || 0, state.settings.currency),
        money(Math.max(0, Number(x.amountDue || 0) - Number(x.amountPaid || 0)), state.settings.currency),
        x.reference || "-"
      ]),
      narrative: `There are ${outstandingRows.length} overdue records needing follow-up.`
    },
    attendance: {
      title: "Attendance Summary",
      summary: [
        { label: "Present", value: attendance.filter((x) => x.status === "present").length },
        { label: "Late", value: attendance.filter((x) => x.status === "late").length },
        { label: "Absent", value: attendance.filter((x) => x.status === "absent").length },
        { label: "Excused", value: attendance.filter((x) => x.status === "excused").length }
      ],
      headers: ["Date", "Student", "Tutor", "Status", "Note"],
      rows: attendance.map((x) => [x.date || "-", names.studentName(x.studentId), names.tutorName(x.tutorId), x.status || "-", clampText(x.note || "-", 40)]),
      narrative: `${attendanceFlags.length} attendance flags (late/absent) were recorded in this range.`
    },
    students: {
      title: "Student Summary",
      summary: [
        { label: "Students", value: students.length },
        { label: "Lessons", value: lessons.length },
        { label: "Attendance Flags", value: attendanceFlags.length }
      ],
      headers: ["Student", "Grade", "Subjects", "Contact"],
      rows: students.map((x) => [fullName(x), x.grade || "-", clampText(x.subjects || "-", 30), x.contact || "-"]),
      narrative: `Active student base is ${students.length}. Track low attendance students for early intervention.`
    },
    tutors: {
      title: "Tutor Summary",
      summary: [
        { label: "Tutors", value: tutors.length },
        { label: "Scheduled Sessions", value: schedule.length }
      ],
      headers: ["Tutor", "Subjects", "Contact", "Availability"],
      rows: tutors.map((x) => [fullName(x), clampText(x.subjects || "-", 35), x.contact || "-", clampText(x.availability || "-", 35)]),
      narrative: `${tutors.length} tutors currently cover ${schedule.length} scheduled sessions in this range.`
    },
    lessons: {
      title: "Lesson & Activity Summary",
      summary: [
        { label: "Lessons", value: lessons.length },
        { label: "Completed", value: lessons.filter((x) => x.status === "completed").length },
        { label: "Missed", value: lessons.filter((x) => x.status === "missed").length },
        { label: "Cancelled", value: lessons.filter((x) => x.status === "cancelled").length }
      ],
      headers: ["Date", "Subject", "Student", "Tutor", "Duration", "Status"],
      rows: lessons.map((x) => [x.date || "-", x.subject || "-", names.studentName(x.studentId), names.tutorName(x.tutorId), x.duration || 60, x.status || "planned"]),
      narrative: `Lesson delivery trend: ${lessons.filter((x) => x.status === "completed").length} completed out of ${lessons.length}.`
    },
    expenses: {
      title: "Expense Summary",
      summary: [
        { label: "Expense Records", value: expenses.length },
        { label: "Total Expenses", value: money(expenseTotal, state.settings.currency) }
      ],
      headers: ["Date", "Category", "Amount", "Note"],
      rows: expenses.map((x) => [x.date || "-", x.category || "-", money(x.amount || 0, state.settings.currency), clampText(x.note || "-", 50)]),
      narrative: `Total expenses in the selected range are ${money(expenseTotal, state.settings.currency)} across ${expenses.length} records.`
    }
  };

  return all[type] || all.business;
}

function buildRuleInsight(ctx) {
  const state = ctx.state;
  const base = buildReport(ctx, "business");
  const overdue = buildReport(ctx, "overdue");
  const attendance = buildReport(ctx, "attendance");
  const busy = topByCount(activeRows(state, "schedule"), "date");
  const today = new Date();
  const startThisWeek = new Date(today);
  startThisWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const startPrevWeek = new Date(startThisWeek);
  startPrevWeek.setDate(startPrevWeek.getDate() - 7);
  const endPrevWeek = new Date(startThisWeek);
  endPrevWeek.setDate(endPrevWeek.getDate() - 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const thisWeekLessons = buildReport(ctx, "lessons", fmt(startThisWeek), fmt(today)).rows.length;
  const prevWeekLessons = buildReport(ctx, "lessons", fmt(startPrevWeek), fmt(endPrevWeek)).rows.length;
  const delta = thisWeekLessons - prevWeekLessons;
  const trend =
    delta === 0
      ? "Lesson volume is stable versus last week."
      : delta > 0
        ? `Lesson volume is up by ${delta} compared with last week.`
        : `Lesson volume is down by ${Math.abs(delta)} compared with last week.`;
  return [
    base.narrative,
    overdue.narrative,
    attendance.narrative,
    busy[0] ? `Busiest day currently is ${busy[0].name} with ${busy[0].total} sessions.` : "No strong busy-day trend yet.",
    trend
  ].join(" ");
}

function aiContextFromReport(state, report, from, to) {
  return `Business: ${state.settings.businessName}\nRange: ${from || "all"} to ${to || "all"}\nReport: ${report.title}\nNarrative: ${report.narrative}\nSummary: ${JSON.stringify(
    report.summary
  )}\nRows: ${JSON.stringify(report.rows.slice(0, 30))}`;
}

async function generateAiSummary(state, report, from, to) {
  if (!state.settings.aiEnabled || !state.settings.aiEndpoint || !state.settings.aiApiKey) return "";
  try {
    const response = await fetch(state.settings.aiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.settings.aiApiKey}`
      },
      body: JSON.stringify({
        model: state.settings.aiModel || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a tutoring business analyst. Summarize only from provided data context in concise plain English." },
          { role: "user", content: aiContextFromReport(state, report, from, to) }
        ],
        temperature: 0.2
      })
    });
    const payload = await response.json();
    return String(payload?.choices?.[0]?.message?.content || "").trim();
  } catch {
    return "";
  }
}

function renderReports(ctx) {
  const reportUi = ctx.ui.reports || {};
  const type = reportUi.type || "business";
  const from = reportUi.from || "";
  const to = reportUi.to || "";
  const studentId = reportUi.studentId || "";
  const tutorId = reportUi.tutorId || "";
  const status = reportUi.status || "";
  const studentOptions = activeRows(ctx.state, "students")
    .map((x) => `<option value="${esc(x.id)}" ${studentId === x.id ? "selected" : ""}>${esc(fullName(x) || x.id)}</option>`)
    .join("");
  const tutorOptions = activeRows(ctx.state, "tutors")
    .map((x) => `<option value="${esc(x.id)}" ${tutorId === x.id ? "selected" : ""}>${esc(fullName(x) || x.id)}</option>`)
    .join("");
  const report = buildReport(ctx, type, from, to, studentId, tutorId, status);
  const narrowed = Boolean(from || to || studentId || tutorId || status);
  const previewRows = narrowed ? report.rows : report.rows.slice(0, 30);

  return section(
    "Reports",
    "Choose a report category, apply filters, preview, then export",
    `
      <div class="stack-sm">
        <section class="surface inset">
          <div class="section-head mini"><h3>Report Categories</h3></div>
          ${segmented("report-type", ["business", "payments", "overdue", "attendance", "students", "tutors", "lessons", "expenses"], type)}
          <form id="report-filters" class="filter-bar compact">
            <label class="field compact"><span>From</span><input class="input" type="date" name="from" value="${esc(from)}" /></label>
            <label class="field compact"><span>To</span><input class="input" type="date" name="to" value="${esc(to)}" /></label>
            <label class="field compact"><span>Student</span><select class="input" name="studentId"><option value="">All students</option>${studentOptions}</select></label>
            <label class="field compact"><span>Tutor</span><select class="input" name="tutorId"><option value="">All tutors</option>${tutorOptions}</select></label>
            <label class="field compact"><span>Status</span><input class="input" name="status" value="${esc(status)}" placeholder="e.g. overdue, present, completed" /></label>
            <button class="btn ghost" type="submit">Apply Range</button>
          </form>
          <div class="actions-row">
            <button class="btn" type="button" data-action="export-current-csv">Export CSV</button>
            <button class="btn ghost" type="button" data-action="print-a4">A4 Print / PDF</button>
            <button class="btn ghost" type="button" data-action="generate-report-summary">${reportUi.generating ? "Generating..." : "Generate AI/Smart Summary"}</button>
          </div>
        </section>
        <section class="surface slim report-print">
          <div class="print-header">
            <h3>${esc(ctx.state.settings.businessName)}</h3>
            <p>${esc(dateOnly())} | ${esc(report.title)}${from || to ? ` | ${esc(from || "start")} - ${esc(to || "today")}` : ""}</p>
          </div>
          ${statGrid(report.summary)}
          ${table(report.headers, previewRows.map((row) => row.map((value) => esc(String(value ?? "-")))))}
          ${!narrowed && report.rows.length > previewRows.length ? `<p class="muted">Showing ${previewRows.length} of ${report.rows.length}. Apply filters for full detail.</p>` : ""}
          <section class="surface inset">
            <div class="section-head mini"><h3>Smart Summary</h3></div>
            <p>${esc(reportUi.ruleText || report.narrative)}</p>
            ${
              reportUi.aiText
                ? `<div class="surface inset"><p class="muted">AI Narrative</p><p>${esc(reportUi.aiText)}</p></div>`
                : `<p class="muted">AI summary appears here when AI endpoint + key are configured in Settings.</p>`
            }
          </section>
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
  const busy = topByCount(schedule, "date");

  const ruleSummary = buildRuleInsight(ctx);
  return section(
    "Insights Assistant",
    "Data-grounded management insights from your real records",
    `
      ${statGrid([
        { label: "Overdue Payments", value: overdue.length },
        { label: "Attendance Flags", value: attendance.filter((x) => x.status !== "present").length },
        { label: "Upcoming Sessions", value: schedule.filter((x) => x.date >= dateOnly()).length },
        { label: "Busiest Day", value: busy[0]?.name || "N/A", hint: busy[0] ? `${busy[0].total} sessions` : "Need more data" }
      ])}
      <section class="surface slim inset">
        <div class="section-head mini"><h3>Business Health Summary</h3></div>
        <p>${esc(ruleSummary)}</p>
        <p class="muted">This summary is generated from your current app data, not generic text.</p>
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
        <label class="field"><span>Theme</span>
          <select class="input" name="theme">
            <option value="light" ${ctx.state.settings.theme === "light" ? "selected" : ""}>Light</option>
            <option value="dark" ${ctx.state.settings.theme === "dark" ? "selected" : ""}>Dark</option>
            <option value="auto" ${ctx.state.settings.theme === "auto" ? "selected" : ""}>Auto</option>
          </select>
        </label>
        <label class="field"><span>Enable AI Reports</span>
          <select class="input" name="aiEnabled">
            <option value="false" ${ctx.state.settings.aiEnabled ? "" : "selected"}>Disabled (Rule-based only)</option>
            <option value="true" ${ctx.state.settings.aiEnabled ? "selected" : ""}>Enabled</option>
          </select>
        </label>
        <label class="field wide"><span>AI Endpoint (optional)</span><input class="input" name="aiEndpoint" value="${esc(ctx.state.settings.aiEndpoint || "")}" placeholder="https://api.openai.com/v1/chat/completions" /></label>
        <label class="field"><span>AI Model</span><input class="input" name="aiModel" value="${esc(ctx.state.settings.aiModel || "gpt-4o-mini")}" /></label>
        <label class="field"><span>AI API Key</span><input class="input" type="password" name="aiApiKey" value="${esc(ctx.state.settings.aiApiKey || "")}" placeholder="Stored locally on this device" /></label>
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
      const seg = String(button.dataset.seg || "");
      if (seg === "report-type") {
        ui.reports = { ...(ui.reports || {}), type: String(button.dataset.value || "business"), aiText: "" };
        rerender();
        return;
      }
      const entity = seg.split("-")[0];
      const value = String(button.dataset.value || "all").toLowerCase();
      ui[entity] = { ...(ui[entity] || {}), group: value, touched: true };
      rerender();
    });
  });

  const activeReportChip = document.querySelector("#report-type .chip.active");
  if (activeReportChip) {
    activeReportChip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  document.querySelectorAll("[data-action='clear-entity-filter']").forEach((button) => {
    button.addEventListener("click", () => {
      const entity = String(button.dataset.entity || "");
      ui[entity] = { query: "", group: "all", touched: false };
      rerender();
    });
  });

  document.getElementById("report-filters")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = parseForm(event.currentTarget);
    ui.reports = {
      ...(ui.reports || {}),
      from: String(data.from || ""),
      to: String(data.to || ""),
      studentId: String(data.studentId || ""),
      tutorId: String(data.tutorId || ""),
      status: String(data.status || "").trim()
    };
    rerender();
  });

  document.querySelector("[data-action='export-current-csv']")?.addEventListener("click", () => {
    const type = ui.reports?.type || "business";
    const from = ui.reports?.from || "";
    const to = ui.reports?.to || "";
    const studentId = ui.reports?.studentId || "";
    const tutorId = ui.reports?.tutorId || "";
    const status = ui.reports?.status || "";
    const report = buildReport(ctx, type, from, to, studentId, tutorId, status);
    download(`edupulse-${type}-${dateOnly()}.csv`, toCsv(report.headers, report.rows), "text/csv;charset=utf-8");
    notify("Report CSV exported");
  });

  document.querySelector("[data-action='print-a4']")?.addEventListener("click", () => {
    window.print();
  });

  document.querySelector("[data-action='generate-report-summary']")?.addEventListener("click", async () => {
    const type = ui.reports?.type || "business";
    const from = ui.reports?.from || "";
    const to = ui.reports?.to || "";
    const studentId = ui.reports?.studentId || "";
    const tutorId = ui.reports?.tutorId || "";
    const status = ui.reports?.status || "";
    const report = buildReport(ctx, type, from, to, studentId, tutorId, status);
    ui.reports = { ...(ui.reports || {}), generating: true, ruleText: report.narrative, aiText: "" };
    rerender();
    const aiText = await generateAiSummary(state, report, from, to);
    ui.reports = { ...(ui.reports || {}), generating: false, aiText, ruleText: report.narrative };
    notify(aiText ? "AI summary generated" : "Smart summary generated (AI unavailable)");
    rerender();
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
    state.settings.theme = String(data.theme || "light");
    state.settings.aiEnabled = String(data.aiEnabled || "false") === "true";
    state.settings.aiEndpoint = String(data.aiEndpoint || "").trim();
    state.settings.aiModel = String(data.aiModel || "gpt-4o-mini").trim();
    state.settings.aiApiKey = String(data.aiApiKey || "").trim();
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

import { pingEndpoint, fetchRemoteSnapshot, exportSnapshotToGoogle } from "./api.js";
import { getSession, logout as clearAuthSession, setLocalAdminCredentials, updateAuthSettings } from "./auth.js";
import { logAttendance } from "./attendance.js";
import { backupToGoogleDrive, exportBackupCsv, exportBackupJson, restoreFromLocalFile, restoreLatestFromGoogleDrive } from "./backup.js";
import { createLesson, downloadLessonPdf, listLessons } from "./lessons.js";
import { createExpense, createPayment, getOutstandingPayments, listExpenses, listPayments } from "./payments.js";
import { buildAnalytics } from "./analytics.js";
import {
  buildDashboardSnapshot,
  buildFinanceReportRows,
  buildStudentProgressReport,
  downloadStudentReportPdf,
  exportAccountDataAsCsv,
  exportAccountDataAsExcel
} from "./reports.js";
import {
  getActiveProfile,
  getAccountIdFromProfile,
  getAppSettings,
  loadAccountSnapshot,
  patchAppSettings,
  removeSyncProfile,
  replaceAccountDataset,
  saveSyncProfile,
  setActiveProfile
} from "./storage.js";
import { createStudent, getStudentById, getStudentProfile, listStudents } from "./students.js";
import {
  StudentQrScanner,
  downloadCanvasPng,
  generateQrToCanvas,
  parseStudentIdFromQr,
  printCanvas
} from "./qr.js";
import { createScheduleEntry, exportScheduleAsImage, getScheduleForStudentDate, getScheduleRange, getWeekRange, listScheduleEntries } from "./scheduler.js";
import { getSyncStateSnapshot, refreshQueueCount, syncNow } from "./sync.js";
import {
  debounce,
  escapeHtml,
  formatCurrency,
  formatDate,
  monthKey,
  sanitizeNumber,
  sanitizeText,
  todayISODate
} from "./utils.js";

const state = {
  currentView: "dashboard",
  studentSearchQuery: "",
  prefillLessonStudentId: "",
  prefillLessonContext: null,
  latestStudentReport: null,
  scheduleViewMode: "week",
  scheduleAnchorDate: todayISODate(),
  dashboardFilters: {}
};

let refs = {};
let modalCleanup = null;

function setHTML(element, html) {
  element.innerHTML = html;
}

export function showToast(message, mode = "info") {
  if (!refs.toast) return;
  refs.toast.textContent = message;
  refs.toast.className = "toast is-visible";
  if (mode === "error") refs.toast.style.background = "rgba(134,25,25,.95)";
  else if (mode === "success") refs.toast.style.background = "rgba(15,105,65,.95)";
  else refs.toast.style.background = "rgba(14,58,103,.96)";
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    refs.toast.classList.remove("is-visible");
  }, 2500);
}

async function openModal(html, cleanup) {
  refs.modalRoot.classList.add("is-open");
  refs.modalRoot.innerHTML = `<div class="modal-backdrop">${html}</div>`;
  modalCleanup = cleanup || null;
}

async function closeModal() {
  if (typeof modalCleanup === "function") {
    await modalCleanup();
  }
  modalCleanup = null;
  refs.modalRoot.classList.remove("is-open");
  refs.modalRoot.innerHTML = "";
}

async function getViewData() {
  const [settings, profile] = await Promise.all([getAppSettings(), getActiveProfile()]);
  const accountId = getAccountIdFromProfile(profile);
  return { settings, profile, accountId };
}

function setActiveNav(view) {
  refs.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
}

function shiftDate(isoDate, days) {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildWeekDays(anchorDate) {
  const { fromDate } = getWeekRange(anchorDate);
  return Array.from({ length: 7 }, (_, index) => shiftDate(fromDate, index));
}

function buildMonthGrid(anchorDate) {
  const date = new Date(anchorDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, idx) => {
    const day = idx + 1;
    const dateObj = new Date(year, month, day);
    return {
      date: dateObj.toISOString().slice(0, 10),
      dayNumber: day
    };
  });
}

function paymentViewTemplate({ students, payments, outstanding, paymentTypes }) {
  const outstandingTotal = outstanding.reduce((sum, item) => sum + Number(item.balance || 0), 0);
  return `
    <section class="view" data-view-root="payments">
      <article class="card">
        <div class="card-title-row">
          <h2>Payment Tracking</h2>
          <span class="badge badge-warning">Outstanding: ${formatCurrency(outstandingTotal)}</span>
        </div>
        <form id="paymentForm" class="grid">
          <div class="split-3">
            <div class="field">
              <label for="payStudent">Student</label>
              <select id="payStudent" class="select" name="studentId" required>
                <option value="">Choose student</option>
                ${students.map((student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.firstName)} ${escapeHtml(student.surname)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="payDue">Amount Due</label>
              <input id="payDue" class="input" name="amountDue" type="number" min="0" step="0.01" required>
            </div>
            <div class="field">
              <label for="payPaid">Amount Paid</label>
              <input id="payPaid" class="input" name="amountPaid" type="number" min="0" step="0.01" required>
            </div>
          </div>
          <div class="split-3">
            <div class="field">
              <label for="payDate">Date</label>
              <input id="payDate" class="input" name="date" type="date" value="${todayISODate()}" required>
            </div>
            <div class="field">
              <label for="payMethod">Method</label>
              <select id="payMethod" class="select" name="method">
                ${paymentTypes.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="payNotes">Notes</label>
              <input id="payNotes" class="input" name="notes" type="text">
            </div>
          </div>
          <button class="btn btn-primary" type="submit">Save Payment</button>
        </form>
      </article>
      <article class="card">
        <div class="card-title-row">
          <h3>Payments</h3>
          <span class="badge badge-success">${payments.length} records</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Student</th><th>Due</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${payments.map((payment) => `
                <tr>
                  <td>${formatDate(payment.date)}</td>
                  <td>${escapeHtml(payment.studentId || "")}</td>
                  <td>${formatCurrency(payment.amountDue || 0)}</td>
                  <td>${formatCurrency(payment.amountPaid || 0)}</td>
                  <td>${formatCurrency(payment.balance || 0)}</td>
                  <td><span class="badge ${payment.balance > 0 ? "badge-warning" : "badge-success"}">${escapeHtml(payment.status || "paid")}</span></td>
                </tr>
              `).join("") || `<tr><td colspan="6">No payments logged.</td></tr>`}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function expensesViewTemplate({ expenses, monthlyRows }) {
  return `
    <section class="view" data-view-root="expenses">
      <article class="card">
        <div class="card-title-row">
          <h2>Business Expenses</h2>
        </div>
        <form id="expenseForm" class="grid">
          <div class="split-3">
            <div class="field">
              <label for="expenseDate">Date</label>
              <input id="expenseDate" class="input" name="date" type="date" value="${todayISODate()}" required>
            </div>
            <div class="field">
              <label for="expenseAmount">Amount</label>
              <input id="expenseAmount" class="input" name="amount" type="number" min="0" step="0.01" required>
            </div>
            <div class="field">
              <label for="expenseCategory">Category</label>
              <input id="expenseCategory" class="input" name="category" type="text" placeholder="Printing / Transport / Supplies" required>
            </div>
          </div>
          <div class="field">
            <label for="expenseNotes">Notes</label>
            <textarea id="expenseNotes" class="textarea" name="notes"></textarea>
          </div>
          <button class="btn btn-primary" type="submit">Save Expense</button>
        </form>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Monthly Expense Report</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Net</th></tr>
            </thead>
            <tbody>
              ${monthlyRows.map((row) => `
                <tr>
                  <td>${escapeHtml(row.month)}</td>
                  <td>${formatCurrency(row.revenue)}</td>
                  <td>${formatCurrency(row.expenses)}</td>
                  <td>${formatCurrency(row.net)}</td>
                </tr>
              `).join("") || `<tr><td colspan="4">No financial data yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Expense Log</h3>
          <span class="badge badge-warning">${expenses.length} entries</span>
        </div>
        <div class="list">
          ${expenses.map((expense) => `
            <div class="list-item">
              <div class="list-item-main">
                <div class="list-item-title">${formatDate(expense.date)} • ${escapeHtml(expense.category || "")}</div>
                <div class="list-item-sub">${escapeHtml(expense.notes || "-")}</div>
              </div>
              <span class="badge badge-danger">${formatCurrency(expense.amount || 0)}</span>
            </div>
          `).join("") || `<div class="empty-state">No expenses logged yet.</div>`}
        </div>
      </article>
    </section>
  `;
}

function reportsViewTemplate({ students, financeRows, latestReport }) {
  return `
    <section class="view" data-view-root="reports">
      <article class="card">
        <div class="card-title-row">
          <h2>Reports & Exports</h2>
        </div>
        <div class="action-row">
          <button class="btn btn-primary" id="exportCsvBtn" type="button">Export CSV</button>
          <button class="btn btn-secondary" id="exportExcelBtn" type="button">Export Excel</button>
        </div>
        <p class="help-text">Exports include students, lessons, attendance, payments, expenses, and generated reports.</p>
      </article>
      <article class="card">
        <div class="card-title-row">
          <h3>Student Progress Report</h3>
        </div>
        <form id="studentReportForm" class="split-2">
          <div class="field">
            <label for="reportStudent">Student</label>
            <select id="reportStudent" class="select" name="studentId" required>
              <option value="">Choose student</option>
              ${students.map((student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.firstName)} ${escapeHtml(student.surname)}</option>`).join("")}
            </select>
          </div>
          <div class="action-row">
            <button class="btn btn-primary" type="submit">Generate Report</button>
            <button class="btn btn-outline" id="downloadStudentReportBtn" type="button" ${latestReport ? "" : "disabled"}>Download PDF</button>
          </div>
        </form>
        ${latestReport ? `
          <div class="list-item">
            <div class="list-item-main">
              <div class="list-item-title">${escapeHtml(latestReport.summary.studentName)}</div>
              <div class="list-item-sub">
                Lessons: ${latestReport.summary.lessons} • Attendance: ${latestReport.summary.attendance} • Outstanding: ${formatCurrency(latestReport.summary.outstanding)}
              </div>
            </div>
          </div>
        ` : `<p class="help-text">Generate a student progress report to preview and download.</p>`}
      </article>
      <article class="card">
        <div class="card-title-row">
          <h3>Finance Summary</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Net</th></tr></thead>
            <tbody>
              ${financeRows.map((row) => `
                <tr>
                  <td>${escapeHtml(row.month)}</td>
                  <td>${formatCurrency(row.revenue)}</td>
                  <td>${formatCurrency(row.expenses)}</td>
                  <td>${formatCurrency(row.net)}</td>
                </tr>
              `).join("") || `<tr><td colspan="4">No financial data yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function updateHeaderProfile(profile) {
  const label = profile.label || profile.gmail || profile.id;
  refs.activeAccountLabel.textContent = profile.gmail ? `${label} (${profile.gmail})` : label;
}

async function renderDashboard() {
  const { accountId, profile, settings } = await getViewData();
  if (!state.dashboardFilters || Object.keys(state.dashboardFilters).length === 0) {
    state.dashboardFilters = { ...(settings.dashboardFilters || {}) };
  }
  const { dashboardViewTemplate } = await import("../components/dashboard.js");
  const [snapshot, students, lessons, scheduleEntries] = await Promise.all([
    buildDashboardSnapshot(accountId, state.dashboardFilters),
    listStudents(accountId),
    listLessons(accountId),
    listScheduleEntries(accountId, state.dashboardFilters)
  ]);

  const gradeFilter = state.dashboardFilters.grade || "";
  const filteredStudents = gradeFilter ? students.filter((student) => student.grade === gradeFilter) : students;
  const studentIds = new Set(filteredStudents.map((student) => student.id));
  const filteredLessons = lessons.filter((lesson) => studentIds.has(lesson.studentId));
  const filteredSchedule = scheduleEntries.filter((entry) => studentIds.has(entry.studentId));

  const analytics = buildAnalytics({
    students: filteredStudents,
    lessons: filteredLessons,
    schedule: filteredSchedule,
    filters: state.dashboardFilters
  });

  setHTML(refs.main, dashboardViewTemplate({
    ...snapshot,
    analytics,
    filters: state.dashboardFilters,
    filterOptions: {
      students: students.map((student) => ({ id: student.id, name: `${student.firstName} ${student.surname}` })),
      subjects: settings.subjects || [],
      grades: settings.grades || []
    }
  }));
  updateHeaderProfile(profile);

  refs.main.querySelector("#dashboardFilterApplyForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.dashboardFilters = {
      studentId: sanitizeText(form.get("studentId"), 120),
      subject: sanitizeText(form.get("subject"), 80),
      grade: sanitizeText(form.get("grade"), 32),
      fromDate: sanitizeText(form.get("fromDate"), 20),
      toDate: sanitizeText(form.get("toDate"), 20)
    };
    await patchAppSettings({ dashboardFilters: state.dashboardFilters });
    await renderDashboard();
  });
  refs.main.querySelector("#dashboardFilterResetBtn")?.addEventListener("click", async () => {
    state.dashboardFilters = { studentId: "", subject: "", grade: "", fromDate: "", toDate: "" };
    await patchAppSettings({ dashboardFilters: state.dashboardFilters });
    await renderDashboard();
  });
}

async function renderStudents() {
  const { settings, accountId, profile } = await getViewData();
  const { studentManagementTemplate, studentProfileModalTemplate, studentQrModalTemplate } = await import("../components/studentProfile.js");
  const students = await listStudents(accountId, state.studentSearchQuery);

  setHTML(refs.main, studentManagementTemplate({
    students,
    grades: settings.grades,
    subjects: settings.subjects,
    customFields: settings.customStudentFields,
    searchQuery: state.studentSearchQuery
  }));
  updateHeaderProfile(profile);

  const searchInput = refs.main.querySelector("#studentSearch");
  searchInput?.addEventListener("input", debounce(async (event) => {
    state.studentSearchQuery = event.target.value;
    await renderStudents();
  }, 240));

  refs.main.querySelector("#studentForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const customFields = {};
    settings.customStudentFields.forEach((field) => {
      customFields[field.key] = form.get(`custom_${field.key}`) || "";
    });
    try {
      const subjectValues = [form.get("subjectPrimary"), form.get("subjectSecondary")]
        .map((item) => sanitizeText(item || "", 80))
        .filter(Boolean);
      await createStudent({
        firstName: form.get("firstName"),
        surname: form.get("surname"),
        grade: form.get("grade"),
        subjects: subjectValues,
        customFields,
        notes: form.get("notes")
      }, accountId);
      showToast("Student saved.", "success");
      formElement?.reset();
      await refreshQueueCount();
      await renderStudents();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  refs.main.querySelector("#btnOpenScanner")?.addEventListener("click", async () => {
    const { qrScannerModalTemplate } = await import("../components/qrScanner.js");
    await openModal(qrScannerModalTemplate());
    const scanner = new StudentQrScanner("qrScannerRegion");
    const settingsNow = await getAppSettings();

    const handleScan = async (decodedText) => {
      const studentId = parseStudentIdFromQr(decodedText, settingsNow.qrFormat);
      const student = await getStudentById(studentId);
      if (!student || student.accountId !== accountId) {
        showToast("Scanned code did not match an active student.", "error");
        return;
      }
      const scheduledLesson = await getScheduleForStudentDate(accountId, student.id, todayISODate());
      await logAttendance({
        studentId: student.id,
        checkInMethod: "qr",
        lessonId: scheduledLesson?.id || ""
      }, accountId);
      await createLesson({
        studentId: student.id,
        date: scheduledLesson?.date || todayISODate(),
        subject: scheduledLesson?.subject || student.subjects?.[0] || settingsNow.subjects?.[0] || "General",
        category: scheduledLesson?.category || settingsNow.lessonCategories?.[0] || "",
        durationMinutes: scheduledLesson?.durationMinutes || settingsNow.defaultLessonDuration || 60,
        lessonNotes: scheduledLesson?.lessonNotes || "Session started via QR check-in",
        homeworkAssigned: "",
        progressSummary: "",
        status: "in_progress"
      }, accountId);
      state.prefillLessonStudentId = student.id;
      state.prefillLessonContext = {
        studentId: student.id,
        studentName: `${student.firstName} ${student.surname}`,
        scheduledLesson
      };
      await scanner.stop();
      await closeModal();
      showToast(`${student.firstName} checked in. Attendance recorded and lesson opened.`, "success");
      await refreshQueueCount();
      await navigate("lessons");
    };

    try {
      await scanner.start(handleScan);
      refs.modalRoot.querySelector("#stopScannerBtn")?.addEventListener("click", async () => {
        await scanner.stop();
        await closeModal();
      });
      modalCleanup = async () => scanner.stop();
    } catch (error) {
      const detail = String(error?.message || "Camera could not start.");
      const secureHint = window.isSecureContext ? "" : " Use HTTPS or install the app before scanning.";
      showToast(`Unable to start scanner: ${detail}${secureHint}`, "error");
      await closeModal();
    }
  });

  refs.main.querySelectorAll("[data-action='open-profile']").forEach((button) => {
    button.addEventListener("click", async () => {
      const studentId = button.dataset.studentId;
      const profileData = await getStudentProfile(studentId, accountId);
      if (!profileData) {
        showToast("Student profile not found.", "error");
        return;
      }
      await openModal(studentProfileModalTemplate(profileData));
    });
  });

  refs.main.querySelectorAll("[data-action='open-qr']").forEach((button) => {
    button.addEventListener("click", async () => {
      const studentId = button.dataset.studentId;
      const student = await getStudentById(studentId);
      if (!student) return;
      await openModal(studentQrModalTemplate(student));
      const canvas = refs.modalRoot.querySelector("#studentQrCanvas");
      await generateQrToCanvas(canvas, student.qrValue || "");
      refs.modalRoot.querySelector("#downloadQrBtn")?.addEventListener("click", () => {
        downloadCanvasPng(canvas, `${student.firstName}-${student.surname}-qr.png`);
      });
      refs.modalRoot.querySelector("#printQrBtn")?.addEventListener("click", () => {
        printCanvas(canvas, `${student.firstName} ${student.surname} - QR`);
      });
    });
  });
}

async function renderSchedule() {
  const { settings, accountId, profile } = await getViewData();
  const { calendarTemplate } = await import("../components/calendar.js");
  const students = await listStudents(accountId);

  if (!state.scheduleAnchorDate) {
    state.scheduleAnchorDate = todayISODate();
  }

  let rangeFrom = state.scheduleAnchorDate;
  let rangeTo = state.scheduleAnchorDate;
  const weekDays = buildWeekDays(state.scheduleAnchorDate);
  const monthGrid = buildMonthGrid(state.scheduleAnchorDate);

  if (state.scheduleViewMode === "week") {
    const weekRange = getWeekRange(state.scheduleAnchorDate);
    rangeFrom = weekRange.fromDate;
    rangeTo = weekRange.toDate;
  }
  if (state.scheduleViewMode === "month") {
    rangeFrom = monthGrid[0]?.date || state.scheduleAnchorDate;
    rangeTo = monthGrid[monthGrid.length - 1]?.date || state.scheduleAnchorDate;
  }

  const entries = await getScheduleRange(accountId, rangeFrom, rangeTo);
  setHTML(refs.main, calendarTemplate({
    dateAnchor: state.scheduleAnchorDate,
    viewMode: state.scheduleViewMode,
    students,
    subjects: settings.subjects || [],
    lessonCategories: settings.lessonCategories || [],
    scheduleFields: settings.scheduleCustomFields || [],
    entries,
    weekDays,
    monthGrid
  }));
  updateHeaderProfile(profile);

  refs.main.querySelector("#scheduleForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customFields = {};
    (settings.scheduleCustomFields || []).forEach((field) => {
      customFields[field.key] = form.get(`custom_${field.key}`) || "";
    });
    try {
      await createScheduleEntry({
        date: form.get("date"),
        timeStart: form.get("timeStart"),
        durationMinutes: form.get("durationMinutes"),
        studentId: form.get("studentId"),
        subject: form.get("subject"),
        category: form.get("category"),
        lessonNotes: form.get("lessonNotes"),
        customFields
      }, accountId);
      showToast("Schedule item saved.", "success");
      await refreshQueueCount();
      await renderSchedule();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  refs.main.querySelectorAll("[data-action='schedule-mode']").forEach((button) => {
    button.addEventListener("click", async () => {
      state.scheduleViewMode = button.dataset.mode;
      await patchAppSettings({ ui: { scheduleViewMode: state.scheduleViewMode, scheduleAnchorDate: state.scheduleAnchorDate } });
      await renderSchedule();
    });
  });

  refs.main.querySelector("[data-action='schedule-prev']")?.addEventListener("click", async () => {
    const step = state.scheduleViewMode === "day" ? -1 : state.scheduleViewMode === "week" ? -7 : -30;
    state.scheduleAnchorDate = shiftDate(state.scheduleAnchorDate, step);
    await patchAppSettings({ ui: { scheduleViewMode: state.scheduleViewMode, scheduleAnchorDate: state.scheduleAnchorDate } });
    await renderSchedule();
  });
  refs.main.querySelector("[data-action='schedule-next']")?.addEventListener("click", async () => {
    const step = state.scheduleViewMode === "day" ? 1 : state.scheduleViewMode === "week" ? 7 : 30;
    state.scheduleAnchorDate = shiftDate(state.scheduleAnchorDate, step);
    await patchAppSettings({ ui: { scheduleViewMode: state.scheduleViewMode, scheduleAnchorDate: state.scheduleAnchorDate } });
    await renderSchedule();
  });
  refs.main.querySelector("[data-action='schedule-today']")?.addEventListener("click", async () => {
    state.scheduleAnchorDate = todayISODate();
    await patchAppSettings({ ui: { scheduleViewMode: state.scheduleViewMode, scheduleAnchorDate: state.scheduleAnchorDate } });
    await renderSchedule();
  });

  refs.main.querySelectorAll("[data-action='schedule-export']").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const region = refs.main.querySelector("#scheduleExportRegion");
        await exportScheduleAsImage(region, button.dataset.format || "png");
        showToast(`Schedule exported (${button.dataset.format?.toUpperCase() || "PNG"}).`, "success");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

async function renderLessons() {
  const { settings, accountId, profile } = await getViewData();
  const { lessonEditorTemplate } = await import("../components/lessonEditor.js");
  const [students, lessons] = await Promise.all([
    listStudents(accountId),
    listLessons(accountId)
  ]);

  setHTML(refs.main, lessonEditorTemplate({
    lessons,
    students,
    subjects: settings.subjects,
    lessonCategories: settings.lessonCategories || [],
    defaultDuration: settings.defaultLessonDuration,
    prefillStudentId: state.prefillLessonStudentId,
    prefillContext: state.prefillLessonContext
  }));
  const currentPrefill = state.prefillLessonContext;
  state.prefillLessonStudentId = "";
  state.prefillLessonContext = null;
  updateHeaderProfile(profile);

  const dateInput = refs.main.querySelector("#lessonDate");
  if (dateInput) dateInput.value = todayISODate();
  if (currentPrefill?.scheduledLesson) {
    const scheduled = currentPrefill.scheduledLesson;
    const noteInput = refs.main.querySelector("#lessonNotes");
    const subjectInput = refs.main.querySelector("#lessonSubject");
    const dateField = refs.main.querySelector("#lessonDate");
    if (dateField) dateField.value = scheduled.date || todayISODate();
    if (subjectInput && scheduled.subject) subjectInput.value = scheduled.subject;
    if (noteInput && scheduled.lessonNotes) noteInput.value = scheduled.lessonNotes;
    const categoryField = refs.main.querySelector("#lessonCategory");
    if (categoryField && scheduled.category) categoryField.value = scheduled.category;
    const durationField = refs.main.querySelector("#lessonDuration");
    if (durationField && scheduled.durationMinutes) durationField.value = String(scheduled.durationMinutes);
  }

  refs.main.querySelector("#lessonForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await createLesson({
        date: form.get("date"),
        studentId: form.get("studentId"),
        subject: form.get("subject"),
        category: form.get("category"),
        durationMinutes: form.get("durationMinutes"),
        lessonNotes: form.get("lessonNotes"),
        homeworkAssigned: form.get("homeworkAssigned"),
        progressSummary: form.get("progressSummary"),
        homeworkCompleted: String(form.get("homeworkCompleted")) === "true",
        status: "completed"
      }, accountId);
      showToast("Lesson saved.", "success");
      formElement?.reset();
      await refreshQueueCount();
      await renderLessons();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  refs.main.querySelectorAll("[data-action='lesson-pdf']").forEach((button) => {
    button.addEventListener("click", async () => {
      const lesson = lessons.find((entry) => entry.id === button.dataset.lessonId);
      if (!lesson) return;
      const student = students.find((entry) => entry.id === lesson.studentId);
      try {
        downloadLessonPdf(lesson, student ? `${student.firstName} ${student.surname}` : lesson.studentId);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  refs.main.querySelectorAll("[data-action='lesson-share']").forEach((button) => {
    button.addEventListener("click", async () => {
      const lesson = lessons.find((entry) => entry.id === button.dataset.lessonId);
      if (!lesson) return;
      const student = students.find((entry) => entry.id === lesson.studentId);
      const studentName = student ? `${student.firstName} ${student.surname}` : lesson.studentId;
      const template = settings.parentCommunicationTemplate || "Today {student} worked on {subject}. Homework: {homework}. Notes: {progress}.";
      const message = template
        .replaceAll("{student}", studentName)
        .replaceAll("{subject}", lesson.subject || "General")
        .replaceAll("{homework}", lesson.homeworkAssigned || "No homework assigned")
        .replaceAll("{progress}", lesson.progressSummary || lesson.lessonNotes || "-");
      const parentPhone = student?.customFields?.parentContact || student?.customFields?.parentPhone || "";
      const parentEmail = student?.customFields?.parentEmail || "";
      await openModal(`
        <section class="modal">
          <div class="card-title-row">
            <h2>Parent Communication</h2>
            <button class="btn btn-outline btn-small" data-modal-close type="button">Close</button>
          </div>
          <p class="help-text">Generated from lesson details.</p>
          <div class="field">
            <label for="parentMessageText">Message</label>
            <textarea id="parentMessageText" class="textarea">${escapeHtml(message)}</textarea>
          </div>
          <div class="action-row">
            <button class="btn btn-outline btn-small" id="copyParentMessageBtn" type="button">Copy</button>
            <a class="btn btn-secondary btn-small" href="https://wa.me/${encodeURIComponent(parentPhone)}?text=${encodeURIComponent(message)}" target="_blank" rel="noopener">WhatsApp</a>
            <a class="btn btn-outline btn-small" href="mailto:${encodeURIComponent(parentEmail)}?subject=${encodeURIComponent("Lesson Summary")}&body=${encodeURIComponent(message)}">Email</a>
          </div>
        </section>
      `);
      refs.modalRoot.querySelector("#copyParentMessageBtn")?.addEventListener("click", async () => {
        const text = refs.modalRoot.querySelector("#parentMessageText")?.value || message;
        await navigator.clipboard.writeText(text);
        showToast("Message copied.", "success");
      });
    });
  });
}

async function renderPayments() {
  const { accountId, profile, settings } = await getViewData();
  const [students, payments, outstanding] = await Promise.all([
    listStudents(accountId),
    listPayments(accountId),
    getOutstandingPayments(accountId)
  ]);
  setHTML(refs.main, paymentViewTemplate({ students, payments, outstanding, paymentTypes: settings.paymentTypes || ["EFT", "Cash", "Card"] }));
  updateHeaderProfile(profile);

  refs.main.querySelector("#paymentForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await createPayment({
        studentId: form.get("studentId"),
        amountDue: form.get("amountDue"),
        amountPaid: form.get("amountPaid"),
        date: form.get("date"),
        method: form.get("method"),
        notes: form.get("notes")
      }, accountId);
      showToast("Payment saved.", "success");
      formElement?.reset();
      await refreshQueueCount();
      await renderPayments();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function renderExpenses() {
  const { accountId, profile } = await getViewData();
  const [expenses, payments] = await Promise.all([
    listExpenses(accountId),
    listPayments(accountId)
  ]);
  const monthlyRows = buildFinanceReportRows(payments, expenses);
  setHTML(refs.main, expensesViewTemplate({ expenses, monthlyRows }));
  updateHeaderProfile(profile);

  refs.main.querySelector("#expenseForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await createExpense({
        date: form.get("date"),
        amount: form.get("amount"),
        category: form.get("category"),
        notes: form.get("notes")
      }, accountId);
      showToast("Expense saved.", "success");
      formElement?.reset();
      await refreshQueueCount();
      await renderExpenses();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function renderReports() {
  const { accountId, profile } = await getViewData();
  const [students, payments, expenses] = await Promise.all([
    listStudents(accountId),
    listPayments(accountId),
    listExpenses(accountId)
  ]);

  const financeRows = buildFinanceReportRows(payments, expenses);
  setHTML(refs.main, reportsViewTemplate({
    students,
    financeRows,
    latestReport: state.latestStudentReport
  }));
  updateHeaderProfile(profile);

  refs.main.querySelector("#exportCsvBtn")?.addEventListener("click", async () => {
    await exportAccountDataAsCsv(accountId);
    showToast("CSV exported.", "success");
  });
  refs.main.querySelector("#exportExcelBtn")?.addEventListener("click", async () => {
    try {
      await exportAccountDataAsExcel(accountId);
      showToast("Excel exported.", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  refs.main.querySelector("#studentReportForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const studentId = sanitizeText(form.get("studentId"), 120);
    if (!studentId) return;
    try {
      state.latestStudentReport = await buildStudentProgressReport(accountId, studentId);
      showToast("Student report generated.", "success");
      await refreshQueueCount();
      await renderReports();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  refs.main.querySelector("#downloadStudentReportBtn")?.addEventListener("click", () => {
    if (!state.latestStudentReport) return;
    try {
      downloadStudentReportPdf(state.latestStudentReport);
      showToast("Student PDF downloaded.", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function applyUniqueAdd(list, value) {
  const clean = sanitizeText(value, 80);
  if (!clean) return list;
  if (list.includes(clean)) return list;
  return [...list, clean];
}

async function renderSettings() {
  const { settings, accountId, profile } = await getViewData();
  const session = await getSession();
  const { settingsTemplate } = await import("../components/settings.js");
  setHTML(refs.main, settingsTemplate({ settings, session }));
  updateHeaderProfile(profile);

  refs.main.querySelector("#syncProfileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await saveSyncProfile({
        label: form.get("label"),
        gmail: form.get("gmail"),
        endpoint: form.get("endpoint"),
        active: true
      });
      showToast("Sync profile saved.", "success");
      formElement?.reset();
      await renderSettings();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  refs.main.querySelector("#linkGoogleSessionBtn")?.addEventListener("click", async () => {
    const email = sanitizeText(session?.email || "", 160).toLowerCase();
    if (!email) {
      showToast("No Google login session found. Enable Google login and sign in first.", "error");
      return;
    }
    const existing = (settings.syncProfiles || []).find((item) => sanitizeText(item.gmail || "", 160).toLowerCase() === email);
    const endpoint = window.prompt(
      "Paste the Google Apps Script endpoint for this Gmail account (you can leave it as-is if already set):",
      existing?.endpoint || settings.auth?.googleSheetsEndpoint || ""
    );
    if (endpoint === null) return;
    await saveSyncProfile({
      id: existing?.id,
      label: existing?.label || session?.displayName || email,
      gmail: email,
      endpoint,
      active: true
    });
    showToast("Google account linked and activated.", "success");
    await refreshQueueCount();
    await renderSettings();
  });

  refs.main.querySelector("#activeProfileSelect")?.addEventListener("change", async (event) => {
    await setActiveProfile(event.target.value);
    showToast("Active account switched.", "success");
    await refreshQueueCount();
    await renderSettings();
  });

  refs.main.querySelector("#platformSettingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await patchAppSettings({
      businessName: sanitizeText(form.get("businessName"), 120) || "X-Factor Tutoring",
      defaultLessonDuration: Math.max(15, sanitizeNumber(form.get("defaultLessonDuration"), 60)),
      qrFormat: sanitizeText(form.get("qrFormat"), 120) || "XFACTOR:{id}"
    });
    showToast("Platform settings saved.", "success");
    await renderSettings();
  });

  refs.main.querySelector("#authSettingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await updateAuthSettings({
      localEnabled: String(form.get("localEnabled")) === "true",
      googleEnabled: String(form.get("googleEnabled")) === "true",
      googleClientId: form.get("googleClientId"),
      googleSheetsEndpoint: form.get("googleSheetsEndpoint"),
      allowedGoogleEmail: form.get("allowedGoogleEmail"),
      sessionTtlHours: Math.max(12, sanitizeNumber(form.get("sessionTtlHours"), 336))
    });
    showToast("Authentication settings updated.", "success");
    await renderSettings();
  });

  refs.main.querySelector("#localAdminPasswordForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirmPassword") || "");
    if (password !== confirm) {
      showToast("Passwords do not match.", "error");
      return;
    }
    try {
      await setLocalAdminCredentials(form.get("username"), password);
      showToast("Local admin password updated.", "success");
      formElement?.reset();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  refs.main.querySelectorAll("[data-action='activate-profile']").forEach((button) => {
    button.addEventListener("click", async () => {
      await setActiveProfile(button.dataset.profileId);
      showToast("Active account switched.", "success");
      await refreshQueueCount();
      await renderSettings();
    });
  });

  refs.main.querySelectorAll("[data-action='delete-profile']").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await removeSyncProfile(button.dataset.profileId);
        showToast("Sync profile removed.", "success");
        await renderSettings();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  refs.main.querySelector("#testEndpointBtn")?.addEventListener("click", async () => {
    const endpoint = refs.main.querySelector("#profileEndpoint")?.value || profile.endpoint || settings.auth?.googleSheetsEndpoint || "";
    try {
      await pingEndpoint(endpoint);
      showToast("Endpoint connection successful.", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  refs.main.querySelector("#pullRemoteBtn")?.addEventListener("click", async () => {
    try {
      const active = await getActiveProfile();
      const remote = await fetchRemoteSnapshot({
        ...active,
        endpoint: active.endpoint || settings.auth?.googleSheetsEndpoint || ""
      });
      await replaceAccountDataset(active.id, remote);
      showToast("Pulled latest data from Google Sheet.", "success");
      await renderSettings();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  refs.main.querySelector("#customFieldForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = sanitizeText(form.get("label"), 80);
    const key = sanitizeText(form.get("key"), 40).replace(/\s+/g, "");
    const type = sanitizeText(form.get("type"), 20) === "textarea" ? "textarea" : "text";
    if (!label || !key) {
      showToast("Custom field label and key are required.", "error");
      return;
    }
    const nextFields = settings.customStudentFields
      .filter((entry) => entry.key !== key)
      .concat([{ key, label, type }]);
    await patchAppSettings({ customStudentFields: nextFields });
    showToast("Custom field saved.", "success");
    await renderSettings();
  });

  refs.main.querySelectorAll("[data-action='remove-custom-field']").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.dataset.value;
      const nextFields = settings.customStudentFields.filter((entry) => entry.key !== key);
      await patchAppSettings({ customStudentFields: nextFields });
      showToast("Custom field removed.", "success");
      await renderSettings();
    });
  });

  refs.main.querySelector("#subjectForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("subject");
    await patchAppSettings({ subjects: applyUniqueAdd(settings.subjects, value) });
    showToast("Subject added.", "success");
    await renderSettings();
  });
  refs.main.querySelector("#gradeForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("grade");
    await patchAppSettings({ grades: applyUniqueAdd(settings.grades, value) });
    showToast("Grade added.", "success");
    await renderSettings();
  });

  refs.main.querySelectorAll("[data-action='remove-subject']").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.value;
      await patchAppSettings({ subjects: settings.subjects.filter((item) => item !== value) });
      showToast("Subject removed.", "success");
      await renderSettings();
    });
  });

  refs.main.querySelectorAll("[data-action='remove-grade']").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.value;
      await patchAppSettings({ grades: settings.grades.filter((item) => item !== value) });
      showToast("Grade removed.", "success");
      await renderSettings();
    });
  });

  refs.main.querySelector("#lessonCategoryForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await patchAppSettings({ lessonCategories: applyUniqueAdd(settings.lessonCategories || [], form.get("lessonCategory")) });
    showToast("Lesson category added.", "success");
    await renderSettings();
  });

  refs.main.querySelector("#paymentTypeForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("paymentType");
    await patchAppSettings({ paymentTypes: applyUniqueAdd(settings.paymentTypes || [], value) });
    showToast("Payment type added.", "success");
    await renderSettings();
  });

  refs.main.querySelector("#scheduleFieldForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = sanitizeText(form.get("label"), 80);
    const key = sanitizeText(form.get("key"), 40).replace(/\s+/g, "");
    const type = sanitizeText(form.get("type"), 20) === "textarea" ? "textarea" : "text";
    if (!label || !key) {
      showToast("Schedule field label and key are required.", "error");
      return;
    }
    const next = (settings.scheduleCustomFields || []).filter((entry) => entry.key !== key).concat([{ key, label, type }]);
    await patchAppSettings({ scheduleCustomFields: next });
    showToast("Schedule field saved.", "success");
    await renderSettings();
  });

  refs.main.querySelectorAll("[data-action='remove-lesson-category']").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.value;
      await patchAppSettings({ lessonCategories: (settings.lessonCategories || []).filter((item) => item !== value) });
      showToast("Lesson category removed.", "success");
      await renderSettings();
    });
  });

  refs.main.querySelectorAll("[data-action='remove-payment-type']").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.value;
      await patchAppSettings({ paymentTypes: (settings.paymentTypes || []).filter((item) => item !== value) });
      showToast("Payment type removed.", "success");
      await renderSettings();
    });
  });

  refs.main.querySelectorAll("[data-action='remove-schedule-field']").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.dataset.value;
      await patchAppSettings({ scheduleCustomFields: (settings.scheduleCustomFields || []).filter((entry) => entry.key !== key) });
      showToast("Schedule field removed.", "success");
      await renderSettings();
    });
  });

  refs.main.querySelector("#dashboardFilterForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextFilters = {
      studentId: sanitizeText(form.get("studentId"), 120),
      subject: sanitizeText(form.get("subject"), 80),
      grade: sanitizeText(form.get("grade"), 32),
      fromDate: sanitizeText(form.get("fromDate"), 20),
      toDate: sanitizeText(form.get("toDate"), 20)
    };
    await patchAppSettings({ dashboardFilters: nextFilters });
    state.dashboardFilters = { ...nextFilters };
    showToast("Dashboard filters saved.", "success");
  });

  refs.main.querySelector("#backupSettingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await patchAppSettings({
      backup: {
        ...settings.backup,
        encryptBackups: String(form.get("encryptBackups")) === "true",
        includeReports: String(form.get("includeReports")) === "true",
        backupPassphraseHint: sanitizeText(form.get("backupPassphraseHint"), 120)
      }
    });
    showToast("Backup settings saved.", "success");
    await renderSettings();
  });

  refs.main.querySelector("#backupJsonBtn")?.addEventListener("click", async () => {
    try {
      const passphrase = window.prompt("Enter backup passphrase (required when encryption is enabled):", "") || "";
      await exportBackupJson(accountId, settings.backup || {}, passphrase);
      showToast("JSON backup exported.", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  refs.main.querySelector("#backupCsvBtn")?.addEventListener("click", async () => {
    await exportBackupCsv(accountId);
    showToast("CSV backup exported.", "success");
  });

  refs.main.querySelector("#backupDriveBtn")?.addEventListener("click", async () => {
    try {
      const passphrase = window.prompt("Enter backup passphrase for Drive backup:", "") || "";
      await backupToGoogleDrive(accountId, passphrase);
      showToast("Backup uploaded to Google Drive.", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  refs.main.querySelector("#restoreLocalBtn")?.addEventListener("click", async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const passphrase = window.prompt("Enter backup passphrase if file is encrypted:", "") || "";
        await restoreFromLocalFile(accountId, file, passphrase);
        showToast("Local backup restored.", "success");
        await refreshQueueCount();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
    input.click();
  });

  refs.main.querySelector("#restoreDriveBtn")?.addEventListener("click", async () => {
    try {
      const passphrase = window.prompt("Enter backup passphrase if Drive file is encrypted:", "") || "";
      await restoreLatestFromGoogleDrive(accountId, passphrase);
      showToast("Latest Google Drive backup restored.", "success");
      await refreshQueueCount();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  refs.main.querySelector("#exportGoogleBtn")?.addEventListener("click", async () => {
    try {
      const active = await getActiveProfile();
      const snapshot = await loadAccountSnapshot(accountId);
      await exportSnapshotToGoogle({
        ...active,
        endpoint: active.endpoint || settings.auth?.googleSheetsEndpoint || ""
      }, snapshot);
      showToast("All data exported to Google Sheet.", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

export async function navigate(view) {
  state.currentView = view;
  setActiveNav(view);
  await patchAppSettings({ ui: { lastView: view } });

  if (view === "dashboard") await renderDashboard();
  if (view === "students") await renderStudents();
  if (view === "schedule") await renderSchedule();
  if (view === "lessons") await renderLessons();
  if (view === "payments") await renderPayments();
  if (view === "expenses") await renderExpenses();
  if (view === "reports") await renderReports();
  if (view === "settings") await renderSettings();
}

export async function initUI(domRefs) {
  refs = domRefs;
  refs.modalRoot.addEventListener("click", async (event) => {
    if (event.target.matches(".modal-backdrop") || event.target.matches("[data-modal-close]")) {
      await closeModal();
    }
  });

  refs.navButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      await navigate(button.dataset.view);
    });
  });

  refs.syncNowBtn.addEventListener("click", async () => {
    const ok = await syncNow(false);
    await refreshQueueCount();
    const syncState = getSyncStateSnapshot();
    if (ok) {
      showToast("Manual sync finished.", "success");
      return;
    }
    showToast(syncState.lastError || "Sync skipped.", "error");
    if ((syncState.lastError || "").toLowerCase().includes("endpoint")) {
      await navigate("settings");
    }
  });

  refs.logoutBtn?.addEventListener("click", async () => {
    await clearAuthSession();
    window.location.reload();
  });

  const settings = await getAppSettings();
  state.dashboardFilters = { ...(settings.dashboardFilters || {}) };
  state.scheduleViewMode = settings.ui?.scheduleViewMode || "week";
  state.scheduleAnchorDate = settings.ui?.scheduleAnchorDate || todayISODate();
  state.currentView = settings.ui?.lastView || "dashboard";
  await navigate(state.currentView);
}

export function setConnectionStatusLabel(isOnline) {
  refs.connectionState.textContent = isOnline ? "Online" : "Offline";
  refs.connectionState.className = `status-pill ${isOnline ? "status-pill-success" : "status-pill-warning"}`;
}

export function setSyncStatusLabel({ queueCount, running, lastError }) {
  const status = running ? "Syncing..." : `Queue: ${queueCount ?? 0}`;
  refs.syncState.textContent = status;
  if (lastError) {
    refs.syncState.className = "status-pill status-pill-error";
    refs.syncState.title = lastError;
  } else if (running) {
    refs.syncState.className = "status-pill status-pill-warning";
    refs.syncState.title = "Synchronizing";
  } else {
    refs.syncState.className = "status-pill status-pill-success";
    refs.syncState.title = "All changes synchronized";
  }
}

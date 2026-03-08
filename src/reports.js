import { TABLES } from "./config.js";
import { listTodaysLessons, listUpcomingLessons } from "./lessons.js";
import { listTodaysAttendance } from "./attendance.js";
import { getOutstandingPayments, listExpenses, listPayments } from "./payments.js";
import { getStudentById } from "./students.js";
import { getAppSettings, listRecords, loadAccountSnapshot, saveRecord } from "./storage.js";
import {
  downloadText,
  formatCurrency,
  formatDate,
  formatDateTime,
  monthKey,
  sumBy,
  todayISODate,
  toCSV,
  uid
} from "./utils.js";

function applyFilters(records, filters = {}) {
  return records
    .filter((item) => !filters.studentId || item.studentId === filters.studentId)
    .filter((item) => !filters.subject || item.subject === filters.subject)
    .filter((item) => !filters.fromDate || item.date >= filters.fromDate)
    .filter((item) => !filters.toDate || item.date <= filters.toDate);
}

export async function buildDashboardSnapshot(accountId, filters = {}) {
  const [todayLessonsRaw, upcomingLessonsRaw, attendanceToday, paymentsRaw, outstandingRaw, expensesRaw, allLessonsRaw, scheduleRaw, studentsRaw] = await Promise.all([
    listTodaysLessons(accountId),
    listUpcomingLessons(accountId),
    listTodaysAttendance(accountId),
    listPayments(accountId),
    getOutstandingPayments(accountId),
    listExpenses(accountId),
    listRecords(TABLES.lessons, accountId),
    listRecords(TABLES.schedule, accountId),
    listRecords(TABLES.students, accountId)
  ]);
  const studentNameById = studentsRaw.reduce((acc, student) => {
    acc[student.id] = `${student.firstName || ""} ${student.surname || ""}`.trim();
    return acc;
  }, {});

  const todayLessons = applyFilters(todayLessonsRaw, filters).map((item) => ({
    ...item,
    studentName: studentNameById[item.studentId] || item.studentName || item.studentId
  }));
  const upcomingLessons = applyFilters(upcomingLessonsRaw, filters).map((item) => ({
    ...item,
    studentName: studentNameById[item.studentId] || item.studentName || item.studentId
  }));
  const allLessons = applyFilters(allLessonsRaw, filters);
  const schedule = applyFilters(scheduleRaw, filters).map((item) => ({
    ...item,
    studentName: studentNameById[item.studentId] || item.studentName || item.studentId
  }));
  const payments = applyFilters(paymentsRaw, filters);
  const outstanding = applyFilters(outstandingRaw, filters);
  const expenses = applyFilters(expensesRaw, filters);

  const currentMonth = monthKey();
  const monthlyRevenue = sumBy(payments.filter((payment) => monthKey(payment.date) === currentMonth), (item) => item.amountPaid);
  const monthlyExpenses = sumBy(expenses.filter((expense) => expense.month === currentMonth), (item) => item.amount);
  const outstandingAmount = sumBy(outstanding, (item) => item.balance);

  const recentActivity = [
    ...todayLessons.map((item) => ({ type: "lesson", dateTime: `${item.date}T12:00:00`, title: `Lesson ${item.subject || ""}`, details: item.lessonNotes || "" })),
    ...schedule.slice(0, 8).map((item) => ({ type: "schedule", dateTime: `${item.date}T${item.timeStart || "08:00"}`, title: "Scheduled lesson", details: `${item.studentName || item.studentId} ${item.subject}` })),
    ...attendanceToday.map((item) => ({ type: "attendance", dateTime: item.dateTime, title: "Student checked in", details: studentNameById[item.studentId] || item.studentId })),
    ...payments.slice(0, 8).map((item) => ({ type: "payment", dateTime: `${item.date}T12:00:00`, title: "Payment recorded", details: formatCurrency(item.amountPaid) }))
  ]
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
    .slice(0, 12);

  return {
    metrics: {
      lessonsToday: todayLessons.length,
      checkedInToday: attendanceToday.length,
      outstandingPayments: outstandingAmount,
      monthlyRevenue,
      monthlyExpenses
    },
    todayLessons,
    upcomingLessons: [...upcomingLessons, ...schedule.filter((entry) => entry.date >= todayISODate()).slice(0, 6)],
    recentActivity,
    lessonCount: allLessons.length,
    filtersApplied: filters
  };
}

export async function buildStudentProgressReport(accountId, studentId) {
  const [student, lessons, attendance, payments] = await Promise.all([
    getStudentById(studentId),
    listRecords(TABLES.lessons, accountId),
    listRecords(TABLES.attendance, accountId),
    listRecords(TABLES.payments, accountId)
  ]);
  if (!student) throw new Error("Student not found.");

  const studentLessons = lessons.filter((item) => item.studentId === studentId);
  const studentAttendance = attendance.filter((item) => item.studentId === studentId);
  const studentPayments = payments.filter((item) => item.studentId === studentId);
  const totalPaid = sumBy(studentPayments, (item) => item.amountPaid);
  const totalDue = sumBy(studentPayments, (item) => item.amountDue);

  const report = {
    id: uid("rpt"),
    type: "studentProgress",
    studentId,
    createdAt: new Date().toISOString(),
    summary: {
      studentName: `${student.firstName} ${student.surname}`,
      grade: student.grade,
      lessons: studentLessons.length,
      attendance: studentAttendance.length,
      totalPaid,
      totalDue,
      outstanding: Number((totalDue - totalPaid).toFixed(2))
    },
    lessons: studentLessons,
    attendance: studentAttendance,
    payments: studentPayments
  };
  await saveRecord(TABLES.reports, report, { accountId, queue: true, op: "upsert" });
  return report;
}

export function downloadStudentReportPdf(report) {
  const jsPdfNS = window.jspdf;
  if (!jsPdfNS?.jsPDF) throw new Error("PDF library unavailable.");
  const doc = new jsPdfNS.jsPDF();
  let y = 14;
  const push = (text, size = 11, gap = 6) => {
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text, 180);
    doc.text(wrapped, 14, y);
    y += wrapped.length * gap;
    if (y > 275) {
      doc.addPage();
      y = 14;
    }
  };

  push("Data Insights by Ray Student Progress Report", 16, 7);
  push(`Student: ${report.summary.studentName}`, 11, 6);
  push(`Grade: ${report.summary.grade}`, 11, 6);
  push(`Lessons Logged: ${report.summary.lessons}`, 11, 6);
  push(`Attendance Logs: ${report.summary.attendance}`, 11, 6);
  push(`Total Paid: ${formatCurrency(report.summary.totalPaid)}`, 11, 6);
  push(`Outstanding: ${formatCurrency(report.summary.outstanding)}`, 11, 7);

  push("Recent Lessons:", 13, 7);
  report.lessons.slice(0, 12).forEach((lesson) => {
    push(`${formatDate(lesson.date)} | ${lesson.subject} | ${lesson.progressSummary || lesson.lessonNotes || "-"}`, 10, 5);
  });
  doc.save(`student-report-${report.studentId}.pdf`);
}

function tableToRows(tableName, rows) {
  const headers = new Set(["id", "accountId", "createdAt", "updatedAt"]);
  rows.forEach((row) => Object.keys(row).forEach((key) => headers.add(key)));
  const headerRow = [...headers];
  const dataRows = rows.map((row) => headerRow.map((header) => row[header] ?? ""));
  return [[tableName], headerRow, ...dataRows, []];
}

export async function exportAccountDataAsCsv(accountId) {
  const snapshot = await loadAccountSnapshot(accountId);
  const segments = [];
  Object.entries(snapshot).forEach(([tableName, rows]) => {
    segments.push(...tableToRows(tableName, rows));
  });
  const csv = toCSV(segments);
  downloadText(`data-insights-${accountId}-${monthKey()}.csv`, csv, "text/csv;charset=utf-8");
}

export async function exportAccountDataAsExcel(accountId) {
  const xlsx = window.XLSX;
  if (!xlsx?.utils) throw new Error("XLSX library unavailable.");
  const snapshot = await loadAccountSnapshot(accountId);
  const workbook = xlsx.utils.book_new();
  Object.entries(snapshot).forEach(([tableName, rows]) => {
    const normalizedRows = rows.map((row) => {
      const clean = {};
      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === "object") {
          clean[key] = JSON.stringify(value);
        } else {
          clean[key] = value;
        }
      });
      return clean;
    });
    const sheet = xlsx.utils.json_to_sheet(normalizedRows);
    xlsx.utils.book_append_sheet(workbook, sheet, tableName.slice(0, 31));
  });
  xlsx.writeFile(workbook, `data-insights-${accountId}-${monthKey()}.xlsx`);
}

export function buildFinanceReportRows(payments, expenses) {
  const byMonth = {};
  payments.forEach((payment) => {
    const key = monthKey(payment.date);
    byMonth[key] = byMonth[key] || { revenue: 0, expenses: 0 };
    byMonth[key].revenue += Number(payment.amountPaid || 0);
  });
  expenses.forEach((expense) => {
    const key = expense.month || monthKey(expense.date);
    byMonth[key] = byMonth[key] || { revenue: 0, expenses: 0 };
    byMonth[key].expenses += Number(expense.amount || 0);
  });

  return Object.entries(byMonth)
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .map(([key, value]) => ({
      month: key,
      revenue: Number(value.revenue.toFixed(2)),
      expenses: Number(value.expenses.toFixed(2)),
      net: Number((value.revenue - value.expenses).toFixed(2))
    }));
}

export function renderActivityLine(activity) {
  return `${formatDateTime(activity.dateTime)} - ${activity.title} (${activity.details || "-"})`;
}

export async function buildSuperAdminSnapshot() {
  const settings = await getAppSettings();
  const profiles = Array.isArray(settings.syncProfiles) ? settings.syncProfiles : [];
  const tenantRegistry = Array.isArray(settings.tenantRegistry) ? settings.tenantRegistry : [];
  const summary = {
    tenantCount: tenantRegistry.length || profiles.length,
    activeTenants: tenantRegistry.filter((tenant) => (tenant.status || "active") === "active").length || profiles.length,
    students: 0,
    tutors: 0,
    lessons: 0,
    payments: 0,
    revenue: 0,
    outstanding: 0
  };

  for (const profile of profiles) {
    const snapshot = await loadAccountSnapshot(profile.id);
    const students = Array.isArray(snapshot.students) ? snapshot.students : [];
    const tutors = Array.isArray(snapshot.tutors) ? snapshot.tutors : [];
    const lessons = Array.isArray(snapshot.lessons) ? snapshot.lessons : [];
    const payments = Array.isArray(snapshot.payments) ? snapshot.payments : [];
    summary.students += students.length;
    summary.tutors += tutors.length;
    summary.lessons += lessons.length;
    summary.payments += payments.length;
    summary.revenue += sumBy(payments, (row) => row.amountPaid || 0);
    summary.outstanding += sumBy(payments, (row) => row.balance || 0);
  }

  return summary;
}

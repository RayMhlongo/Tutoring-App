import { studentsRepo, tutorsRepo, lessonsRepo, attendanceRepo, paymentsRepo, expensesRepo, scheduleRepo } from "../../data/repos/index.js";
import { card, table, emptyState, toast } from "../../ui/components/primitives.js";
import { downloadText, monthKey } from "../../utils/common.js";

function toCsv(headers, rows) {
  const esc = (v) => `"${String(v ?? "").replaceAll("\"", "\"\"")}"`;
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

function maybeExportExcel(report) {
  const xlsx = window.XLSX;
  if (!xlsx?.utils) {
    throw new Error("Excel export library is not available.");
  }
  const wb = xlsx.utils.book_new();
  const summarySheet = xlsx.utils.aoa_to_sheet([["Metric", "Value"], ...report.summary]);
  const overdueSheet = xlsx.utils.aoa_to_sheet([["Date", "Student", "Due", "Paid", "Balance"], ...report.overdue]);
  xlsx.utils.book_append_sheet(wb, summarySheet, "Summary");
  xlsx.utils.book_append_sheet(wb, overdueSheet, "Overdue");
  xlsx.writeFile(wb, `edupulse-report-${report.month}.xlsx`);
}

function maybeExportPdf(report) {
  const jsPdfNS = window.jspdf;
  if (!jsPdfNS?.jsPDF) {
    throw new Error("PDF export library is not available.");
  }
  const doc = new jsPdfNS.jsPDF({ unit: "pt", format: "a4" });
  let y = 48;
  doc.setFontSize(16);
  doc.text("EduPulse Monthly Report", 48, y);
  y += 28;

  doc.setFontSize(12);
  doc.text(`Month: ${report.month}`, 48, y);
  y += 20;

  doc.setFontSize(13);
  doc.text("Summary", 48, y);
  y += 16;
  doc.setFontSize(11);

  report.summary.forEach(([metric, value]) => {
    doc.text(`${metric}: ${value}`, 52, y);
    y += 14;
  });

  y += 8;
  doc.setFontSize(13);
  doc.text("Overdue Payments", 48, y);
  y += 16;
  doc.setFontSize(10);
  doc.text("Date | Student | Due | Paid | Balance", 52, y);
  y += 14;

  report.overdue.slice(0, 26).forEach((row) => {
    const line = `${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} | ${row[4]}`;
    const wrapped = doc.splitTextToSize(line, 500);
    doc.text(wrapped, 52, y);
    y += wrapped.length * 12;
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
  });

  doc.save(`edupulse-report-${report.month}.pdf`);
}

async function buildReportRows() {
  const [students, tutors, lessons, attendance, payments, expenses, schedule] = await Promise.all([
    studentsRepo.list(), tutorsRepo.list(), lessonsRepo.list(), attendanceRepo.list(), paymentsRepo.list(), expensesRepo.list(), scheduleRepo.list()
  ]);
  return {
    summary: [
      ["students", students.length],
      ["tutors", tutors.length],
      ["lessons", lessons.length],
      ["attendance", attendance.length],
      ["payments", payments.length],
      ["expenses", expenses.length],
      ["schedule", schedule.length]
    ],
    overdue: payments
      .filter((p) => Number(p.amountDue || 0) > Number(p.amountPaid || 0))
      .map((p) => [p.date, p.studentId, p.amountDue, p.amountPaid, (Number(p.amountDue || 0) - Number(p.amountPaid || 0)).toFixed(2)]),
    month: monthKey()
  };
}

export async function renderReports() {
  const report = await buildReportRows();
  const summary = report.summary.length ? table(["Metric", "Value"], report.summary) : emptyState("No data.");
  const overdue = report.overdue.length ? table(["Date", "Student", "Due", "Paid", "Balance"], report.overdue) : emptyState("No overdue balances.");

  return `
    ${card("Monthly Summary", `<div class="toolbar"><button id="exportSummaryCsv" class="btn" type="button">Export Summary CSV</button><button id="exportSummaryXlsx" class="btn btn-ghost" type="button">Export Excel</button><button id="exportSummaryPdf" class="btn btn-ghost" type="button">Export PDF</button><button id="printReport" class="btn btn-ghost" type="button">Print</button></div>${summary}`)}
    ${card("Overdue Payments", `<div class="toolbar"><button id="exportOverdueCsv" class="btn" type="button">Export Overdue CSV</button></div>${overdue}`)}
  `;
}

export function bindReports(root) {
  root.querySelector("#printReport")?.addEventListener("click", () => window.print());
  root.querySelector("#exportSummaryCsv")?.addEventListener("click", async () => {
    const report = await buildReportRows();
    downloadText(`edupulse-summary-${report.month}.csv`, toCsv(["Metric", "Value"], report.summary), "text/csv;charset=utf-8");
    toast("Summary CSV exported.", "success");
  });
  root.querySelector("#exportOverdueCsv")?.addEventListener("click", async () => {
    const report = await buildReportRows();
    downloadText(`edupulse-overdue-${report.month}.csv`, toCsv(["Date", "Student", "Due", "Paid", "Balance"], report.overdue), "text/csv;charset=utf-8");
    toast("Overdue CSV exported.", "success");
  });
  root.querySelector("#exportSummaryXlsx")?.addEventListener("click", async () => {
    try {
      const report = await buildReportRows();
      maybeExportExcel(report);
      toast("Excel report exported.", "success");
    } catch (error) {
      toast(error.message, "error");
    }
  });
  root.querySelector("#exportSummaryPdf")?.addEventListener("click", async () => {
    try {
      const report = await buildReportRows();
      maybeExportPdf(report);
      toast("PDF report exported.", "success");
    } catch (error) {
      toast(error.message, "error");
    }
  });
}
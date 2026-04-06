import { card, emptyState, table, escapeHtml } from "../../ui/components/primitives.js";
import { getDashboardData } from "./service.js";

export async function renderDashboard() {
  const data = await getDashboardData();
  const metrics = Object.entries(data.metrics)
    .map(([k, v]) => `<div class="kpi"><span>${escapeHtml(k)}</span><strong>${escapeHtml(String(v))}</strong></div>`)
    .join("");

  const scheduleRows = data.todaySchedule.map((item) => [
    escapeHtml(item.startTime || "--:--"),
    escapeHtml(item.endTime || "--:--"),
    escapeHtml(item.studentId || "Unassigned"),
    escapeHtml(item.tutorId || "Unassigned"),
    escapeHtml(item.status || "planned")
  ]);

  const overdueRows = data.overduePayments.map((item) => [
    escapeHtml(item.date || ""),
    escapeHtml(item.studentId || ""),
    escapeHtml(String(item.amountDue || 0)),
    escapeHtml(String(item.amountPaid || 0)),
    escapeHtml(item.status || "")
  ]);

  return `
    ${card("Business Snapshot", `<div class="kpi-grid">${metrics}</div>`)}
    ${card("Today's Schedule", scheduleRows.length ? table(["Start", "End", "Student", "Tutor", "Status"], scheduleRows) : emptyState("No events for today."))}
    ${card("Outstanding Payments", overdueRows.length ? table(["Date", "Student", "Due", "Paid", "Status"], overdueRows) : emptyState("No overdue or partial payments."))}
  `;
}

export function bindDashboard() {
  return undefined;
}
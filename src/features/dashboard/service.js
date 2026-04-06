import { attendanceRepo, expensesRepo, lessonsRepo, paymentsRepo, scheduleRepo, studentsRepo, tutorsRepo } from "../../data/repos/index.js";
import { dateOnly, formatCurrency } from "../../utils/common.js";
import { getSettings } from "../../data/db/client.js";

function byDateToday(rows) {
  const today = dateOnly();
  return rows.filter((r) => (r.date || "") === today);
}

export async function getDashboardData() {
  const [students, tutors, lessons, attendance, payments, expenses, schedule, settings] = await Promise.all([
    studentsRepo.list(),
    tutorsRepo.list(),
    lessonsRepo.list(),
    attendanceRepo.list(),
    paymentsRepo.list(),
    expensesRepo.list(),
    scheduleRepo.list(),
    getSettings()
  ]);

  const outstandingRows = payments.filter((p) => Number(p.amountDue || 0) > Number(p.amountPaid || 0));
  const outstanding = outstandingRows.reduce((sum, p) => sum + (Number(p.amountDue || 0) - Number(p.amountPaid || 0)), 0);
  const revenue = payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return {
    metrics: {
      students: students.length,
      tutors: tutors.length,
      lessonsToday: byDateToday(lessons).length,
      attendanceToday: byDateToday(attendance).length,
      outstanding: formatCurrency(outstanding, settings.currency),
      revenue: formatCurrency(revenue, settings.currency),
      expenses: formatCurrency(expenseTotal, settings.currency)
    },
    todaySchedule: byDateToday(schedule).slice(0, 8),
    overduePayments: outstandingRows.slice(0, 8),
    recentLessons: lessons.slice(0, 8)
  };
}
import { attendanceRepo, lessonsRepo, paymentsRepo, scheduleRepo, studentsRepo, tutorsRepo } from "../../data/repos/index.js";
import { dateOnly } from "../../utils/common.js";

function byCount(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const value = row[key] || "Unknown";
    map.set(value, (map.get(value) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export async function getRuleInsights() {
  const [students, tutors, lessons, attendance, payments, schedule] = await Promise.all([
    studentsRepo.list(), tutorsRepo.list(), lessonsRepo.list(), attendanceRepo.list(), paymentsRepo.list(), scheduleRepo.list()
  ]);

  const overdue = payments.filter((p) => Number(p.amountDue || 0) > Number(p.amountPaid || 0));
  const absent = attendance.filter((a) => a.status === "absent");
  const busiestDays = byCount(schedule, "date").slice(0, 3);
  const heavyTutors = byCount(schedule, "tutorId").slice(0, 3);
  const weakAttendance = byCount(absent, "studentId").slice(0, 5);
  const today = dateOnly();

  const bullets = [];
  bullets.push(`This month has ${lessons.length} lessons recorded and ${attendance.length} attendance marks.`);
  bullets.push(`${overdue.length} payment records currently have outstanding balances.`);
  if (busiestDays[0]) bullets.push(`Busiest day is ${busiestDays[0][0]} with ${busiestDays[0][1]} scheduled sessions.`);
  if (heavyTutors[0]) bullets.push(`Most loaded tutor is ${heavyTutors[0][0]} with ${heavyTutors[0][1]} scheduled sessions.`);
  if (weakAttendance[0]) bullets.push(`Highest absence count: ${weakAttendance[0][0]} (${weakAttendance[0][1]} absences).`);
  bullets.push(`Today's date is ${today}. Review today's schedule for late cancellations.`);

  return {
    bullets,
    overdue,
    busiestDays,
    heavyTutors,
    weakAttendance,
    kpis: {
      students: students.length,
      tutors: tutors.length,
      lessons: lessons.length,
      attendance: attendance.length
    }
  };
}

export function buildAiContext(insights) {
  return {
    summary: insights.bullets,
    overdueStudents: insights.overdue.slice(0, 20).map((p) => ({ studentId: p.studentId, balance: Number(p.amountDue || 0) - Number(p.amountPaid || 0) })),
    busiestDays: insights.busiestDays,
    heavyTutors: insights.heavyTutors,
    weakAttendance: insights.weakAttendance
  };
}
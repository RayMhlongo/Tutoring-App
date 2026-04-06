import { attendanceRepo, expensesRepo, lessonsRepo, paymentsRepo, scheduleRepo, studentsRepo, tutorsRepo } from "../repos/index.js";
import { dateOnly } from "../../utils/common.js";
import { db } from "../db/client.js";
import { TABLES } from "../../core/constants.js";

export async function seedDemoData() {
  const existing = await studentsRepo.list();
  if (existing.length > 0) return;

  const student = await studentsRepo.create({
    firstName: "Anele",
    surname: "Mokoena",
    grade: "Grade 11",
    school: "Crestview High",
    subjects: ["Maths", "Physical Sciences"],
    guardianName: "Thandi Mokoena",
    contactNumber: "+27 82 111 2200"
  });

  const tutor = await tutorsRepo.create({
    firstName: "Ray",
    surname: "Mhlongo",
    subjects: "Maths, Physical Sciences",
    contactNumber: "+27 82 000 0000",
    availability: "Mon-Fri 14:00-19:00"
  });

  await scheduleRepo.create({
    date: dateOnly(),
    startTime: "15:00",
    endTime: "16:00",
    lessonType: "Revision",
    tutorId: tutor.id,
    studentId: student.id,
    status: "planned"
  });

  const lesson = await lessonsRepo.create({
    date: dateOnly(),
    startTime: "15:00",
    endTime: "16:00",
    lessonType: "Revision",
    subject: "Maths",
    tutorId: tutor.id,
    studentId: student.id,
    durationMinutes: 60,
    outcome: "Strong algebra progress",
    homework: "Past paper Q1-Q10",
    status: "completed"
  });

  await attendanceRepo.create({
    date: dateOnly(),
    lessonId: lesson.id,
    studentId: student.id,
    tutorId: tutor.id,
    status: "present"
  });

  await paymentsRepo.create({
    studentId: student.id,
    date: dateOnly(),
    method: "EFT",
    reference: "INV-1001",
    amountDue: 1200,
    amountPaid: 800,
    status: "partial"
  });

  await expensesRepo.create({
    date: dateOnly(),
    category: "Transport",
    amount: 250,
    notes: "Tutor travel"
  });
}

export async function resetAllData() {
  await db.transaction("rw", ...Object.values(TABLES).map((name) => db[name]), async () => {
    for (const name of Object.values(TABLES)) {
      if (name === TABLES.settings) continue;
      await db[name].clear();
    }
  });
}
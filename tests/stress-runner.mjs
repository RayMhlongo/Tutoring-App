import { performance } from "node:perf_hooks";
import { createStudent, listStudents } from "../src/students.js";
import { logAttendance, listAttendance } from "../src/attendance.js";
import { createPayment, listPayments } from "../src/payments.js";
import { resetDatabase } from "./helpers.mjs";

const ACCOUNT_ID = "stress-account";
const STUDENT_COUNT = 1000;
const ATTENDANCE_COUNT = 10000;
const PAYMENT_COUNT = 5000;

function now() {
  return performance.now();
}

async function run() {
  await resetDatabase();

  let start = now();
  const studentIds = [];
  for (let i = 1; i <= STUDENT_COUNT; i += 1) {
    const student = await createStudent({
      firstName: `Student${i}`,
      surname: `Load${i}`,
      grade: `Grade ${8 + (i % 5)}`
    }, ACCOUNT_ID);
    studentIds.push(student.id);
  }
  const studentsMs = now() - start;

  start = now();
  for (let i = 0; i < ATTENDANCE_COUNT; i += 1) {
    const studentId = studentIds[i % studentIds.length];
    await logAttendance({
      studentId,
      checkInMethod: i % 2 === 0 ? "qr" : "manual"
    }, ACCOUNT_ID);
  }
  const attendanceMs = now() - start;

  start = now();
  for (let i = 0; i < PAYMENT_COUNT; i += 1) {
    const studentId = studentIds[i % studentIds.length];
    await createPayment({
      studentId,
      amountDue: 250,
      amountPaid: i % 4 === 0 ? 250 : 200,
      date: "2026-03-07",
      method: i % 2 === 0 ? "EFT" : "Cash"
    }, ACCOUNT_ID);
  }
  const paymentsMs = now() - start;

  const [students, attendance, payments] = await Promise.all([
    listStudents(ACCOUNT_ID),
    listAttendance(ACCOUNT_ID),
    listPayments(ACCOUNT_ID)
  ]);

  if (students.length !== STUDENT_COUNT) {
    throw new Error(`Student count mismatch: expected ${STUDENT_COUNT}, got ${students.length}`);
  }
  if (attendance.length !== ATTENDANCE_COUNT) {
    throw new Error(`Attendance count mismatch: expected ${ATTENDANCE_COUNT}, got ${attendance.length}`);
  }
  if (payments.length !== PAYMENT_COUNT) {
    throw new Error(`Payment count mismatch: expected ${PAYMENT_COUNT}, got ${payments.length}`);
  }

  const report = {
    students: { count: students.length, ms: Math.round(studentsMs) },
    attendance: { count: attendance.length, ms: Math.round(attendanceMs) },
    payments: { count: payments.length, ms: Math.round(paymentsMs) },
    totalMs: Math.round(studentsMs + attendanceMs + paymentsMs)
  };
  // eslint-disable-next-line no-console
  console.log("STRESS_TEST_RESULT", JSON.stringify(report, null, 2));
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("STRESS_TEST_FAILED", error?.stack || error?.message || String(error));
  process.exitCode = 1;
});

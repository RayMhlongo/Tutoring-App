import test from "node:test";
import assert from "node:assert/strict";
import { createStudent } from "../src/students.js";
import { logAttendance, listAttendance } from "../src/attendance.js";
import { parseStudentQrPayload } from "../src/qr.js";
import { resetDatabase } from "./helpers.mjs";

test("QR payload parsing links student check-in to attendance record", async () => {
  await resetDatabase();
  const accountId = "qr-attendance-account";
  const student = await createStudent({
    firstName: "Qra",
    surname: "Learner",
    grade: "Grade 9"
  }, accountId);

  const parsed = parseStudentQrPayload(student.qrValue, "DIR:{tenantId}:{id}");
  assert.equal(parsed.studentId, student.id);
  assert.ok(parsed.tenantId);

  const attendance = await logAttendance({
    studentId: parsed.studentId,
    checkInMethod: "qr"
  }, accountId);

  assert.equal(attendance.studentId, student.id);
  assert.equal(attendance.checkInMethod, "qr");
  const rows = await listAttendance(accountId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, attendance.id);
});

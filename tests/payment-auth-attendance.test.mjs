import test from "node:test";
import assert from "node:assert/strict";
import { createStudent } from "../src/students.js";
import { createPayment, listPayments } from "../src/payments.js";
import { logAttendance, listAttendance } from "../src/attendance.js";
import { authenticateLocal, setLocalAdminCredentials } from "../src/auth.js";
import { getQueueCount, getSetting } from "../src/storage.js";
import { resetDatabase } from "./helpers.mjs";

const ACCOUNT_ID = "test-account";

test("payment tracking stores normalized amount rows", async () => {
  await resetDatabase();
  const student = await createStudent({
    firstName: "Alice",
    surname: "Ngwenya",
    grade: "Grade 11"
  }, ACCOUNT_ID);

  const payment = await createPayment({
    studentId: student.id,
    amountDue: 500,
    amountPaid: 400,
    date: "2026-03-07",
    method: "EFT"
  }, ACCOUNT_ID);

  assert.equal(payment.studentId, student.id);
  assert.equal(payment.balance, 100);
  const rows = await listPayments(ACCOUNT_ID);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amountPaid, 400);
});

test("attendance logging persists check-in records", async () => {
  await resetDatabase();
  const student = await createStudent({
    firstName: "Bongani",
    surname: "Maseko",
    grade: "Grade 12"
  }, ACCOUNT_ID);

  const entry = await logAttendance({
    studentId: student.id,
    checkInMethod: "qr"
  }, ACCOUNT_ID);
  assert.equal(entry.studentId, student.id);
  assert.equal(entry.checkInMethod, "qr");

  const rows = await listAttendance(ACCOUNT_ID);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, entry.id);

  const queueCount = await getQueueCount(ACCOUNT_ID);
  assert.equal(queueCount, 2);
});

test("local auth login succeeds with valid credentials and rejects invalid password", async () => {
  await resetDatabase();
  await setLocalAdminCredentials("admin", "Password123");
  const session = await authenticateLocal("admin", "Password123");
  assert.equal(session.mode, "local");
  assert.ok(session.id.startsWith("sess-"));

  await assert.rejects(
    () => authenticateLocal("admin", "wrong-pass"),
    /Invalid credentials/
  );

  const storedSession = await getSetting("authSession", null);
  assert.equal(storedSession.id, session.id);
});

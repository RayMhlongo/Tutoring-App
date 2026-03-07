import test from "node:test";
import assert from "node:assert/strict";
import { createStudent, getStudentById, listStudents } from "../src/students.js";
import { getQueueCount } from "../src/storage.js";
import { resetDatabase } from "./helpers.mjs";

const ACCOUNT_ID = "test-account";

test("student registration saves student, QR value, and QR image", async () => {
  await resetDatabase();
  const student = await createStudent({
    firstName: "John",
    surname: "Doe",
    grade: "Grade 10",
    subjects: ["Maths"],
    customFields: {
      school: "Test High"
    }
  }, ACCOUNT_ID);

  assert.ok(student.id.startsWith("stu-"));
  assert.ok(student.qrValue.includes(student.id));
  assert.ok(student.qrImageDataUrl.startsWith("data:image/png;base64,"));

  const fromDb = await getStudentById(student.id);
  assert.equal(fromDb.firstName, "John");
  assert.equal(fromDb.surname, "Doe");
  assert.equal(fromDb.grade, "Grade 10");
  assert.ok(fromDb.qrValue.includes(student.id));

  const rows = await listStudents(ACCOUNT_ID);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, student.id);

  const queueCount = await getQueueCount(ACCOUNT_ID);
  assert.equal(queueCount, 1);
});

test("student registration validates required fields", async () => {
  await resetDatabase();
  await assert.rejects(
    () => createStudent({
      firstName: "OnlyFirstName",
      surname: "",
      grade: "Grade 9"
    }, ACCOUNT_ID),
    /Surname is required/
  );
});

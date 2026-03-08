import test from "node:test";
import assert from "node:assert/strict";
import { createStudent, listStudents } from "../src/students.js";
import { listRecords } from "../src/storage.js";
import { TABLES } from "../src/config.js";
import { resetDatabase } from "./helpers.mjs";

test("tenant/account isolation keeps student datasets separate", async () => {
  await resetDatabase();
  const accountA = "acct-a";
  const accountB = "acct-b";

  const studentA = await createStudent({
    firstName: "Alicia",
    surname: "TenantA",
    grade: "Grade 10",
    tenantId: "tenant-a"
  }, accountA);

  const studentB = await createStudent({
    firstName: "Brian",
    surname: "TenantB",
    grade: "Grade 11",
    tenantId: "tenant-b"
  }, accountB);

  const [rowsA, rowsB] = await Promise.all([
    listStudents(accountA),
    listStudents(accountB)
  ]);
  assert.equal(rowsA.length, 1);
  assert.equal(rowsB.length, 1);
  assert.equal(rowsA[0].id, studentA.id);
  assert.equal(rowsB[0].id, studentB.id);
  assert.equal(rowsA[0].tenantId, "tenant-a");
  assert.equal(rowsB[0].tenantId, "tenant-b");

  const accountARecords = await listRecords(TABLES.students, accountA);
  assert.equal(accountARecords.some((row) => row.id === studentB.id), false);
});

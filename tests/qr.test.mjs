import test from "node:test";
import assert from "node:assert/strict";
import { buildQrValue, parseStudentIdFromQr } from "../src/qr.js";

test("QR value builder and parser work with custom format", () => {
  const format = "XFACTOR:{id}";
  const id = "stu-12345";
  const value = buildQrValue(format, id);
  assert.equal(value, "XFACTOR:stu-12345");
  assert.equal(parseStudentIdFromQr(value, format), id);
});

test("QR parser supports direct ID fallback values", () => {
  const direct = "stu-abc-999";
  assert.equal(parseStudentIdFromQr(direct, "SCHOOL:{id}"), direct);
});

import { TABLES } from "./config.js";
import { getAppSettings, listRecords, saveRecord, getRecordById } from "./storage.js";
import { sanitizeObject, sanitizeText, uid } from "./utils.js";

function buildQrValue(format, studentId) {
  if (!format || !format.includes("{id}")) {
    return `XFACTOR:${studentId}`;
  }
  return format.replace("{id}", studentId);
}

function normalizeCustomFields(inputFields = {}, settingsFields = []) {
  const output = {};
  settingsFields.forEach((field) => {
    output[field.key] = sanitizeText(inputFields[field.key] ?? "", 2000);
  });
  return output;
}

export async function createStudent(payload, accountId) {
  const settings = await getAppSettings();
  const firstName = sanitizeText(payload.firstName, 80);
  const surname = sanitizeText(payload.surname, 80);
  const grade = sanitizeText(payload.grade, 32);
  if (!firstName || !surname || !grade) {
    throw new Error("First name, surname, and grade are required.");
  }

  const id = payload.id || uid("stu");
  const record = {
    id,
    firstName,
    surname,
    grade,
    subjects: Array.isArray(payload.subjects) ? payload.subjects.map((item) => sanitizeText(item, 64)).filter(Boolean) : [],
    customFields: normalizeCustomFields(payload.customFields, settings.customStudentFields),
    notes: sanitizeText(payload.notes, 2500),
    qrValue: buildQrValue(settings.qrFormat, id),
    active: payload.active !== false
  };
  return saveRecord(TABLES.students, record, { accountId, op: "upsert", queue: true });
}

export async function updateStudent(studentId, payload, accountId) {
  const existing = await getRecordById(TABLES.students, studentId);
  if (!existing) throw new Error("Student not found.");
  return createStudent({
    ...existing,
    ...sanitizeObject(payload),
    id: studentId
  }, accountId || existing.accountId);
}

export async function listStudents(accountId, searchQuery = "") {
  const rows = await listRecords(TABLES.students, accountId, { direction: "asc" });
  const needle = sanitizeText(searchQuery, 120).toLowerCase();
  if (!needle) return rows;
  return rows.filter((student) => {
    const haystack = `${student.firstName || ""} ${student.surname || ""} ${student.grade || ""}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export async function getStudentById(studentId) {
  return getRecordById(TABLES.students, studentId);
}

export async function getStudentProfile(studentId, accountId) {
  const student = await getRecordById(TABLES.students, studentId);
  if (!student || student.accountId !== accountId) return null;

  const [lessons, attendance, payments] = await Promise.all([
    listRecords(TABLES.lessons, accountId),
    listRecords(TABLES.attendance, accountId),
    listRecords(TABLES.payments, accountId)
  ]);

  return {
    student,
    lessons: lessons.filter((lesson) => lesson.studentId === studentId),
    attendance: attendance.filter((entry) => entry.studentId === studentId),
    payments: payments.filter((entry) => entry.studentId === studentId)
  };
}

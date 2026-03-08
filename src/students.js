import { TABLES } from "./config.js";
import { getAppSettings, listRecords, saveRecord, getRecordById } from "./storage.js";
import { sanitizeObject, sanitizeText, uid } from "./utils.js";
import { validateStudentPayload } from "./validation.js";

function buildQrValue(format, studentId, tenantId = "") {
  const safeId = sanitizeText(studentId, 120);
  const safeTenantId = sanitizeText(tenantId, 120);
  if (!format || !format.includes("{id}")) {
    return `DIR:${safeTenantId}:${safeId}`;
  }
  return format
    .replace("{tenantId}", safeTenantId)
    .replace("{id}", safeId);
}

async function buildQrImageDataUrl(qrValue, fallbackValue = "") {
  const safeQr = sanitizeText(qrValue, 240);
  if (!safeQr) return sanitizeText(fallbackValue || "", 500000);
  if (!window.QRCode?.toDataURL) {
    return sanitizeText(fallbackValue || "", 500000);
  }
  try {
    const dataUrl = await window.QRCode.toDataURL(safeQr, {
      width: 420,
      margin: 2,
      color: {
        dark: "#0e3a67",
        light: "#ffffff"
      }
    });
    return sanitizeText(dataUrl, 500000);
  } catch {
    return sanitizeText(fallbackValue || "", 500000);
  }
}

function hydrateStudentQrFields(student, qrFormat, tenantId = "") {
  if (!student) return student;
  const qrValue = sanitizeText(student.qrValue || buildQrValue(qrFormat, student.id, student.tenantId || tenantId), 240);
  return {
    ...student,
    qrValue,
    qrImageDataUrl: sanitizeText(student.qrImageDataUrl || "", 500000)
  };
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
  const validated = validateStudentPayload(payload);
  const firstName = validated.firstName;
  const surname = validated.surname;
  const grade = validated.grade;
  const tenantId = sanitizeText(payload.tenantId || accountId || "tenant-default", 120);
  const isCreate = !payload.id;
  if (isCreate && payload.ignorePlanLimits !== true) {
    const planKey = sanitizeText(
      settings.tenantPlans?.[accountId]
      || settings.syncProfiles?.find((profile) => profile.id === accountId)?.plan
      || "starter",
      24
    ).toLowerCase();
    const plan = settings.planCatalog?.[planKey];
    if (plan?.maxStudents) {
      const existing = await listRecords(TABLES.students, accountId, { direction: "asc" });
      if (existing.length >= Number(plan.maxStudents)) {
        throw new Error(`Student limit reached for ${plan.label || planKey} plan (${plan.maxStudents}).`);
      }
    }
  }

  const id = payload.id || uid("stu");
  const qrValue = buildQrValue(settings.qrFormat, id, tenantId);
  const qrImageDataUrl = await buildQrImageDataUrl(qrValue, payload.qrImageDataUrl || "");
  const record = {
    id,
    tenantId,
    firstName,
    surname,
    grade,
    subjects: Array.isArray(payload.subjects) ? payload.subjects.map((item) => sanitizeText(item, 64)).filter(Boolean) : [],
    customFields: normalizeCustomFields(payload.customFields, settings.customStudentFields),
    notes: sanitizeText(payload.notes, 2500),
    qrValue,
    qrImageDataUrl,
    active: payload.active !== false
  };
  const saved = await saveRecord(TABLES.students, record, {
    accountId,
    op: "upsert",
    queue: payload.skipQueue !== true
  });
  return hydrateStudentQrFields(saved, settings.qrFormat, tenantId);
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
  const settings = await getAppSettings();
  const rows = await listRecords(TABLES.students, accountId, { direction: "asc" });
  const hydratedRows = rows.map((row) => hydrateStudentQrFields(row, settings.qrFormat, accountId));
  const needle = sanitizeText(searchQuery, 120).toLowerCase();
  if (!needle) return hydratedRows;
  return hydratedRows.filter((student) => {
    const haystack = `${student.firstName || ""} ${student.surname || ""} ${student.grade || ""}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export async function getStudentById(studentId) {
  const [settings, student] = await Promise.all([
    getAppSettings(),
    getRecordById(TABLES.students, studentId)
  ]);
  return hydrateStudentQrFields(student, settings.qrFormat, student?.accountId || "tenant-default");
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

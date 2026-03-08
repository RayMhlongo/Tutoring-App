import { TABLES } from "./config.js";
import { listRecords, saveRecord } from "./storage.js";
import { isoNow, sanitizeText, uid } from "./utils.js";

export async function logAttendance(payload, accountId) {
  const studentId = sanitizeText(payload.studentId, 120);
  if (!studentId) throw new Error("Student ID is required.");
  const dateTime = payload.dateTime || isoNow();

  const record = {
    id: payload.id || uid("att"),
    studentId,
    lessonId: sanitizeText(payload.lessonId || "", 120),
    date: dateTime.slice(0, 10),
    time: new Date(dateTime).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
    dateTime,
    checkInMethod: sanitizeText(payload.checkInMethod || "qr", 40),
    notes: sanitizeText(payload.notes || "", 1200)
  };
  return saveRecord(TABLES.attendance, record, {
    accountId,
    queue: payload.skipQueue !== true,
    op: "upsert"
  });
}

export async function listAttendance(accountId) {
  return listRecords(TABLES.attendance, accountId);
}

export async function listTodaysAttendance(accountId) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await listAttendance(accountId);
  return rows.filter((entry) => entry.date === today);
}

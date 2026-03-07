import { TABLES } from "./config.js";
import { getAppSettings, listRecords, saveRecord } from "./storage.js";
import { sanitizeNumber, sanitizeObject, sanitizeText, uid } from "./utils.js";
import { validateSchedulePayload } from "./validation.js";

function normalizeTime(value, fallback = "08:00") {
  const cleaned = sanitizeText(value || fallback, 5);
  return /^\d{2}:\d{2}$/.test(cleaned) ? cleaned : fallback;
}

function calcEndTime(timeStart, durationMinutes) {
  const [hh, mm] = normalizeTime(timeStart).split(":").map((part) => Number(part));
  const date = new Date();
  date.setHours(hh, mm, 0, 0);
  date.setMinutes(date.getMinutes() + Number(durationMinutes || 60));
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export async function createScheduleEntry(payload, accountId) {
  const settings = await getAppSettings();
  const validated = validateSchedulePayload(payload, settings.defaultLessonDuration || 60);
  const date = validated.date;
  const studentId = validated.studentId;
  const durationMinutes = Math.max(15, sanitizeNumber(validated.durationMinutes, settings.defaultLessonDuration || 60));
  const timeStart = normalizeTime(validated.timeStart || "08:00");
  const timeEnd = normalizeTime(payload.timeEnd || calcEndTime(timeStart, durationMinutes));

  const record = {
    id: payload.id || uid("sch"),
    date,
    timeStart,
    timeEnd,
    studentId,
    subject: sanitizeText(payload.subject || "", 80),
    durationMinutes,
    category: sanitizeText(payload.category || "", 80),
    lessonNotes: sanitizeText(payload.lessonNotes || "", 2000),
    customFields: sanitizeObject(payload.customFields || {}),
    status: sanitizeText(payload.status || "planned", 32)
  };
  return saveRecord(TABLES.schedule, record, { accountId, queue: true, op: "upsert" });
}

export async function listScheduleEntries(accountId, filters = {}) {
  const rows = await listRecords(TABLES.schedule, accountId, { direction: "asc" });
  return rows
    .filter((item) => !filters.fromDate || item.date >= filters.fromDate)
    .filter((item) => !filters.toDate || item.date <= filters.toDate)
    .filter((item) => !filters.studentId || item.studentId === filters.studentId)
    .filter((item) => !filters.subject || item.subject === filters.subject)
    .sort((a, b) => {
      if (a.date === b.date) return a.timeStart.localeCompare(b.timeStart);
      return a.date.localeCompare(b.date);
    });
}

export async function getScheduleForDate(accountId, date) {
  const entries = await listScheduleEntries(accountId, { fromDate: date, toDate: date });
  return entries.filter((item) => item.date === date);
}

export async function getScheduleForStudentDate(accountId, studentId, date) {
  const rows = await getScheduleForDate(accountId, date);
  return rows.find((row) => row.studentId === studentId) || null;
}

export async function getScheduleRange(accountId, startDate, endDate) {
  return listScheduleEntries(accountId, { fromDate: startDate, toDate: endDate });
}

export function getWeekRange(anchorDate) {
  const date = new Date(anchorDate);
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    fromDate: monday.toISOString().slice(0, 10),
    toDate: sunday.toISOString().slice(0, 10)
  };
}

export async function exportScheduleAsImage(domElement, format = "png") {
  if (!window.html2canvas) {
    throw new Error("Schedule image export dependency is not available.");
  }
  const canvas = await window.html2canvas(domElement, {
    backgroundColor: "#ffffff",
    scale: 2
  });
  const mime = format === "jpeg" ? "image/jpeg" : "image/png";
  const dataUrl = canvas.toDataURL(mime, 0.95);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `schedule-${new Date().toISOString().slice(0, 10)}.${format === "jpeg" ? "jpg" : "png"}`;
  link.click();
}

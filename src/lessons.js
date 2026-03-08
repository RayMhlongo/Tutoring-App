import { TABLES } from "./config.js";
import { getAppSettings, getRecordById, listRecords, saveRecord } from "./storage.js";
import { sanitizeNumber, sanitizeText, todayISODate, uid } from "./utils.js";
import { validateLessonPayload } from "./validation.js";

export async function createLesson(payload, accountId) {
  const settings = await getAppSettings();
  const validated = validateLessonPayload({
    ...payload,
    date: payload.date || todayISODate()
  }, settings.defaultLessonDuration || 60);
  const date = validated.date;
  const studentId = validated.studentId;
  const subject = validated.subject;

  const record = {
    id: payload.id || uid("les"),
    studentId,
    tutorId: sanitizeText(payload.tutorId || "", 120),
    tutorName: sanitizeText(payload.tutorName || "", 160),
    date,
    subject,
    category: sanitizeText(payload.category || "", 80),
    durationMinutes: sanitizeNumber(validated.durationMinutes, settings.defaultLessonDuration || 60),
    lessonNotes: sanitizeText(payload.lessonNotes, 3000),
    homeworkAssigned: sanitizeText(payload.homeworkAssigned, 3000),
    progressSummary: sanitizeText(payload.progressSummary, 3000),
    homeworkCompleted: payload.homeworkCompleted === true || String(payload.homeworkCompleted) === "true",
    status: sanitizeText(payload.status || "completed", 24)
  };
  return saveRecord(TABLES.lessons, record, { accountId, queue: true, op: "upsert" });
}

export async function updateLesson(lessonId, payload, accountId) {
  const existing = await getRecordById(TABLES.lessons, lessonId);
  if (!existing) throw new Error("Lesson not found.");
  return createLesson({ ...existing, ...payload, id: lessonId }, accountId || existing.accountId);
}

export async function listLessons(accountId) {
  const lessons = await listRecords(TABLES.lessons, accountId);
  lessons.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return lessons;
}

export async function listTodaysLessons(accountId) {
  const today = todayISODate();
  const lessons = await listLessons(accountId);
  return lessons.filter((lesson) => lesson.date === today);
}

export async function listUpcomingLessons(accountId, daysAhead = 14) {
  const lessons = await listLessons(accountId);
  const today = new Date(todayISODate());
  const end = new Date(today);
  end.setDate(today.getDate() + daysAhead);
  return lessons.filter((lesson) => {
    const date = new Date(lesson.date);
    return date >= today && date <= end;
  });
}

export function downloadLessonPdf(lesson, studentName) {
  const jsPdfNS = window.jspdf;
  if (!jsPdfNS?.jsPDF) {
    throw new Error("PDF library unavailable.");
  }
  const doc = new jsPdfNS.jsPDF();
  const lines = [
    `Data Insights by Ray Lesson Summary`,
    `Student: ${studentName}`,
    `Date: ${lesson.date || "-"}`,
    `Subject: ${lesson.subject || "-"}`,
    `Duration: ${lesson.durationMinutes || 0} minutes`,
    "",
    "Lesson Notes:",
    lesson.lessonNotes || "-",
    "",
    "Homework Assigned:",
    lesson.homeworkAssigned || "-",
    "",
    "Progress Summary:",
    lesson.progressSummary || "-"
  ];
  let y = 16;
  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, 180);
    doc.text(wrapped, 14, y);
    y += wrapped.length * 6;
    if (y > 275) {
      doc.addPage();
      y = 16;
    }
  });
  doc.save(`lesson-${lesson.id}.pdf`);
}

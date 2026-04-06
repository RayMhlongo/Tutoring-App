import { TABLES } from "../../core/constants.js";
import { validateStudent, validateTutor, validateMoney } from "../../core/validation.js";
import { sanitizeText, toNumber } from "../../utils/common.js";
import { createRepository } from "./baseRepo.js";

export const studentsRepo = createRepository(TABLES.students, {
  idPrefix: "stu",
  sanitize: (payload) => validateStudent(payload)
});

export const tutorsRepo = createRepository(TABLES.tutors, {
  idPrefix: "tut",
  sanitize: (payload) => validateTutor(payload)
});

export const lessonsRepo = createRepository(TABLES.lessons, {
  idPrefix: "les",
  sanitize: (payload) => ({
    date: sanitizeText(payload.date, 20),
    startTime: sanitizeText(payload.startTime, 10),
    endTime: sanitizeText(payload.endTime, 10),
    lessonType: sanitizeText(payload.lessonType, 60),
    subject: sanitizeText(payload.subject, 60),
    tutorId: sanitizeText(payload.tutorId, 80),
    studentId: sanitizeText(payload.studentId, 80),
    durationMinutes: toNumber(payload.durationMinutes, 60),
    outcome: sanitizeText(payload.outcome, 120),
    homework: sanitizeText(payload.homework, 500),
    notes: sanitizeText(payload.notes, 1200),
    status: sanitizeText(payload.status || "planned", 20)
  })
});

export const attendanceRepo = createRepository(TABLES.attendance, {
  idPrefix: "att",
  sanitize: (payload) => ({
    date: sanitizeText(payload.date, 20),
    lessonId: sanitizeText(payload.lessonId, 80),
    studentId: sanitizeText(payload.studentId, 80),
    tutorId: sanitizeText(payload.tutorId, 80),
    status: sanitizeText(payload.status || "present", 20),
    note: sanitizeText(payload.note, 500)
  })
});

export const paymentsRepo = createRepository(TABLES.payments, {
  idPrefix: "pay",
  sanitize: (payload) => ({
    studentId: sanitizeText(payload.studentId, 80),
    date: sanitizeText(payload.date, 20),
    method: sanitizeText(payload.method, 40),
    reference: sanitizeText(payload.reference, 120),
    amountDue: validateMoney(payload.amountDue, "Amount due"),
    amountPaid: validateMoney(payload.amountPaid, "Amount paid"),
    status: sanitizeText(payload.status || "paid", 20)
  })
});

export const expensesRepo = createRepository(TABLES.expenses, {
  idPrefix: "exp",
  sanitize: (payload) => ({
    date: sanitizeText(payload.date, 20),
    category: sanitizeText(payload.category, 80),
    amount: validateMoney(payload.amount, "Amount"),
    notes: sanitizeText(payload.notes, 500)
  })
});

export const scheduleRepo = createRepository(TABLES.scheduleEvents, {
  idPrefix: "sch",
  sanitize: (payload) => ({
    date: sanitizeText(payload.date, 20),
    startTime: sanitizeText(payload.startTime, 10),
    endTime: sanitizeText(payload.endTime, 10),
    lessonType: sanitizeText(payload.lessonType, 60),
    tutorId: sanitizeText(payload.tutorId, 80),
    studentId: sanitizeText(payload.studentId, 80),
    status: sanitizeText(payload.status || "planned", 20),
    color: sanitizeText(payload.color || "#0d9f8f", 20)
  })
});

export const notesRepo = createRepository(TABLES.notes, {
  idPrefix: "not",
  sanitize: (payload) => ({
    entityType: sanitizeText(payload.entityType, 40),
    entityId: sanitizeText(payload.entityId, 80),
    text: sanitizeText(payload.text, 2000)
  })
});
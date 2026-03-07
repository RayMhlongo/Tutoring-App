import { sanitizeNumber, sanitizeText } from "./utils.js";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidDateParts(value) {
  if (!ISO_DATE_RE.test(value)) return false;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function requiredText(value, label, maxLength = 120) {
  const output = sanitizeText(value, maxLength);
  if (!output) {
    throw new Error(`${label} is required.`);
  }
  return output;
}

export function optionalText(value, maxLength = 120) {
  return sanitizeText(value, maxLength);
}

export function requiredIsoDate(value, label = "Date") {
  const output = sanitizeText(value, 20);
  if (!isValidDateParts(output)) {
    throw new Error(`${label} must be a valid date (YYYY-MM-DD).`);
  }
  return output;
}

export function requiredTime(value, label = "Time") {
  const output = sanitizeText(value, 5);
  if (!TIME_RE.test(output)) {
    throw new Error(`${label} must be a valid 24-hour time (HH:MM).`);
  }
  return output;
}

export function boundedNumber(value, label, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  const number = sanitizeNumber(value, Number.NaN);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a valid number.`);
  }
  if (number < min || number > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return number;
}

export function validateStudentPayload(payload) {
  return {
    firstName: requiredText(payload.firstName, "First name", 80),
    surname: requiredText(payload.surname, "Surname", 80),
    grade: requiredText(payload.grade, "Grade", 32)
  };
}

export function validatePaymentPayload(payload) {
  const studentId = requiredText(payload.studentId, "Student", 120);
  const date = requiredIsoDate(payload.date, "Payment date");
  let amountDue = boundedNumber(payload.amountDue ?? payload.amount, "Amount due", { min: 0, max: 100000000 });
  const amountPaid = boundedNumber(payload.amountPaid ?? payload.amount, "Amount paid", { min: 0, max: 100000000 });
  if (amountDue === 0 && amountPaid === 0) {
    throw new Error("Amount due or amount paid must be greater than zero.");
  }
  if (amountPaid > amountDue) {
    amountDue = amountPaid;
  }
  return { studentId, date, amountDue, amountPaid };
}

export function validateLessonPayload(payload, defaultDuration = 60) {
  const studentId = requiredText(payload.studentId, "Student", 120);
  const date = requiredIsoDate(payload.date, "Lesson date");
  const subject = requiredText(payload.subject || "General", "Subject", 80);
  const durationMinutes = Math.round(boundedNumber(
    payload.durationMinutes ?? defaultDuration,
    "Lesson duration",
    { min: 15, max: 480 }
  ));
  return { studentId, date, subject, durationMinutes };
}

export function validateSchedulePayload(payload, defaultDuration = 60) {
  const studentId = requiredText(payload.studentId, "Student", 120);
  const date = requiredIsoDate(payload.date, "Schedule date");
  const timeStart = requiredTime(payload.timeStart || "08:00", "Start time");
  const durationMinutes = Math.round(boundedNumber(
    payload.durationMinutes ?? defaultDuration,
    "Duration",
    { min: 15, max: 480 }
  ));
  return { studentId, date, timeStart, durationMinutes };
}

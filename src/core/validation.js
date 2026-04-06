import { sanitizeText, toNumber } from "../utils/common.js";

export function required(value, label) {
  if (!sanitizeText(value)) throw new Error(`${label} is required.`);
}

export function validateStudent(payload) {
  required(payload.firstName, "First name");
  required(payload.surname, "Surname");
  return {
    firstName: sanitizeText(payload.firstName, 80),
    surname: sanitizeText(payload.surname, 80),
    grade: sanitizeText(payload.grade, 20),
    school: sanitizeText(payload.school, 120),
    subjects: Array.isArray(payload.subjects)
      ? payload.subjects.map((s) => sanitizeText(s, 40)).filter(Boolean)
      : sanitizeText(payload.subjects, 200).split(",").map((s) => sanitizeText(s, 40)).filter(Boolean),
    guardianName: sanitizeText(payload.guardianName, 80),
    contactNumber: sanitizeText(payload.contactNumber, 40),
    notes: sanitizeText(payload.notes, 1200),
    photoDataUrl: sanitizeText(payload.photoDataUrl, 500000)
  };
}

export function validateTutor(payload) {
  required(payload.firstName, "First name");
  required(payload.surname, "Surname");
  return {
    firstName: sanitizeText(payload.firstName, 80),
    surname: sanitizeText(payload.surname, 80),
    subjects: sanitizeText(payload.subjects, 200),
    contactNumber: sanitizeText(payload.contactNumber, 40),
    availability: sanitizeText(payload.availability, 500),
    notes: sanitizeText(payload.notes, 1200)
  };
}

export function validateMoney(value, label) {
  const n = toNumber(value, NaN);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a positive number.`);
  return Number(n.toFixed(2));
}
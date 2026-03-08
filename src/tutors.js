import { TABLES } from "./config.js";
import { getAppSettings, getRecordById, listRecords, saveRecord } from "./storage.js";
import { sanitizeObject, sanitizeText, uid } from "./utils.js";
import { requiredText } from "./validation.js";

export async function createTutor(payload, accountId) {
  const settings = await getAppSettings();
  const firstName = requiredText(payload.firstName, "Tutor first name", 80);
  const surname = requiredText(payload.surname, "Tutor surname", 80);
  const isCreate = !payload.id;

  if (isCreate) {
    const planKey = sanitizeText(
      settings.tenantPlans?.[accountId]
      || settings.syncProfiles?.find((profile) => profile.id === accountId)?.plan
      || "starter",
      24
    ).toLowerCase();
    const plan = settings.planCatalog?.[planKey];
    if (plan?.maxTutors) {
      const tutors = await listRecords(TABLES.tutors, accountId, { direction: "asc" });
      if (tutors.length >= Number(plan.maxTutors)) {
        throw new Error(`Tutor limit reached for ${plan.label || planKey} plan (${plan.maxTutors}).`);
      }
    }
  }

  const record = {
    id: payload.id || uid("tut"),
    firstName,
    surname,
    email: sanitizeText(payload.email || "", 180),
    subjects: Array.isArray(payload.subjects) ? payload.subjects.map((item) => sanitizeText(item, 80)).filter(Boolean) : [],
    notes: sanitizeText(payload.notes || "", 2000),
    rating: Number(payload.rating || 0)
  };
  return saveRecord(TABLES.tutors, record, { accountId, queue: true, op: "upsert" });
}

export async function updateTutor(tutorId, payload, accountId) {
  const existing = await getRecordById(TABLES.tutors, tutorId);
  if (!existing) throw new Error("Tutor not found.");
  return createTutor({
    ...existing,
    ...sanitizeObject(payload),
    id: tutorId
  }, accountId || existing.accountId);
}

export async function listTutors(accountId) {
  return listRecords(TABLES.tutors, accountId, { direction: "asc" });
}

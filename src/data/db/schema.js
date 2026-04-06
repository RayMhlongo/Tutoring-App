import { DB_NAME, DB_VERSION, TABLES } from "../../core/constants.js";

export function applySchema(db) {
  db.version(DB_VERSION).stores({
    [TABLES.students]: "id, updatedAt, archivedAt, status, surname, firstName",
    [TABLES.tutors]: "id, updatedAt, archivedAt, status, surname, firstName",
    [TABLES.lessons]: "id, date, studentId, tutorId, status, updatedAt, archivedAt",
    [TABLES.attendance]: "id, date, studentId, tutorId, lessonId, status, updatedAt, archivedAt",
    [TABLES.payments]: "id, date, studentId, status, updatedAt, archivedAt",
    [TABLES.expenses]: "id, date, category, updatedAt, archivedAt",
    [TABLES.scheduleEvents]: "id, date, startTime, tutorId, studentId, status, updatedAt, archivedAt",
    [TABLES.notes]: "id, entityType, entityId, updatedAt, archivedAt",
    [TABLES.reports]: "id, type, month, createdAt, updatedAt, archivedAt",
    [TABLES.activityLog]: "id, entityType, entityId, createdAt",
    [TABLES.backupJobs]: "id, status, createdAt, updatedAt, dedupeKey",
    [TABLES.settings]: "key, updatedAt"
  });
}

export function createDb(DexieRef) {
  const db = new DexieRef(DB_NAME);
  applySchema(db);
  return db;
}
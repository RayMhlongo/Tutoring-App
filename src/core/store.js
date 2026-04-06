import { DB_KEY, defaults } from "./constants.js";
import { nowIso, uid } from "./helpers.js";

const KEY_BY_ENTITY = {
  students: "stu",
  tutors: "tut",
  schedule: "sch",
  lessons: "les",
  attendance: "att",
  payments: "pay",
  expenses: "exp"
};

function mergeState(raw) {
  const base = defaults();
  const incoming = raw && typeof raw === "object" ? raw : {};
  return {
    ...base,
    ...incoming,
    settings: { ...base.settings, ...(incoming.settings || {}) },
    session: { ...base.session, ...(incoming.session || {}) },
    activityLog: Array.isArray(incoming.activityLog) ? incoming.activityLog : []
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return seedState();
    return mergeState(JSON.parse(raw));
  } catch {
    return seedState();
  }
}

export function saveState(state) {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
}

export function seedState() {
  const state = mergeState({});
  if (state.students.length || state.tutors.length || state.schedule.length) return state;

  const s1 = baseRecord("students", {
    firstName: "Lebo",
    surname: "Maseko",
    grade: "Grade 9",
    school: "Riverside High",
    subjects: "Mathematics, Physics",
    guardian: "Thandi Maseko",
    contact: "082 000 1111",
    notes: "Needs confidence support in algebra"
  });
  const s2 = baseRecord("students", {
    firstName: "Anele",
    surname: "Nkosi",
    grade: "Grade 11",
    school: "Hillview College",
    subjects: "Accounting",
    guardian: "Sipho Nkosi",
    contact: "082 000 2222",
    notes: "Strong consistency"
  });
  const t1 = baseRecord("tutors", {
    firstName: "Ray",
    surname: "Mhlongo",
    subjects: "Maths, Accounting",
    contact: "082 555 1212",
    availability: "Mon-Fri 14:00-19:00"
  });

  state.students = [s1, s2];
  state.tutors = [t1];
  state.schedule = [
    baseRecord("schedule", {
      date: new Date().toISOString().slice(0, 10),
      start: "15:00",
      end: "16:00",
      studentId: s1.id,
      tutorId: t1.id,
      type: "One-on-one",
      status: "planned"
    })
  ];
  state.lessons = [
    baseRecord("lessons", {
      date: new Date().toISOString().slice(0, 10),
      studentId: s1.id,
      tutorId: t1.id,
      subject: "Mathematics",
      duration: 60,
      status: "completed",
      notes: "Quadratic equations",
      outcome: "Progressing"
    })
  ];
  state.attendance = [
    baseRecord("attendance", {
      date: new Date().toISOString().slice(0, 10),
      studentId: s1.id,
      tutorId: t1.id,
      status: "present",
      note: "On time"
    })
  ];
  state.payments = [
    baseRecord("payments", {
      date: new Date().toISOString().slice(0, 10),
      studentId: s1.id,
      amountDue: 900,
      amountPaid: 700,
      method: "EFT",
      status: "partial",
      reference: "INV-001"
    })
  ];
  state.expenses = [
    baseRecord("expenses", {
      date: new Date().toISOString().slice(0, 10),
      category: "Transport",
      amount: 120,
      note: "Fuel"
    })
  ];
  state.activityLog = [{ id: uid("act"), message: "Demo data seeded", createdAt: nowIso() }];

  return state;
}

export function baseRecord(entity, payload) {
  const prefix = KEY_BY_ENTITY[entity] || "rec";
  const time = nowIso();
  return {
    id: uid(prefix),
    createdAt: time,
    updatedAt: time,
    archivedAt: null,
    status: payload.status || "active",
    version: 1,
    ...payload
  };
}

export function createRecord(state, entity, payload, activityLabel) {
  const row = baseRecord(entity, payload);
  state[entity].unshift(row);
  addActivity(state, activityLabel || `Created ${entity}`);
  return row;
}

export function updateRecord(state, entity, id, patch, activityLabel) {
  const list = state[entity] || [];
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const current = list[idx];
  const next = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
    version: Number(current.version || 1) + 1
  };
  list[idx] = next;
  addActivity(state, activityLabel || `Updated ${entity}`);
  return next;
}

export function archiveRecord(state, entity, id, activityLabel) {
  return updateRecord(
    state,
    entity,
    id,
    { archivedAt: nowIso(), status: "archived" },
    activityLabel || `Archived ${entity}`
  );
}

export function addActivity(state, message) {
  state.activityLog.unshift({ id: uid("act"), message, createdAt: nowIso() });
  state.activityLog = state.activityLog.slice(0, 120);
}

export function activeRows(state, entity) {
  return (state[entity] || []).filter((r) => !r.archivedAt);
}

export function resetState(state) {
  const fresh = seedState();
  fresh.session.ok = Boolean(state?.session?.ok);
  return fresh;
}

export function backupEnvelope(state, appVersion) {
  const counts = {
    students: state.students.length,
    tutors: state.tutors.length,
    schedule: state.schedule.length,
    lessons: state.lessons.length,
    attendance: state.attendance.length,
    payments: state.payments.length,
    expenses: state.expenses.length
  };
  return {
    meta: {
      app: "EduPulse by Ray",
      version: appVersion,
      exportedAt: nowIso(),
      businessName: state.settings.businessName || "EduPulse by Ray",
      counts
    },
    data: state
  };
}

export function applyBackup(state, envelope) {
  const data = envelope?.data || envelope;
  const merged = mergeState(data);
  merged.session.ok = Boolean(state?.session?.ok);
  addActivity(merged, "Backup restored");
  return merged;
}

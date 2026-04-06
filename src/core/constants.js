export const APP_VERSION = "3.0.0";
export const APP_NAME = "EduPulse by Ray";
export const DB_NAME = "edupulse-ray-db";
export const DB_VERSION = 1;

export const TABLES = {
  students: "students",
  tutors: "tutors",
  lessons: "lessons",
  attendance: "attendance",
  payments: "payments",
  expenses: "expenses",
  scheduleEvents: "scheduleEvents",
  notes: "notes",
  reports: "reports",
  activityLog: "activityLog",
  backupJobs: "backupJobs",
  settings: "settings"
};

export const ENTITY_TABLES = [
  TABLES.students,
  TABLES.tutors,
  TABLES.lessons,
  TABLES.attendance,
  TABLES.payments,
  TABLES.expenses,
  TABLES.scheduleEvents,
  TABLES.notes,
  TABLES.reports
];

export const ROUTES = [
  "dashboard",
  "students",
  "tutors",
  "schedule",
  "lessons",
  "attendance",
  "payments",
  "expenses",
  "reports",
  "insights",
  "backup",
  "settings"
];

export const DEFAULT_SETTINGS = {
  appVersion: APP_VERSION,
  businessName: APP_NAME,
  accentColor: "#0d9f8f",
  themeMode: "light",
  currency: "ZAR",
  auth: {
    enabled: true,
    username: "admin",
    passcodeHash: "",
    passcodeSalt: "",
    rememberSession: true,
    sessionHours: 168
  },
  backup: {
    encryptByDefault: false,
    passphraseHint: "",
    googleDriveEnabled: false,
    googleClientId: "",
    googleAppFolder: "EduPulseBackups"
  },
  ai: {
    enabled: false,
    provider: "openai-compatible",
    endpoint: "https://api.openai.com/v1/responses",
    apiKey: "",
    model: "gpt-4.1-mini"
  },
  notifications: {
    upcomingLessonHours: 24
  }
};

export const LESSON_STATUSES = ["planned", "completed", "missed", "cancelled"];
export const ATTENDANCE_STATUSES = ["present", "late", "absent", "excused"];
export const PAYMENT_STATUSES = ["paid", "partial", "unpaid", "overdue"];
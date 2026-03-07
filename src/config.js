export const APP_INFO = {
  name: "X-Factor Tutoring Management",
  dbName: "xfactor-tutoring-db",
  dbVersion: 2,
  tenantId: "xfactor-default"
};

export const TABLES = {
  students: "students",
  lessons: "lessons",
  attendance: "attendance",
  payments: "payments",
  expenses: "expenses",
  schedule: "schedule",
  reports: "reports",
  syncQueue: "syncQueue",
  settings: "settings"
};

export const SNAPSHOT_TABLES = [
  TABLES.students,
  TABLES.lessons,
  TABLES.attendance,
  TABLES.payments,
  TABLES.expenses,
  TABLES.schedule,
  TABLES.reports
];

export const DEFAULT_SUBJECTS = [
  "Maths",
  "Accounting",
  "English",
  "Life Sciences",
  "Physical Sciences"
];

export const DEFAULT_GRADES = [
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12"
];

export const DEFAULT_SETTINGS = {
  appVersion: "1.0.0",
  businessName: "X-Factor Tutoring",
  customStudentFields: [
    { key: "school", label: "School", type: "text" },
    { key: "parentName", label: "Parent Name", type: "text" },
    { key: "parentContact", label: "Parent Contact", type: "text" },
    { key: "parentEmail", label: "Parent Email", type: "text" },
    { key: "learningGoals", label: "Learning Goals", type: "textarea" },
    { key: "specialNotes", label: "Special Notes", type: "textarea" }
  ],
  lessonCategories: ["Revision", "Exam Prep", "Homework Support", "Concept Build"],
  lessonCustomFields: [],
  scheduleCustomFields: [],
  subjects: DEFAULT_SUBJECTS,
  grades: DEFAULT_GRADES,
  paymentTypes: ["EFT", "Cash", "Card"],
  defaultLessonDuration: 60,
  qrFormat: "XFACTOR:{id}",
  parentCommunicationTemplate: "Today {student} worked on {subject}. Homework: {homework}. Notes: {progress}.",
  dashboardFilters: {
    studentId: "",
    subject: "",
    grade: "",
    fromDate: "",
    toDate: ""
  },
  backup: {
    includeSettings: true,
    includeReports: true,
    encryptBackups: true,
    backupPassphraseHint: ""
  },
  auth: {
    localEnabled: true,
    localAdminUsername: "admin",
    localPasswordHash: "",
    localSalt: "",
    googleEnabled: false,
    googleClientId: "",
    allowedGoogleEmail: "",
    sessionTtlHours: 336
  },
  syncProfiles: [
    {
      id: "local-profile",
      label: "Local profile",
      gmail: "",
      endpoint: "",
      active: true
    }
  ],
  activeProfileId: "local-profile",
  ui: {
    lastView: "dashboard"
  }
};

export const SYNC = {
  maxRetries: 6,
  baseRetryDelayMs: 5000,
  heartbeatMs: 25000,
  queueBatchSize: 25
};

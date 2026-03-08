export const APP_INFO = {
  name: "EduPulse by Ray",
  dbName: "data-insights-ray-db",
  dbVersion: 3,
  tenantId: "dir-default"
};

export const TABLES = {
  students: "students",
  tutors: "tutors",
  lessons: "lessons",
  assignments: "assignments",
  attendance: "attendance",
  payments: "payments",
  expenses: "expenses",
  schedule: "schedule",
  messages: "messages",
  notifications: "notifications",
  performanceMetrics: "performanceMetrics",
  businessMetrics: "businessMetrics",
  reports: "reports",
  syncQueue: "syncQueue",
  settings: "settings"
};

export const SNAPSHOT_TABLES = [
  TABLES.students,
  TABLES.tutors,
  TABLES.lessons,
  TABLES.assignments,
  TABLES.attendance,
  TABLES.payments,
  TABLES.expenses,
  TABLES.schedule,
  TABLES.messages,
  TABLES.notifications,
  TABLES.performanceMetrics,
  TABLES.businessMetrics,
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
  appVersion: "2.2.0",
  businessName: "EduPulse by Ray",
  appName: "EduPulse by Ray",
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
  qrFormat: "DIR:{tenantId}:{id}",
  parentCommunicationTemplate: "Today {student} worked on {subject}. Homework: {homework}. Notes: {progress}.",
  themePalette: {
    primary: "#031A45",
    secondary: "#0A4F96",
    accent: "#50E7E8"
  },
  planCatalog: {
    starter: { key: "starter", label: "Starter", maxStudents: 80, maxTutors: 4 },
    growth: { key: "growth", label: "Growth", maxStudents: 300, maxTutors: 15 },
    pro: { key: "pro", label: "Pro", maxStudents: 2000, maxTutors: 100 }
  },
  billing: {
    enabled: true,
    requireActiveSubscription: true,
    stripePublishableKey: "",
    stripeCheckoutEndpoint: "",
    stripePriceIds: {
      starter: "",
      growth: "",
      pro: ""
    }
  },
  tenantPlans: {
    "local-profile": "starter"
  },
  tenantRegistry: [
    {
      tenantId: "dir-default",
      tenantName: "EduPulse Default Tenant",
      adminEmail: "honestkai224@gmail.com",
      status: "active",
      plan: "starter"
    }
  ],
  onboarding: {
    completed: false
  },
  superAdmin: {
    enabled: true,
    companyName: "Data Insights by Ray"
  },
  ai: {
    enabled: false,
    provider: "gemini",
    apiKey: "",
    model: "gemini-2.0-flash",
    systemPrompt: "You are an analytics and tutoring operations assistant."
  },
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
    googleSheetsEndpoint: "",
    allowedGoogleEmail: "honestkai224@gmail.com",
    sessionTtlHours: 336
  },
  developer: {
    passwordSalt: "",
    passwordHash: ""
  },
  syncProfiles: [
    {
      id: "local-profile",
      label: "EduPulse Main Tenant",
      gmail: "honestkai224@gmail.com",
      tenantId: "dir-default",
      subscriptionStatus: "trial",
      endpoint: "",
      active: true
    }
  ],
  activeProfileId: "local-profile",
  ui: {
    lastView: "dashboard",
    themeMode: "light"
  }
};

export const SYNC = {
  maxRetries: 6,
  baseRetryDelayMs: 5000,
  heartbeatMs: 25000,
  queueBatchSize: 25
};

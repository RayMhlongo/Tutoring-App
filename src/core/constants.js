export const APP_VERSION = "4.0.0";

export const DB_KEY = "edupulse_v6";

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

export const ROUTE_LABELS = {
  dashboard: "Dashboard",
  students: "Students",
  tutors: "Tutors",
  schedule: "Schedule",
  lessons: "Lessons",
  attendance: "Attendance",
  payments: "Payments",
  expenses: "Expenses",
  reports: "Reports",
  insights: "Insights",
  backup: "Backup",
  settings: "Settings"
};

export function defaults() {
  return {
    settings: {
      businessName: "EduPulse by Ray",
      currency: "ZAR",
      theme: "light",
      username: "admin",
      passcode: "1234",
      accent: "teal"
    },
    session: {
      ok: false,
      remember: true
    },
    students: [],
    tutors: [],
    schedule: [],
    lessons: [],
    attendance: [],
    payments: [],
    expenses: [],
    activityLog: []
  };
}

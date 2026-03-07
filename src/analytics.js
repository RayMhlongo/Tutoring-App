import { formatDate, todayISODate } from "./utils.js";

const POSITIVE_KEYWORDS = ["improved", "excellent", "great", "confident", "mastered", "progress"];
const NEGATIVE_KEYWORDS = ["struggle", "weak", "behind", "needs help", "concern", "difficult"];

function scoreTextKeywords(text, keywords) {
  const lower = String(text || "").toLowerCase();
  return keywords.reduce((score, keyword) => score + (lower.includes(keyword) ? 1 : 0), 0);
}

function daysAgoIso(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function applyDashboardFilters(records, filters = {}) {
  return records
    .filter((item) => !filters.studentId || item.studentId === filters.studentId)
    .filter((item) => !filters.subject || item.subject === filters.subject)
    .filter((item) => !filters.fromDate || item.date >= filters.fromDate)
    .filter((item) => !filters.toDate || item.date <= filters.toDate);
}

export function buildAnalytics({
  students = [],
  lessons = [],
  schedule = [],
  filters = {}
}) {
  const filteredLessons = applyDashboardFilters(lessons, filters);
  const filteredSchedule = applyDashboardFilters(schedule, filters);
  const last30Start = daysAgoIso(30);
  const prev30Start = daysAgoIso(60);
  const prev30End = daysAgoIso(31);
  const staleCutoff = daysAgoIso(14);

  const mostStudiedMap = {};
  const weakSubjectMap = {};
  const studentMetrics = students.map((student) => {
    const studentLessons = filteredLessons.filter((lesson) => lesson.studentId === student.id);
    const recent = studentLessons.filter((lesson) => lesson.date >= last30Start);
    const previous = studentLessons.filter((lesson) => lesson.date >= prev30Start && lesson.date <= prev30End);
    const homeworkDone = studentLessons.filter((lesson) =>
      lesson.homeworkCompleted === true ||
      String(lesson.progressSummary || "").toLowerCase().includes("homework done") ||
      String(lesson.homeworkAssigned || "").trim().length === 0
    ).length;
    const homeworkRate = studentLessons.length ? homeworkDone / studentLessons.length : 0;
    const positiveScore = studentLessons.reduce((score, lesson) => score + scoreTextKeywords(lesson.progressSummary, POSITIVE_KEYWORDS), 0);
    const negativeScore = studentLessons.reduce((score, lesson) => score + scoreTextKeywords(lesson.progressSummary, NEGATIVE_KEYWORDS), 0);
    const lastLessonDate = studentLessons.length
      ? studentLessons.map((lesson) => lesson.date).sort().slice(-1)[0]
      : "";

    studentLessons.forEach((lesson) => {
      if (!lesson.subject) return;
      mostStudiedMap[lesson.subject] = (mostStudiedMap[lesson.subject] || 0) + 1;
      weakSubjectMap[lesson.subject] = (weakSubjectMap[lesson.subject] || 0) + scoreTextKeywords(lesson.progressSummary, NEGATIVE_KEYWORDS);
    });

    const improvingScore = (recent.length - previous.length) + positiveScore * 0.35 + homeworkRate * 4;
    const needsAttentionScore = (lastLessonDate && lastLessonDate < staleCutoff ? 3 : 0) + negativeScore * 0.45 + (homeworkRate < 0.45 ? 2 : 0);

    return {
      studentId: student.id,
      studentName: `${student.firstName || ""} ${student.surname || ""}`.trim(),
      grade: student.grade || "",
      lessonsRecent: recent.length,
      homeworkRate,
      lastLessonDate,
      improvingScore,
      needsAttentionScore
    };
  });

  const topImprovingStudents = studentMetrics
    .filter((item) => item.lessonsRecent > 0)
    .sort((a, b) => b.improvingScore - a.improvingScore)
    .slice(0, 5);

  const studentsNeedingHelp = studentMetrics
    .filter((item) => item.lessonsRecent > 0 || !item.lastLessonDate)
    .sort((a, b) => b.needsAttentionScore - a.needsAttentionScore)
    .slice(0, 5);

  const weakSubjects = Object.entries(weakSubjectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([subject, score]) => ({ subject, score }));

  const mostStudiedSubjects = Object.entries(mostStudiedMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([subject, count]) => ({ subject, count }));

  const upcoming = filteredSchedule
    .filter((entry) => entry.date >= todayISODate())
    .slice(0, 8)
    .map((entry) => ({
      ...entry,
      label: `${formatDate(entry.date)} ${entry.timeStart || ""}`
    }));

  return {
    topImprovingStudents,
    studentsNeedingHelp,
    weakSubjects,
    mostStudiedSubjects,
    upcoming
  };
}

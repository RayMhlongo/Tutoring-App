let loadPromise = null;

function hasGoogleCharts() {
  return Boolean(window.google?.charts && window.google?.visualization);
}

async function ensureChartsLoaded() {
  if (hasGoogleCharts()) return;
  if (!window.google?.charts?.load) {
    throw new Error("Google Charts loader is unavailable.");
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve) => {
      window.google.charts.load("current", { packages: ["corechart", "bar", "line"] });
      window.google.charts.setOnLoadCallback(() => resolve());
    });
  }
  await loadPromise;
}

function drawChart(id, tableData, options, chartKind = "ColumnChart") {
  const element = document.getElementById(id);
  if (!element) return;
  if (!Array.isArray(tableData) || tableData.length <= 1) {
    element.innerHTML = `<div class="empty-state">Not enough data yet.</div>`;
    return;
  }
  const data = window.google.visualization.arrayToDataTable(tableData);
  const ChartCtor = window.google.visualization[chartKind] || window.google.visualization.ColumnChart;
  const chart = new ChartCtor(element);
  chart.draw(data, {
    legend: { position: "top" },
    backgroundColor: "transparent",
    chartArea: { width: "82%", height: "72%" },
    ...options
  });
}

export async function renderDashboardCharts(payload) {
  try {
    await ensureChartsLoaded();
  } catch {
    return;
  }

  const subjectRows = [["Subject", "Lessons"]]
    .concat((payload.subjects || []).map((item) => [String(item.subject || "Unknown"), Number(item.count || 0)]));

  const attendanceRows = [["Date", "Check-ins"]]
    .concat((payload.attendance || []).map((item) => [String(item.date || ""), Number(item.count || 0)]));

  const revenueRows = [["Month", "Revenue"]]
    .concat((payload.revenue || []).map((item) => [String(item.month || ""), Number(item.amount || 0)]));

  const tutorRows = [["Tutor", "Sessions"]]
    .concat((payload.tutorEffectiveness || []).map((item) => [String(item.tutor || "Unassigned"), Number(item.count || 0)]));

  drawChart("chartSubjects", subjectRows, {
    title: "Most Studied Subjects",
    colors: ["#10B5E7"]
  }, "PieChart");

  drawChart("chartAttendance", attendanceRows, {
    title: "Attendance Trend (Last 14 days)",
    colors: ["#2A70FF"],
    curveType: "function"
  }, "LineChart");

  drawChart("chartRevenue", revenueRows, {
    title: "Revenue by Month",
    colors: ["#00C8A5"]
  }, "ColumnChart");

  drawChart("chartTutorEffectiveness", tutorRows, {
    title: "Tutor Effectiveness (Sessions)",
    colors: ["#5E85FF"]
  }, "BarChart");
}

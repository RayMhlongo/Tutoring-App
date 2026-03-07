export function dashboardTemplate(data){
  const m=data.metrics||{};
  return `<section class="card"><h2>Business Dashboard</h2><div class="split">
    <div>Today's lessons: <strong>${m.todaysLessons||0}</strong></div>
    <div>Students present: <strong>${m.presentToday||0}</strong></div>
    <div>Outstanding payments: <strong>${m.outstanding||0}</strong></div>
    <div>Monthly revenue: <strong>${m.monthlyRevenue||0}</strong></div>
  </div></section>`;
}

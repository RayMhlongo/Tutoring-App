export function buildAnalytics(students=[],lessons=[]){
  const byStudent={};
  lessons.forEach(l=>{byStudent[l.studentId]=(byStudent[l.studentId]||0)+1;});
  const top=Object.entries(byStudent).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([studentId,count])=>({studentId,count}));
  return {topStudents:top,lessonCount:lessons.length,studentCount:students.length};
}

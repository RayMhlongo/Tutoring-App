import { listTable } from './storage.js';

export async function getDashboardMetrics(){
  const [lessons,attendance,payments]=await Promise.all([listTable('lessons'),listTable('attendance'),listTable('payments')]);
  const today=new Date().toISOString().slice(0,10);
  const month=today.slice(0,7);
  const monthlyRevenue=payments.filter(p=>String(p.date||'').startsWith(month)).reduce((s,p)=>s+Number(p.amount||0),0);
  const outstanding=payments.reduce((s,p)=>s+Math.max(Number(p.amountDue||0)-Number(p.amountPaid||0),0),0);
  return {todaysLessons:lessons.filter(l=>l.date===today).length,presentToday:attendance.filter(a=>a.date===today).length,monthlyRevenue,outstanding};
}

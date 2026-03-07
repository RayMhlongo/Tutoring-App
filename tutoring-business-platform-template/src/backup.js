import { listTable } from './storage.js';

export async function exportBackupJson(){
  const payload={
    students:await listTable('students'),
    lessons:await listTable('lessons'),
    attendance:await listTable('attendance'),
    payments:await listTable('payments'),
    schedule:await listTable('schedule')
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`template-backup-${Date.now()}.json`;a.click();
  URL.revokeObjectURL(url);
}

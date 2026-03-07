import { putRecord, listTable } from './storage.js';

export async function logAttendance(entry){
  const id=entry.id||`att-${Date.now()}`;
  return putRecord('attendance',{id,...entry});
}

export async function getAttendance(){return listTable('attendance');}

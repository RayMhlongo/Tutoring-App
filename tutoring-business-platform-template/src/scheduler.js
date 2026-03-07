import { putRecord, listTable } from './storage.js';

export async function addSchedule(item){
  const id=item.id||`sch-${Date.now()}`;
  return putRecord('schedule',{id,...item});
}

export async function getSchedule(){return listTable('schedule');}

const DexieRef=window.Dexie;
export const db=new DexieRef('tutoring-template-db');
db.version(1).stores({
  students:'id,updatedAt',
  lessons:'id,date,studentId',
  attendance:'id,date,studentId',
  payments:'id,date,studentId',
  reports:'id,createdAt',
  schedule:'id,date,timeStart,studentId',
  settings:'key'
});

export async function initStorage(){await db.open();}
export async function getSetting(key,fallback=null){const row=await db.settings.get(key);return row?row.value:fallback;}
export async function setSetting(key,value){await db.settings.put({key,value,updatedAt:new Date().toISOString()});}
export async function putRecord(table,record){const item={...record,updatedAt:new Date().toISOString()};await db[table].put(item);return item;}
export async function listTable(table){return db[table].toArray();}

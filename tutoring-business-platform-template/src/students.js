import { putRecord, listTable } from './storage.js';

export async function addStudent(student){
  const id=student.id||`stu-${Date.now()}`;
  return putRecord('students',{id,...student});
}

export async function getStudents(){return listTable('students');}

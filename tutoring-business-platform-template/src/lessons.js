import { putRecord, listTable } from './storage.js';

export async function addLesson(lesson){
  const id=lesson.id||`les-${Date.now()}`;
  return putRecord('lessons',{id,...lesson});
}

export async function getLessons(){return listTable('lessons');}

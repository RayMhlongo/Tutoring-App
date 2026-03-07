import { getSetting, setSetting } from './storage.js';

const SESSION_KEY='authSession';

export async function loginLocal(username,password){
  const saved=await getSetting('localAdmin',{username:'admin',password:'admin123'});
  if(String(username)!==String(saved.username)||String(password)!==String(saved.password)) throw new Error('Invalid credentials');
  const session={mode:'local',username,createdAt:new Date().toISOString()};
  await setSetting(SESSION_KEY,session);
  return session;
}

export async function loginGoogle(email,allowedEmail){
  if(allowedEmail && email!==allowedEmail) throw new Error('Google email not allowed');
  const session={mode:'google',email,createdAt:new Date().toISOString()};
  await setSetting(SESSION_KEY,session);
  return session;
}

export async function getSession(){return getSetting(SESSION_KEY,null);}
export async function logout(){await setSetting(SESSION_KEY,null);}

const DB_KEY = 'edupulse_v5';

const ROUTES = ['dashboard','students','tutors','schedule','lessons','attendance','payments','expenses','reports','insights','backup','settings'];
const LABELS = Object.fromEntries(ROUTES.map((r)=>[r,r[0].toUpperCase()+r.slice(1)]));

let state = loadState();
let route = 'dashboard';

function defaults(){
  return {
    settings:{businessName:'EduPulse by Ray',theme:'light',currency:'ZAR',username:'admin',passcode:'1234'},
    session:{ok:false},
    students:[],tutors:[],schedule:[],lessons:[],attendance:[],payments:[],expenses:[]
  };
}

function loadState(){
  try{const raw=localStorage.getItem(DB_KEY);if(!raw)return defaults();const parsed=JSON.parse(raw);return {...defaults(),...parsed,settings:{...defaults().settings,...(parsed.settings||{})},session:{...defaults().session,...(parsed.session||{})}};}catch{return defaults();}
}
function saveState(){localStorage.setItem(DB_KEY,JSON.stringify(state));}
function uid(p){return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;}
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
function money(v){const n=Number(v||0);return new Intl.NumberFormat('en-ZA',{style:'currency',currency:state.settings.currency||'ZAR'}).format(Number.isFinite(n)?n:0);}
function toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.className='toast show';clearTimeout(window.__t);window.__t=setTimeout(()=>t.className='toast',2200);}

function boot(){
  try{
    if(!state.session.ok){renderAuth();return;}
    renderApp();
  }catch(e){showBootError(e.message||String(e));}
}

function showBootError(msg){
  const p=document.getElementById('bootError');
  const t=document.getElementById('bootErrorText');
  if(p&&t){p.hidden=false;t.textContent=msg;}
}

function renderAuth(){
  document.getElementById('app').innerHTML = `
    <div class="auth">
      <section class="card" style="width:min(460px,100%)">
        <h2>Secure Access</h2>
        <p class="sub">Local admin login</p>
        <form id="loginForm" class="grid">
          <label>Username<input class="input" name="username" value="admin" required></label>
          <label>Passcode<input class="input" name="passcode" type="password" required></label>
          <button class="btn" type="submit">Unlock</button>
        </form>
      </section>
    </div>`;
  document.getElementById('loginForm').addEventListener('submit',(e)=>{
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    if(String(f.get('username')||'')===state.settings.username && String(f.get('passcode')||'')===state.settings.passcode){
      state.session.ok=true;saveState();renderApp();
    }else toast('Invalid credentials');
  });
}

function shell(content){
  const nav=ROUTES.map(r=>`<button data-route="${r}" class="${r===route?'active':''}">${LABELS[r]}</button>`).join('');
  return `
    <header class="top">
      <div><h1>${esc(state.settings.businessName)}</h1><div class="sub">Offline-first tutoring manager</div></div>
      <div class="toolbar"><span class="pill">${navigator.onLine?'Online':'Offline'}</span><button id="lockBtn" class="btn ghost">Lock</button></div>
    </header>
    <nav class="nav">${nav}</nav>
    <main class="main">${content}</main>
  `;
}

function card(title,body){return `<section class="card"><h2>${esc(title)}</h2>${body}</section>`;}

function table(headers,rows){
  if(!rows.length) return '<div class="empty">No data yet</div>';
  return `<div class="table"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderDashboard(){
  const outstanding = state.payments.reduce((s,p)=>s+Math.max(0,Number(p.amountDue||0)-Number(p.amountPaid||0)),0);
  const revenue = state.payments.reduce((s,p)=>s+Number(p.amountPaid||0),0);
  const expenses = state.expenses.reduce((s,p)=>s+Number(p.amount||0),0);
  const today = new Date().toISOString().slice(0,10);
  const todayLessons = state.schedule.filter(x=>x.date===today).length;
  return card('Dashboard',`
    <div class="grid grid2">
      <div class="card"><strong>Students</strong><div>${state.students.length}</div></div>
      <div class="card"><strong>Tutors</strong><div>${state.tutors.length}</div></div>
      <div class="card"><strong>Today Lessons</strong><div>${todayLessons}</div></div>
      <div class="card"><strong>Outstanding</strong><div>${money(outstanding)}</div></div>
      <div class="card"><strong>Revenue</strong><div>${money(revenue)}</div></div>
      <div class="card"><strong>Expenses</strong><div>${money(expenses)}</div></div>
    </div>
  `);
}

function bindSimpleForm(formId, listKey, map){
  const form=document.getElementById(formId); if(!form) return;
  form.addEventListener('submit',(e)=>{
    e.preventDefault(); const f=new FormData(form); const row=map(f); row.id=uid(listKey.slice(0,3));
    state[listKey].unshift(row); saveState(); renderApp(); toast('Saved');
  });
}

function renderStudents(){
  const rows=state.students.map(s=>[`${esc(s.firstName)} ${esc(s.surname)}`,esc(s.grade),esc(s.school),esc(s.subjects),esc(s.guardian),esc(s.contact)]);
  return card('Students',`
    <form id="studentsForm" class="grid grid2">
      <label>First name<input class="input" name="firstName" required></label>
      <label>Surname<input class="input" name="surname" required></label>
      <label>Grade<input class="input" name="grade"></label>
      <label>School<input class="input" name="school"></label>
      <label>Subjects<input class="input" name="subjects"></label>
      <label>Guardian<input class="input" name="guardian"></label>
      <label>Contact<input class="input" name="contact"></label>
      <label style="grid-column:1/-1">Notes<textarea class="input" name="notes"></textarea></label>
      <button class="btn" type="submit">Add Student</button>
    </form>
    ${table(['Student','Grade','School','Subjects','Guardian','Contact'],rows)}
  `);
}

function renderTutors(){
  const rows=state.tutors.map(t=>[`${esc(t.firstName)} ${esc(t.surname)}`,esc(t.subjects),esc(t.contact),esc(t.availability)]);
  return card('Tutors',`
    <form id="tutorsForm" class="grid grid2">
      <label>First name<input class="input" name="firstName" required></label>
      <label>Surname<input class="input" name="surname" required></label>
      <label>Subjects<input class="input" name="subjects"></label>
      <label>Contact<input class="input" name="contact"></label>
      <label style="grid-column:1/-1">Availability<textarea class="input" name="availability"></textarea></label>
      <button class="btn" type="submit">Add Tutor</button>
    </form>
    ${table(['Tutor','Subjects','Contact','Availability'],rows)}
  `);
}

function renderSchedule(){
  const rows=state.schedule.map(s=>[esc(s.date),esc(s.start),esc(s.end),esc(s.student),esc(s.tutor),esc(s.type),esc(s.status)]);
  return card('Schedule',`
    <form id="scheduleForm" class="grid grid2">
      <label>Date<input class="input" type="date" name="date" required></label>
      <label>Type<input class="input" name="type"></label>
      <label>Start<input class="input" type="time" name="start" required></label>
      <label>End<input class="input" type="time" name="end" required></label>
      <label>Student ID<input class="input" name="student" required></label>
      <label>Tutor ID<input class="input" name="tutor" required></label>
      <label>Status<select class="input" name="status"><option>planned</option><option>completed</option><option>missed</option><option>cancelled</option></select></label>
      <button class="btn" type="submit">Add Event</button>
    </form>
    ${table(['Date','Start','End','Student','Tutor','Type','Status'],rows)}
  `);
}

function renderLessons(){
  const rows=state.lessons.map(l=>[esc(l.date),esc(l.subject),esc(l.student),esc(l.tutor),esc(l.duration),esc(l.status)]);
  return card('Lessons',`
    <form id="lessonsForm" class="grid grid2">
      <label>Date<input class="input" type="date" name="date" required></label>
      <label>Subject<input class="input" name="subject" required></label>
      <label>Student ID<input class="input" name="student" required></label>
      <label>Tutor ID<input class="input" name="tutor" required></label>
      <label>Duration mins<input class="input" type="number" name="duration" value="60"></label>
      <label>Status<select class="input" name="status"><option>planned</option><option>completed</option><option>missed</option><option>cancelled</option></select></label>
      <label style="grid-column:1/-1">Notes<textarea class="input" name="notes"></textarea></label>
      <button class="btn" type="submit">Add Lesson</button>
    </form>
    ${table(['Date','Subject','Student','Tutor','Duration','Status'],rows)}
  `);
}

function renderAttendance(){
  const rows=state.attendance.map(a=>[esc(a.date),esc(a.student),esc(a.tutor),esc(a.status),esc(a.note)]);
  return card('Attendance',`
    <form id="attendanceForm" class="grid grid2">
      <label>Date<input class="input" type="date" name="date" required></label>
      <label>Student ID<input class="input" name="student" required></label>
      <label>Tutor ID<input class="input" name="tutor"></label>
      <label>Status<select class="input" name="status"><option>present</option><option>late</option><option>absent</option><option>excused</option></select></label>
      <label style="grid-column:1/-1">Note<textarea class="input" name="note"></textarea></label>
      <button class="btn" type="submit">Mark Attendance</button>
    </form>
    ${table(['Date','Student','Tutor','Status','Note'],rows)}
  `);
}

function renderPayments(){
  const rows=state.payments.map(p=>[esc(p.date),esc(p.student),money(p.amountDue),money(p.amountPaid),money(Number(p.amountDue||0)-Number(p.amountPaid||0)),esc(p.method),esc(p.status)]);
  return card('Payments',`
    <form id="paymentsForm" class="grid grid2">
      <label>Date<input class="input" type="date" name="date" required></label>
      <label>Student ID<input class="input" name="student" required></label>
      <label>Amount due<input class="input" type="number" step="0.01" name="amountDue" required></label>
      <label>Amount paid<input class="input" type="number" step="0.01" name="amountPaid" required></label>
      <label>Method<input class="input" name="method" value="EFT"></label>
      <label>Status<select class="input" name="status"><option>paid</option><option>partial</option><option>unpaid</option><option>overdue</option></select></label>
      <button class="btn" type="submit">Record Payment</button>
    </form>
    ${table(['Date','Student','Due','Paid','Balance','Method','Status'],rows)}
  `);
}

function renderExpenses(){
  const rows=state.expenses.map(e=>[esc(e.date),esc(e.category),money(e.amount),esc(e.note)]);
  return card('Expenses',`
    <form id="expensesForm" class="grid grid2">
      <label>Date<input class="input" type="date" name="date" required></label>
      <label>Category<input class="input" name="category" required></label>
      <label>Amount<input class="input" type="number" step="0.01" name="amount" required></label>
      <label>Note<input class="input" name="note"></label>
      <button class="btn" type="submit">Add Expense</button>
    </form>
    ${table(['Date','Category','Amount','Note'],rows)}
  `);
}

function csv(headers,rows){
  const escCsv=(v)=>`"${String(v??'').replaceAll('"','""')}"`;
  return [headers.map(escCsv).join(','),...rows.map(r=>r.map(escCsv).join(','))].join('\n');
}
function download(name,text,type){const b=new Blob([text],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(u);}

function renderReports(){
  const summary=[['students',state.students.length],['tutors',state.tutors.length],['schedule',state.schedule.length],['lessons',state.lessons.length],['attendance',state.attendance.length],['payments',state.payments.length],['expenses',state.expenses.length]];
  const overdue=state.payments.filter(p=>Number(p.amountDue||0)>Number(p.amountPaid||0)).map(p=>[p.date,p.student,p.amountDue,p.amountPaid,Number(p.amountDue||0)-Number(p.amountPaid||0)]);
  return card('Reports',`
    <div class="toolbar">
      <button id="expSummary" class="btn">Export Summary CSV</button>
      <button id="expOverdue" class="btn ghost">Export Overdue CSV</button>
      <button id="printBtn" class="btn ghost">Print</button>
    </div>
    ${table(['Metric','Value'],summary.map(r=>[esc(r[0]),esc(r[1])]))}
    ${table(['Date','Student','Due','Paid','Balance'],overdue.map(r=>[esc(r[0]),esc(r[1]),money(r[2]),money(r[3]),money(r[4])]))}
  `);
}

function renderInsights(){
  const overdue=state.payments.filter(p=>Number(p.amountDue||0)>Number(p.amountPaid||0));
  const absent=state.attendance.filter(a=>a.status==='absent');
  const byDay={}; state.schedule.forEach(s=>{byDay[s.date]=(byDay[s.date]||0)+1;});
  const busiest=Object.entries(byDay).sort((a,b)=>b[1]-a[1])[0];
  const tips=[
    `Outstanding payments records: ${overdue.length}`,
    `Students marked absent: ${absent.length}`,
    busiest?`Busiest day: ${busiest[0]} (${busiest[1]} sessions)`:'No schedule trend yet'
  ];
  return card('Insights',`<ul>${tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p class="sub">AI optional integration can be added later; app stays fully usable offline.</p>`);
}

function renderBackup(){
  return card('Backup & Restore',`
    <div class="toolbar"><button id="backupBtn" class="btn">Export JSON Backup</button></div>
    <form id="restoreForm" class="grid">
      <label>Restore file<input class="input" type="file" name="file" accept="application/json" required></label>
      <label><input type="checkbox" name="confirm"> Confirm overwrite</label>
      <button class="btn danger" type="submit">Restore</button>
    </form>
    <div class="toolbar"><button id="resetBtn" class="btn danger">Factory Reset Data</button></div>
  `);
}

function renderSettings(){
  return card('Settings',`
    <form id="settingsForm" class="grid grid2">
      <label>Business name<input class="input" name="businessName" value="${esc(state.settings.businessName)}"></label>
      <label>Currency<input class="input" name="currency" value="${esc(state.settings.currency)}"></label>
      <label>Admin username<input class="input" name="username" value="${esc(state.settings.username)}"></label>
      <label>Admin passcode<input class="input" name="passcode" value="${esc(state.settings.passcode)}"></label>
      <button class="btn" type="submit">Save Settings</button>
    </form>
  `);
}

function renderRoute(){
  if(route==='dashboard') return renderDashboard();
  if(route==='students') return renderStudents();
  if(route==='tutors') return renderTutors();
  if(route==='schedule') return renderSchedule();
  if(route==='lessons') return renderLessons();
  if(route==='attendance') return renderAttendance();
  if(route==='payments') return renderPayments();
  if(route==='expenses') return renderExpenses();
  if(route==='reports') return renderReports();
  if(route==='insights') return renderInsights();
  if(route==='backup') return renderBackup();
  if(route==='settings') return renderSettings();
  return renderDashboard();
}

function bindCommon(){
  document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>{route=b.dataset.route;renderApp();}));
  document.getElementById('lockBtn')?.addEventListener('click',()=>{state.session.ok=false;saveState();renderAuth();});
}

function bindRoute(){
  bindSimpleForm('studentsForm','students',(f)=>({firstName:String(f.get('firstName')||''),surname:String(f.get('surname')||''),grade:String(f.get('grade')||''),school:String(f.get('school')||''),subjects:String(f.get('subjects')||''),guardian:String(f.get('guardian')||''),contact:String(f.get('contact')||''),notes:String(f.get('notes')||'')}));
  bindSimpleForm('tutorsForm','tutors',(f)=>({firstName:String(f.get('firstName')||''),surname:String(f.get('surname')||''),subjects:String(f.get('subjects')||''),contact:String(f.get('contact')||''),availability:String(f.get('availability')||'')}));
  bindSimpleForm('scheduleForm','schedule',(f)=>({date:String(f.get('date')||''),type:String(f.get('type')||''),start:String(f.get('start')||''),end:String(f.get('end')||''),student:String(f.get('student')||''),tutor:String(f.get('tutor')||''),status:String(f.get('status')||'planned')}));
  bindSimpleForm('lessonsForm','lessons',(f)=>({date:String(f.get('date')||''),subject:String(f.get('subject')||''),student:String(f.get('student')||''),tutor:String(f.get('tutor')||''),duration:String(f.get('duration')||''),status:String(f.get('status')||'planned'),notes:String(f.get('notes')||'')}));
  bindSimpleForm('attendanceForm','attendance',(f)=>({date:String(f.get('date')||''),student:String(f.get('student')||''),tutor:String(f.get('tutor')||''),status:String(f.get('status')||'present'),note:String(f.get('note')||'')}));
  bindSimpleForm('paymentsForm','payments',(f)=>({date:String(f.get('date')||''),student:String(f.get('student')||''),amountDue:Number(f.get('amountDue')||0),amountPaid:Number(f.get('amountPaid')||0),method:String(f.get('method')||''),status:String(f.get('status')||'paid')}));
  bindSimpleForm('expensesForm','expenses',(f)=>({date:String(f.get('date')||''),category:String(f.get('category')||''),amount:Number(f.get('amount')||0),note:String(f.get('note')||'')}));

  document.getElementById('expSummary')?.addEventListener('click',()=>{
    const summary=[['students',state.students.length],['tutors',state.tutors.length],['schedule',state.schedule.length],['lessons',state.lessons.length],['attendance',state.attendance.length],['payments',state.payments.length],['expenses',state.expenses.length]];
    download(`edupulse-summary-${new Date().toISOString().slice(0,10)}.csv`,csv(['Metric','Value'],summary),'text/csv;charset=utf-8');
  });
  document.getElementById('expOverdue')?.addEventListener('click',()=>{
    const overdue=state.payments.filter(p=>Number(p.amountDue||0)>Number(p.amountPaid||0)).map(p=>[p.date,p.student,p.amountDue,p.amountPaid,Number(p.amountDue||0)-Number(p.amountPaid||0)]);
    download(`edupulse-overdue-${new Date().toISOString().slice(0,10)}.csv`,csv(['Date','Student','Due','Paid','Balance'],overdue),'text/csv;charset=utf-8');
  });
  document.getElementById('printBtn')?.addEventListener('click',()=>window.print());

  document.getElementById('backupBtn')?.addEventListener('click',()=>download(`edupulse-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`,JSON.stringify(state,null,2),'application/json'));
  document.getElementById('restoreForm')?.addEventListener('submit',async(e)=>{
    e.preventDefault(); const f=new FormData(e.currentTarget); if(f.get('confirm')!=='on'){toast('Confirm overwrite first');return;}
    const file=f.get('file'); if(!(file instanceof File)){toast('Choose file');return;}
    try{const txt=await file.text(); const parsed=JSON.parse(txt); state={...defaults(),...parsed,settings:{...defaults().settings,...(parsed.settings||{})},session:{ok:true}}; saveState(); renderApp(); toast('Restore complete');}catch{toast('Restore failed');}
  });
  document.getElementById('resetBtn')?.addEventListener('click',()=>{if(!confirm('Delete all data?'))return; state=defaults(); state.session.ok=true; saveState(); renderApp(); toast('Reset done');});

  document.getElementById('settingsForm')?.addEventListener('submit',(e)=>{e.preventDefault();const f=new FormData(e.currentTarget); state.settings.businessName=String(f.get('businessName')||'EduPulse by Ray'); state.settings.currency=String(f.get('currency')||'ZAR').toUpperCase(); state.settings.username=String(f.get('username')||'admin'); state.settings.passcode=String(f.get('passcode')||'1234'); saveState(); renderApp(); toast('Settings saved');});
}

function renderApp(){
  document.getElementById('app').innerHTML = shell(renderRoute());
  bindCommon();
  bindRoute();
}

window.addEventListener('online',()=>toast('Back online'));
window.addEventListener('offline',()=>toast('Offline mode'));

if('serviceWorker' in navigator && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())){
  navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}

boot();
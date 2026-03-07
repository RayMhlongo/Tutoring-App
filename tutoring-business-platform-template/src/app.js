import { applyBranding, getConfig, saveConfig } from './config.js';
import { initStorage, listTable } from './storage.js';
import { getDashboardMetrics } from './reports.js';
import { dashboardTemplate } from '../components/dashboard.js';
import { studentProfileTemplate } from '../components/studentProfile.js';
import { lessonEditorTemplate } from '../components/lessonEditor.js';
import { calendarTemplate } from '../components/calendar.js';
import { settingsTemplate } from '../components/settings.js';
import { setupWizardTemplate } from '../components/setupWizard.js';

const setupRoot=document.getElementById('setupRoot');
const appRoot=document.getElementById('appRoot');
const mainView=document.getElementById('mainView');

async function renderWizard(){
  const cfg=await getConfig();
  setupRoot.innerHTML=setupWizardTemplate(cfg);
  setupRoot.hidden=false;
  appRoot.hidden=true;
  setupRoot.querySelector('#setupWizardForm')?.addEventListener('submit',async (event)=>{
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    await saveConfig({
      business:{
        name:String(form.get('businessName')||'Tutoring Business'),
        colors:{
          primary:String(form.get('primaryColor')||'#0e3a67'),
          secondary:String(form.get('secondaryColor')||'#8ec6eb'),
          accent:String(form.get('accentColor')||'#f4c44a')
        }
      },
      subjects:String(form.get('subjects')||'').split(',').map(v=>v.trim()).filter(Boolean),
      grades:String(form.get('grades')||'').split(',').map(v=>v.trim()).filter(Boolean),
      parentCommunication:{template:String(form.get('parentTemplate')||'')},
      setupCompleted:true
    });
    await startApp();
  });
}

async function renderView(view){
  const cfg=await getConfig();
  if(view==='dashboard'){
    const metrics=await getDashboardMetrics();
    mainView.innerHTML=dashboardTemplate({metrics});
    return;
  }
  if(view==='students'){
    const students=await listTable('students');
    mainView.innerHTML=studentProfileTemplate(cfg,students);
    return;
  }
  if(view==='lessons'){
    mainView.innerHTML=lessonEditorTemplate(cfg);
    return;
  }
  if(view==='calendar'){
    mainView.innerHTML=calendarTemplate();
    return;
  }
  if(view==='settings'){
    mainView.innerHTML=settingsTemplate(cfg);
    return;
  }
}

function bindNav(){
  const buttons=[...document.querySelectorAll('.nav-btn')];
  buttons.forEach(btn=>btn.addEventListener('click',async ()=>{
    buttons.forEach(b=>b.classList.toggle('is-active',b===btn));
    await renderView(btn.dataset.view);
  }));
}

async function startApp(){
  const cfg=await getConfig();
  if(!cfg.setupCompleted){
    await renderWizard();
    return;
  }
  setupRoot.hidden=true;
  appRoot.hidden=false;
  await applyBranding();
  bindNav();
  await renderView('dashboard');
}

async function boot(){
  await initStorage();
  if('serviceWorker' in navigator){
    try{await navigator.serviceWorker.register('./service-worker.js');}catch{}
  }
  await startApp();
}

boot();

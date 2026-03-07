import { getSetting, setSetting } from './storage.js';

const CONFIG_KEY='businessConfig';
let cachedConfig=null;

export async function loadDefaultConfig(){
  const response=await fetch('./config/defaultConfig.json');
  if(!response.ok) throw new Error('Unable to load default config');
  return response.json();
}

function deepMerge(base,extra){
  if(Array.isArray(base)||Array.isArray(extra)) return extra ?? base;
  if(!base||typeof base!=='object') return extra ?? base;
  if(!extra||typeof extra!=='object') return extra ?? base;
  const out={...base};
  Object.keys(extra).forEach(key=>{out[key]=deepMerge(base[key],extra[key]);});
  return out;
}

export async function getConfig(){
  if(cachedConfig) return cachedConfig;
  const defaults=await loadDefaultConfig();
  const stored=await getSetting(CONFIG_KEY,{});
  cachedConfig=deepMerge(defaults,stored||{});
  return cachedConfig;
}

export async function saveConfig(partial){
  const current=await getConfig();
  cachedConfig=deepMerge(current,partial||{});
  await setSetting(CONFIG_KEY,cachedConfig);
  return cachedConfig;
}

export async function applyBranding(){
  const cfg=await getConfig();
  document.documentElement.style.setProperty('--primary',cfg.business?.colors?.primary||'#0e3a67');
  document.documentElement.style.setProperty('--secondary',cfg.business?.colors?.secondary||'#8ec6eb');
  document.documentElement.style.setProperty('--accent',cfg.business?.colors?.accent||'#f4c44a');
  const brand=document.getElementById('brandName');
  const logo=document.getElementById('brandLogo');
  if(brand) brand.textContent=cfg.business?.name||'Tutoring Business';
  if(logo && cfg.business?.logoPath) logo.src=cfg.business.logoPath;
  return cfg;
}

export function settingsTemplate(config){
  return `<section class="card"><h2>Settings</h2><p>Template mode: ${config.templateMode?'Enabled':'Disabled'}</p></section>`;
}

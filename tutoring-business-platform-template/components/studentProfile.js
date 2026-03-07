export function studentProfileTemplate(config,students){
  return `<section class="card"><h2>Students</h2><p>Dynamic fields are driven by configuration.</p><div>${students.length} students loaded.</div></section>`;
}

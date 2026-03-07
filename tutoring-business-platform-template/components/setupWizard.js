export function setupWizardTemplate(config){
  return `
  <section class="card">
    <h2>Setup Wizard</h2>
    <p>Configure your tutoring business before first use.</p>
    <form id="setupWizardForm" class="grid">
      <label class="field"><span>Business Name</span><input class="input" name="businessName" value="${config.business?.name||''}" required></label>
      <label class="field"><span>Primary Color</span><input class="input" name="primaryColor" value="${config.business?.colors?.primary||'#0e3a67'}" required></label>
      <label class="field"><span>Secondary Color</span><input class="input" name="secondaryColor" value="${config.business?.colors?.secondary||'#8ec6eb'}" required></label>
      <label class="field"><span>Accent Color</span><input class="input" name="accentColor" value="${config.business?.colors?.accent||'#f4c44a'}" required></label>
      <label class="field"><span>Subjects (comma-separated)</span><input class="input" name="subjects" value="${(config.subjects||[]).join(', ')}"></label>
      <label class="field"><span>Grades (comma-separated)</span><input class="input" name="grades" value="${(config.grades||[]).join(', ')}"></label>
      <label class="field"><span>Parent Message Template</span><textarea class="textarea" name="parentTemplate">${config.parentCommunication?.template||''}</textarea></label>
      <button class="btn" type="submit">Finish Setup</button>
    </form>
  </section>`;
}

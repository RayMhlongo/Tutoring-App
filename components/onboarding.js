import { escapeHtml } from "../src/view-utils.js";

export function onboardingModalTemplate(defaultEmail = "") {
  return `
    <section class="modal">
      <div class="card-title-row">
        <h2>Welcome to EduPulse by Ray</h2>
      </div>
      <p class="help-text">Set up your tutoring centre tenant to start using the platform.</p>
      <form id="tenantOnboardingForm" class="grid">
        <label class="field">
          <span>Tutoring Centre Name</span>
          <input class="input" name="tenantName" type="text" placeholder="Raytown Tutors" required>
        </label>
        <label class="field">
          <span>Admin Email</span>
          <input class="input" name="adminEmail" type="email" value="${escapeHtml(defaultEmail)}" required>
        </label>
        <label class="field">
          <span>Subscription Plan</span>
          <select class="select" name="plan">
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
          </select>
        </label>
        <div class="action-row">
          <button class="btn btn-primary" type="submit">Create Tenant</button>
          <button class="btn btn-outline" data-modal-close type="button">Later</button>
        </div>
      </form>
    </section>
  `;
}

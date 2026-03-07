import { escapeHtml, renderMaybe } from "../src/view-utils.js";

function renderListEditorRow(item, collection, label) {
  return `
    <div class="list-item">
      <div class="list-item-main">
        <div class="list-item-title">${escapeHtml(item)}</div>
        <div class="list-item-sub">${escapeHtml(label)}</div>
      </div>
      <button class="btn btn-outline btn-small" data-action="remove-${collection}" data-value="${escapeHtml(item)}" type="button">Remove</button>
    </div>
  `;
}

function renderCustomField(field) {
  return `
    <div class="list-item">
      <div class="list-item-main">
        <div class="list-item-title">${escapeHtml(field.label)}</div>
        <div class="list-item-sub">Key: ${escapeHtml(field.key)} | ${escapeHtml(field.type)}</div>
      </div>
      <button class="btn btn-outline btn-small" data-action="remove-custom-field" data-value="${escapeHtml(field.key)}" type="button">Remove</button>
    </div>
  `;
}

function renderProfile(profile, activeProfileId) {
  const active = profile.id === activeProfileId;
  return `
    <div class="list-item">
      <div class="list-item-main">
        <div class="list-item-title">${escapeHtml(profile.label || profile.gmail || profile.id)}</div>
        <div class="list-item-sub">${escapeHtml(profile.gmail || "No Gmail set")} | ${escapeHtml(profile.endpoint || "No endpoint")}</div>
      </div>
      <div class="action-row">
        <button class="btn ${active ? "btn-secondary" : "btn-outline"} btn-small" data-action="activate-profile" data-profile-id="${escapeHtml(profile.id)}" type="button">${active ? "Active" : "Use"}</button>
        ${profile.id !== "local-profile" ? `<button class="btn btn-outline btn-small" data-action="delete-profile" data-profile-id="${escapeHtml(profile.id)}" type="button">Delete</button>` : ""}
      </div>
    </div>
  `;
}

function renderDynamicField(item, collection) {
  return `
    <div class="list-item">
      <div class="list-item-main">
        <div class="list-item-title">${escapeHtml(item.label || item.key)}</div>
        <div class="list-item-sub">Key: ${escapeHtml(item.key)} | ${escapeHtml(item.type || "text")}</div>
      </div>
      <button class="btn btn-outline btn-small" data-action="remove-${collection}" data-value="${escapeHtml(item.key)}" type="button">Remove</button>
    </div>
  `;
}

export function settingsTemplate(data) {
  const settings = data.settings;
  const auth = settings.auth || {};
  const profiles = settings.syncProfiles || [];
  return `
    <section class="view" data-view-root="settings">
      <article class="card">
        <div class="card-title-row">
          <h2>Global Configuration</h2>
        </div>
        <form id="platformSettingsForm" class="split-3">
          <div class="field">
            <label for="businessName">Business Name</label>
            <input id="businessName" class="input" name="businessName" type="text" value="${escapeHtml(settings.businessName || "X-Factor Tutoring")}" required>
          </div>
          <div class="field">
            <label for="defaultLessonDuration">Default lesson duration (minutes)</label>
            <input id="defaultLessonDuration" class="input" name="defaultLessonDuration" type="number" min="15" step="5" value="${escapeHtml(String(settings.defaultLessonDuration || 60))}">
          </div>
          <div class="field">
            <label for="qrFormat">QR Format</label>
            <input id="qrFormat" class="input" name="qrFormat" type="text" value="${escapeHtml(settings.qrFormat || "XFACTOR:{id}")}">
          </div>
          <button class="btn btn-primary" type="submit">Save Platform Settings</button>
        </form>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Authentication</h3>
        </div>
        <form id="authSettingsForm" class="split-3">
          <label class="field">
            <span>Enable Local Login</span>
            <select class="select" name="localEnabled">
              <option value="true" ${auth.localEnabled !== false ? "selected" : ""}>Enabled</option>
              <option value="false" ${auth.localEnabled === false ? "selected" : ""}>Disabled</option>
            </select>
          </label>
          <label class="field">
            <span>Enable Google Login</span>
            <select class="select" name="googleEnabled">
              <option value="false" ${auth.googleEnabled ? "" : "selected"}>Disabled</option>
              <option value="true" ${auth.googleEnabled ? "selected" : ""}>Enabled</option>
            </select>
          </label>
          <label class="field">
            <span>Session TTL (hours)</span>
            <input class="input" name="sessionTtlHours" type="number" min="12" max="1440" value="${escapeHtml(String(auth.sessionTtlHours || 336))}">
          </label>
          <label class="field">
            <span>Google OAuth Client ID</span>
            <input class="input" name="googleClientId" type="text" value="${escapeHtml(auth.googleClientId || "")}" placeholder="123456.apps.googleusercontent.com">
          </label>
          <label class="field">
            <span>Allowed Google Email</span>
            <input class="input" name="allowedGoogleEmail" type="email" value="${escapeHtml(auth.allowedGoogleEmail || "")}" placeholder="owner@gmail.com">
          </label>
          <button class="btn btn-primary" type="submit">Save Auth Settings</button>
        </form>
        <form id="localAdminPasswordForm" class="split-3">
          <label class="field">
            <span>Local Admin Username</span>
            <input class="input" name="username" type="text" value="${escapeHtml(auth.localAdminUsername || "admin")}" required>
          </label>
          <label class="field">
            <span>New Local Password</span>
            <input class="input" name="password" type="password" minlength="6" required>
          </label>
          <label class="field">
            <span>Confirm Password</span>
            <input class="input" name="confirmPassword" type="password" minlength="6" required>
          </label>
          <button class="btn btn-outline" type="submit">Update Local Password</button>
        </form>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Google Sync Accounts</h3>
        </div>
        <p class="help-text">Add multiple Gmail-linked Google Apps Script endpoints and switch between them quickly.</p>
        <form id="syncProfileForm" class="grid">
          <div class="split-3">
            <div class="field">
              <label for="profileLabel">Profile Label</label>
              <input id="profileLabel" name="label" class="input" type="text" placeholder="Tutor Main Account">
            </div>
            <div class="field">
              <label for="profileGmail">Gmail Account</label>
              <input id="profileGmail" name="gmail" class="input" type="email" placeholder="owner@gmail.com">
            </div>
            <div class="field">
              <label for="profileEndpoint">Google Apps Script Endpoint</label>
              <input id="profileEndpoint" name="endpoint" class="input" type="url" placeholder="https://script.google.com/...">
            </div>
          </div>
          <div class="action-row">
            <button class="btn btn-primary" type="submit">Save Profile</button>
            <button class="btn btn-outline" type="button" id="testEndpointBtn">Test Endpoint</button>
            <button class="btn btn-secondary" type="button" id="pullRemoteBtn">Pull from Google Sheet</button>
          </div>
        </form>
        <div class="field">
          <label for="activeProfileSelect">Active profile</label>
          <select id="activeProfileSelect" name="activeProfileId" class="select">
            ${profiles.map((profile) => `<option value="${escapeHtml(profile.id)}" ${settings.activeProfileId === profile.id ? "selected" : ""}>${escapeHtml(profile.label || profile.gmail || profile.id)}</option>`).join("")}
          </select>
        </div>
        <div class="list">
          ${profiles.map((profile) => renderProfile(profile, settings.activeProfileId)).join("")}
        </div>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Student Profile Fields</h3>
        </div>
        <form id="customFieldForm" class="split-3">
          <div class="field">
            <label for="customFieldLabel">Field Label</label>
            <input id="customFieldLabel" class="input" name="label" type="text" required>
          </div>
          <div class="field">
            <label for="customFieldKey">Field Key</label>
            <input id="customFieldKey" class="input" name="key" type="text" placeholder="parentContact" required>
          </div>
          <div class="field">
            <label for="customFieldType">Field Type</label>
            <select id="customFieldType" class="select" name="type">
              <option value="text">Text</option>
              <option value="textarea">Long Text</option>
            </select>
          </div>
          <button class="btn btn-primary" type="submit">Add Field</button>
        </form>
        <div class="list">
          ${renderMaybe(settings.customStudentFields.length > 0, settings.customStudentFields.map(renderCustomField).join(""), `<div class="empty-state">No custom fields configured.</div>`)}
        </div>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Lessons, Schedule, Payments</h3>
        </div>
        <div class="split-2">
          <div class="grid">
            <form id="lessonCategoryForm" class="action-row">
              <input class="input" name="lessonCategory" type="text" placeholder="Add lesson category">
              <button class="btn btn-primary" type="submit">Add</button>
            </form>
            <div class="list">
              ${(settings.lessonCategories || []).map((value) => renderListEditorRow(value, "lesson-category", "Lesson category")).join("")}
            </div>
          </div>
          <div class="grid">
            <form id="paymentTypeForm" class="action-row">
              <input class="input" name="paymentType" type="text" placeholder="Add payment type">
              <button class="btn btn-primary" type="submit">Add</button>
            </form>
            <div class="list">
              ${(settings.paymentTypes || []).map((value) => renderListEditorRow(value, "payment-type", "Payment method")).join("")}
            </div>
          </div>
        </div>
        <form id="scheduleFieldForm" class="split-3">
          <div class="field">
            <label for="scheduleFieldLabel">Schedule Field Label</label>
            <input id="scheduleFieldLabel" class="input" name="label" type="text" required>
          </div>
          <div class="field">
            <label for="scheduleFieldKey">Schedule Field Key</label>
            <input id="scheduleFieldKey" class="input" name="key" type="text" placeholder="room" required>
          </div>
          <div class="field">
            <label for="scheduleFieldType">Field Type</label>
            <select id="scheduleFieldType" class="select" name="type">
              <option value="text">Text</option>
              <option value="textarea">Long Text</option>
            </select>
          </div>
          <button class="btn btn-primary" type="submit">Add Schedule Field</button>
        </form>
        <div class="list">
          ${renderMaybe((settings.scheduleCustomFields || []).length > 0, (settings.scheduleCustomFields || []).map((item) => renderDynamicField(item, "schedule-field")).join(""), `<div class="empty-state">No schedule custom fields configured.</div>`)}
        </div>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Subjects and Grades</h3>
        </div>
        <div class="split-2">
          <div class="grid">
            <form id="subjectForm" class="action-row">
              <input class="input" name="subject" type="text" placeholder="Add subject">
              <button class="btn btn-primary" type="submit">Add</button>
            </form>
            <div class="list">
              ${settings.subjects.map((subject) => renderListEditorRow(subject, "subject", "Subject")).join("")}
            </div>
          </div>
          <div class="grid">
            <form id="gradeForm" class="action-row">
              <input class="input" name="grade" type="text" placeholder="Add grade">
              <button class="btn btn-primary" type="submit">Add</button>
            </form>
            <div class="list">
              ${settings.grades.map((grade) => renderListEditorRow(grade, "grade", "Grade")).join("")}
            </div>
          </div>
        </div>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Dashboard and Backup</h3>
        </div>
        <form id="dashboardFilterForm" class="split-3">
          <label class="field">
            <span>Default Student Filter</span>
            <input class="input" name="studentId" value="${escapeHtml(settings.dashboardFilters?.studentId || "")}">
          </label>
          <label class="field">
            <span>Default Subject Filter</span>
            <input class="input" name="subject" value="${escapeHtml(settings.dashboardFilters?.subject || "")}">
          </label>
          <label class="field">
            <span>Default Grade Filter</span>
            <input class="input" name="grade" value="${escapeHtml(settings.dashboardFilters?.grade || "")}">
          </label>
          <label class="field">
            <span>From Date</span>
            <input class="input" type="date" name="fromDate" value="${escapeHtml(settings.dashboardFilters?.fromDate || "")}">
          </label>
          <label class="field">
            <span>To Date</span>
            <input class="input" type="date" name="toDate" value="${escapeHtml(settings.dashboardFilters?.toDate || "")}">
          </label>
          <button class="btn btn-primary" type="submit">Save Dashboard Filters</button>
        </form>
        <form id="backupSettingsForm" class="split-3">
          <label class="field">
            <span>Encrypt backups</span>
            <select class="select" name="encryptBackups">
              <option value="true" ${(settings.backup?.encryptBackups ?? true) ? "selected" : ""}>Yes</option>
              <option value="false" ${(settings.backup?.encryptBackups ?? true) ? "" : "selected"}>No</option>
            </select>
          </label>
          <label class="field">
            <span>Include reports</span>
            <select class="select" name="includeReports">
              <option value="true" ${(settings.backup?.includeReports ?? true) ? "selected" : ""}>Yes</option>
              <option value="false" ${(settings.backup?.includeReports ?? true) ? "" : "selected"}>No</option>
            </select>
          </label>
          <label class="field">
            <span>Passphrase Hint</span>
            <input class="input" name="backupPassphraseHint" value="${escapeHtml(settings.backup?.backupPassphraseHint || "")}">
          </label>
          <button class="btn btn-primary" type="submit">Save Backup Settings</button>
          <button class="btn btn-outline" id="backupJsonBtn" type="button">Backup JSON</button>
          <button class="btn btn-outline" id="backupCsvBtn" type="button">Backup CSV</button>
          <button class="btn btn-secondary" id="backupDriveBtn" type="button">Backup to Google Drive</button>
          <button class="btn btn-outline" id="restoreLocalBtn" type="button">Restore from File</button>
          <button class="btn btn-outline" id="restoreDriveBtn" type="button">Restore from Drive</button>
        </form>
        <div class="action-row">
          <button class="btn btn-secondary" id="exportGoogleBtn" type="button">Export All to Google Sheet</button>
        </div>
      </article>
    </section>
  `;
}

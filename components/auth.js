import { escapeHtml } from "../src/view-utils.js";

export function authGateTemplate(payload) {
  const {
    businessName,
    auth,
    localCredentialsReady,
    online
  } = payload;

  const googleAvailable = Boolean(auth.googleEnabled && auth.googleClientId);
  const allowedEmail = auth.allowedGoogleEmail || "Not configured";
  const localEnabled = auth.localEnabled !== false;

  return `
    <section class="auth-gate">
      <article class="auth-card">
        <div class="brand auth-brand">
          <img src="./assets/logo/xfactor-logo.svg" alt="X-Factor logo" class="brand-logo">
          <div>
            <h1>${escapeHtml(businessName || "X-Factor Tutoring")}</h1>
            <p class="subtle-text">Secure Tutor Access</p>
          </div>
        </div>

        ${localEnabled ? (!localCredentialsReady ? `
          <h2>Create Local Admin Account</h2>
          <p class="help-text">Set a local admin password for offline-first sign-in.</p>
          <form id="localSetupForm" class="grid">
            <div class="field">
              <label for="setupUsername">Admin Username</label>
              <input id="setupUsername" class="input" name="username" value="${escapeHtml(auth.localAdminUsername || "admin")}" required>
            </div>
            <div class="field">
              <label for="setupPassword">Password</label>
              <input id="setupPassword" class="input" name="password" type="password" minlength="6" required>
            </div>
            <div class="field">
              <label for="setupConfirmPassword">Confirm Password</label>
              <input id="setupConfirmPassword" class="input" name="confirmPassword" type="password" minlength="6" required>
            </div>
            <button class="btn btn-primary" type="submit">Create Admin Login</button>
          </form>
        ` : `
          <h2>Local Admin Login</h2>
          <form id="localLoginForm" class="grid">
            <div class="field">
              <label for="localUsername">Username</label>
              <input id="localUsername" class="input" name="username" value="${escapeHtml(auth.localAdminUsername || "admin")}" required>
            </div>
            <div class="field">
              <label for="localPassword">Password</label>
              <input id="localPassword" class="input" name="password" type="password" required>
            </div>
            <button class="btn btn-primary" type="submit">Login</button>
          </form>
        `) : `<p class="help-text">Local login is disabled for this app.</p>`}

        <hr class="hr">
        <h3>Google Login (Optional)</h3>
        <p class="help-text">Allowed email: ${escapeHtml(allowedEmail)}</p>
        ${googleAvailable ? `
          <div id="googleSignInButton" class="google-signin-wrap"></div>
          <p class="help-text">${online ? "Use your configured Google account to sign in." : "Offline: cached session required for Google mode."}</p>
        ` : `
          <p class="help-text">Enable Google login in Settings by adding a client ID and allowed email.</p>
        `}
      </article>
    </section>
  `;
}

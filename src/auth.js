import { DEFAULT_SETTINGS } from "./config.js";
import { getAppSettings, getSetting, patchAppSettings, setSetting } from "./storage.js";
import { isoNow, sanitizeEmail, sanitizeText, uid } from "./utils.js";

const AUTH_SESSION_KEY = "authSession";

function toBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
  return atob(padded);
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function ensureAuthSettingsDefaults() {
  const settings = await getAppSettings();
  if (!settings.auth) {
    await patchAppSettings({ auth: DEFAULT_SETTINGS.auth });
    return DEFAULT_SETTINGS.auth;
  }
  return settings.auth;
}

export function parseGoogleIdToken(token) {
  try {
    const [, payloadSegment] = String(token || "").split(".");
    if (!payloadSegment) return null;
    const payloadText = fromBase64Url(payloadSegment);
    return JSON.parse(payloadText);
  } catch {
    return null;
  }
}

export async function setLocalAdminCredentials(username, password) {
  const cleanUsername = sanitizeText(username || "admin", 80) || "admin";
  const cleanPassword = sanitizeText(password, 200);
  if (cleanPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = toBase64(saltBytes);
  const passwordHash = await sha256Hex(`${salt}:${cleanPassword}`);
  await patchAppSettings({
    auth: {
      localEnabled: true,
      localAdminUsername: cleanUsername,
      localSalt: salt,
      localPasswordHash: passwordHash
    }
  });
}

export async function hasLocalAdminCredentials() {
  const settings = await getAppSettings();
  return Boolean(settings.auth?.localPasswordHash && settings.auth?.localSalt);
}

export async function authenticateLocal(username, password) {
  const settings = await getAppSettings();
  const auth = settings.auth || DEFAULT_SETTINGS.auth;
  if (!auth.localEnabled) {
    throw new Error("Local login is disabled.");
  }
  if (!auth.localPasswordHash || !auth.localSalt) {
    throw new Error("Local admin credentials have not been set.");
  }
  const expectedUsername = sanitizeText(auth.localAdminUsername || "admin", 80).toLowerCase();
  const user = sanitizeText(username, 80).toLowerCase();
  if (user !== expectedUsername) {
    throw new Error("Invalid credentials.");
  }
  const incomingHash = await sha256Hex(`${auth.localSalt}:${sanitizeText(password, 200)}`);
  if (incomingHash !== auth.localPasswordHash) {
    throw new Error("Invalid credentials.");
  }
  return createSession({
    mode: "local",
    email: "",
    displayName: expectedUsername
  });
}

export async function authenticateGoogleCredential(credential) {
  const settings = await getAppSettings();
  const auth = settings.auth || DEFAULT_SETTINGS.auth;
  if (!auth.googleEnabled) {
    throw new Error("Google login is disabled.");
  }
  const parsed = parseGoogleIdToken(credential);
  if (!parsed) {
    throw new Error("Google credential could not be decoded.");
  }

  const email = sanitizeEmail(parsed.email || "");
  if (!email) {
    throw new Error("Google account email is missing.");
  }
  if (!parsed.email_verified) {
    throw new Error("Google email is not verified.");
  }

  const allowedEmail = sanitizeEmail(auth.allowedGoogleEmail || "");
  if (allowedEmail && email !== allowedEmail) {
    throw new Error(`Access denied for ${email}.`);
  }

  return createSession({
    mode: "google",
    email,
    displayName: sanitizeText(parsed.name || email, 120),
    googleSub: sanitizeText(parsed.sub || "", 120)
  });
}

export async function createSession(sessionData) {
  const settings = await getAppSettings();
  const ttlHours = Number(settings.auth?.sessionTtlHours || 336);
  const now = Date.now();
  const expiresAt = new Date(now + ttlHours * 60 * 60 * 1000).toISOString();
  const session = {
    id: uid("sess"),
    mode: sessionData.mode,
    email: sanitizeEmail(sessionData.email || ""),
    displayName: sanitizeText(sessionData.displayName || "", 120),
    googleSub: sanitizeText(sessionData.googleSub || "", 120),
    offlineAllowed: true,
    createdAt: isoNow(),
    expiresAt
  };
  await setSetting(AUTH_SESSION_KEY, session);
  return session;
}

export async function getSession() {
  return getSetting(AUTH_SESSION_KEY, null);
}

export function isSessionValid(session) {
  if (!session) return false;
  if (!session.mode) return false;
  if (!session.expiresAt) return false;
  const expires = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expires)) return false;
  return expires > Date.now();
}

export async function getAuthState() {
  await ensureAuthSettingsDefaults();
  const [settings, session] = await Promise.all([getAppSettings(), getSession()]);
  const auth = settings.auth || DEFAULT_SETTINGS.auth;
  const authenticated = isSessionValid(session);
  const localCredentialsReady = Boolean(auth.localPasswordHash && auth.localSalt);
  return {
    authenticated,
    session: authenticated ? session : null,
    localCredentialsReady,
    auth
  };
}

export async function requireValidSession() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null;
  }
  return session;
}

export async function logout() {
  await setSetting(AUTH_SESSION_KEY, null);
}

export async function updateAuthSettings(partialAuth) {
  const settings = await getAppSettings();
  const nextAuth = {
    ...(settings.auth || DEFAULT_SETTINGS.auth),
    ...partialAuth
  };
  if (partialAuth.allowedGoogleEmail !== undefined) {
    nextAuth.allowedGoogleEmail = sanitizeEmail(partialAuth.allowedGoogleEmail);
  }
  if (partialAuth.googleClientId !== undefined) {
    nextAuth.googleClientId = sanitizeText(partialAuth.googleClientId, 320);
  }
  if (partialAuth.localAdminUsername !== undefined) {
    nextAuth.localAdminUsername = sanitizeText(partialAuth.localAdminUsername, 80) || "admin";
  }
  await patchAppSettings({ auth: nextAuth });
  return nextAuth;
}

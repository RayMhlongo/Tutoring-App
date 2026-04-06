import { getSession, getSettings, patchSettings, setSession } from "../../data/db/client.js";
import { hashPasscode, secureEquals } from "../../utils/crypto.js";
import { sanitizeText } from "../../utils/common.js";

export async function ensureAuthDefaults() {
  const settings = await getSettings();
  if (!settings.auth.passcodeHash) {
    const hashed = await hashPasscode("1234");
    await patchSettings({ auth: { ...settings.auth, passcodeHash: hashed.hash, passcodeSalt: hashed.salt } });
  }
}

export async function isAuthenticated() {
  const session = await getSession();
  if (!session.authenticated) return false;
  const settings = await getSettings();
  const hours = Number(settings.auth?.sessionHours || 168);
  const last = new Date(session.authenticatedAt || 0).getTime();
  const expiry = last + hours * 3600 * 1000;
  if (Date.now() > expiry) {
    await setSession({ authenticated: false });
    return false;
  }
  return true;
}

export async function login(username, passcode, remember = true) {
  const settings = await getSettings();
  const auth = settings.auth || {};
  if (!auth.enabled) return true;

  const safeUser = sanitizeText(username, 60);
  if (safeUser !== sanitizeText(auth.username, 60)) throw new Error("Invalid username.");
  const hash = await hashPasscode(passcode, Uint8Array.from(atob(auth.passcodeSalt), (c) => c.charCodeAt(0)));
  if (!secureEquals(hash.hash, auth.passcodeHash)) throw new Error("Invalid passcode.");

  await setSession({
    authenticated: true,
    remember,
    user: safeUser,
    authenticatedAt: new Date().toISOString()
  });
  return true;
}

export async function logout() {
  await setSession({ authenticated: false });
}

export async function updatePasscode(currentPasscode, nextPasscode) {
  const settings = await getSettings();
  const auth = settings.auth || {};
  const currentHash = await hashPasscode(currentPasscode, Uint8Array.from(atob(auth.passcodeSalt), (c) => c.charCodeAt(0)));
  if (!secureEquals(currentHash.hash, auth.passcodeHash)) throw new Error("Current passcode is incorrect.");
  const nextHash = await hashPasscode(nextPasscode);
  await patchSettings({ auth: { passcodeHash: nextHash.hash, passcodeSalt: nextHash.salt } });
}
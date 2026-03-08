import { getRuntimeEnv } from "./env.js";
import { getSetting, setSetting } from "./storage.js";
import { sanitizeText } from "./utils.js";

const GOOGLE_TOKEN_KEY = "googleOAuthToken";
export const GOOGLE_SCOPE_DRIVE_SHEETS = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets";

function resolveClientId(authSettings = {}) {
  return sanitizeText(authSettings.googleClientId || getRuntimeEnv().googleClientId || "", 400);
}

function tokenStillValid(token) {
  if (!token?.access_token || !token?.expires_at) return false;
  const expiresAt = Number(token.expires_at || 0);
  return Number.isFinite(expiresAt) && expiresAt > (Date.now() + 30_000);
}

export async function getStoredGoogleToken() {
  const token = await getSetting(GOOGLE_TOKEN_KEY, null);
  return tokenStillValid(token) ? token : null;
}

export async function clearStoredGoogleToken() {
  await setSetting(GOOGLE_TOKEN_KEY, null);
}

export async function connectGoogleWorkspace(authSettings = {}, options = {}) {
  const clientId = resolveClientId(authSettings);
  if (!clientId) {
    throw new Error("Google client ID is missing. Set VITE_GOOGLE_CLIENT_ID or auth.googleClientId.");
  }
  if (!window.google?.accounts?.oauth2?.initTokenClient) {
    throw new Error("Google OAuth library is unavailable.");
  }

  const scope = sanitizeText(options.scope || GOOGLE_SCOPE_DRIVE_SHEETS, 1000) || GOOGLE_SCOPE_DRIVE_SHEETS;
  const prompt = sanitizeText(options.prompt || "consent", 40) || "consent";

  const response = await new Promise((resolve, reject) => {
    let settled = false;
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (tokenResponse) => {
        if (settled) return;
        settled = true;
        if (tokenResponse?.error) {
          reject(new Error(tokenResponse.error_description || tokenResponse.error || "Google OAuth request failed."));
          return;
        }
        resolve(tokenResponse);
      }
    });

    try {
      tokenClient.requestAccessToken({ prompt });
    } catch (error) {
      if (settled) return;
      settled = true;
      reject(error);
    }
  });

  const expiresIn = Number(response.expires_in || 0);
  const token = {
    access_token: sanitizeText(response.access_token || "", 2000),
    scope: sanitizeText(response.scope || scope, 2000),
    token_type: sanitizeText(response.token_type || "Bearer", 40),
    expires_at: Date.now() + Math.max(60, expiresIn) * 1000
  };

  if (!token.access_token) {
    throw new Error("Google OAuth did not return an access token.");
  }

  await setSetting(GOOGLE_TOKEN_KEY, token);
  return token;
}

export async function getGoogleAccessToken(authSettings = {}) {
  const existing = await getStoredGoogleToken();
  if (existing) return existing.access_token;
  const token = await connectGoogleWorkspace(authSettings, { prompt: "consent" });
  return token.access_token;
}

import { sanitizeText } from "./utils.js";

function fromWindowEnv(key) {
  const source = window.__APP_ENV__ || {};
  return source[key] ?? source[key.replace(/^VITE_/, "")] ?? "";
}

function fromImportMetaEnv(key) {
  try {
    const source = import.meta?.env || {};
    return source[key] ?? "";
  } catch {
    return "";
  }
}

export function getEnvVar(key, fallback = "") {
  const value = sanitizeText(fromImportMetaEnv(key) || fromWindowEnv(key) || "", 4000);
  return value || sanitizeText(fallback, 4000);
}

export function getRuntimeEnv() {
  return {
    googleClientId: getEnvVar("VITE_GOOGLE_CLIENT_ID", ""),
    geminiApiKey: getEnvVar("VITE_GEMINI_API_KEY", ""),
    stripePublishableKey: getEnvVar("VITE_STRIPE_PUBLISHABLE_KEY", ""),
    stripeCheckoutEndpoint: getEnvVar("VITE_STRIPE_CHECKOUT_ENDPOINT", "")
  };
}

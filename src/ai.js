import { TABLES } from "./config.js";
import { getRuntimeEnv } from "./env.js";
import { getActiveProfile, getAppSettings, listRecords, saveRecord } from "./storage.js";
import { sanitizeText, uid } from "./utils.js";

let GoogleGenAIClass = null;
let geminiClientFactory = null;

export function __setGeminiClientFactoryForTests(factory) {
  geminiClientFactory = typeof factory === "function" ? factory : null;
}

async function resolveGoogleGenAI() {
  if (GoogleGenAIClass) return GoogleGenAIClass;
  try {
    const sdk = await import("@google/genai");
    GoogleGenAIClass = sdk.GoogleGenAI;
    return GoogleGenAIClass;
  } catch {
    const sdk = await import("https://esm.sh/@google/genai");
    GoogleGenAIClass = sdk.GoogleGenAI;
    return GoogleGenAIClass;
  }
}

function ensurePrompt(prompt) {
  const value = sanitizeText(prompt, 4000);
  if (!value) {
    throw new Error("Please enter a message before sending.");
  }
  return value;
}

function isAiEnabled(settings) {
  const ai = settings?.ai || {};
  return ai.enabled === true;
}

function extractGeminiText(payload) {
  const direct = sanitizeText(payload?.text || "", 16000);
  if (direct) return direct;
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    const textPart = parts.find((part) => typeof part?.text === "string" && part.text.trim());
    if (textPart?.text) {
      return sanitizeText(textPart.text, 16000);
    }
  }
  return "";
}

export async function listAiMessages(accountId, userId = "admin", limit = 80) {
  const rows = await listRecords(TABLES.messages, accountId, { direction: "asc" });
  return rows
    .filter((row) => row.channel === "ai")
    .filter((row) => !userId || row.userId === userId)
    .slice(-Math.max(1, Number(limit || 80)));
}

export async function askGemini({ accountId, userId = "admin", prompt }) {
  const message = ensurePrompt(prompt);
  const [settings, profile] = await Promise.all([getAppSettings(), getActiveProfile()]);
  const ai = settings.ai || {};
  if (!isAiEnabled(settings)) {
    throw new Error("AI assistant is disabled. Enable it in Settings > APP Developer.");
  }
  const runtimeEnv = getRuntimeEnv();
  const apiKey = sanitizeText(ai.apiKey || runtimeEnv.geminiApiKey || "", 500);
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Set VITE_GEMINI_API_KEY or settings.ai.apiKey.");
  }
  if (!navigator.onLine) {
    throw new Error("AI assistant requires an internet connection.");
  }

  let GoogleGenAI = null;
  if (!geminiClientFactory) {
    GoogleGenAI = await resolveGoogleGenAI();
    if (!GoogleGenAI) {
      throw new Error("Gemini SDK could not be loaded.");
    }
  }

  const safeModel = sanitizeText(ai.model || "gemini-2.0-flash", 120);
  const systemPrompt = sanitizeText(ai.systemPrompt || "You are an operations assistant.", 2400);
  const tenantId = sanitizeText(profile?.tenantId || accountId || "", 120);
  const history = await listAiMessages(accountId, userId, 16);

  const userMessage = await saveRecord(TABLES.messages, {
    id: uid("msg"),
    channel: "ai",
    role: "user",
    userId: sanitizeText(userId, 120) || "admin",
    tenantId,
    content: message
  }, { accountId, queue: false, op: "upsert" });

  const contextPrefix = `Tenant: ${tenantId} | Account: ${accountId}`;
  const contents = history
    .concat(userMessage)
    .slice(-16)
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: sanitizeText(item.content || "", 4000) }]
    }));

  const client = geminiClientFactory
    ? geminiClientFactory({ apiKey, model: safeModel })
    : new GoogleGenAI({ apiKey });
  const payload = await client.models.generateContent({
    model: safeModel,
    contents,
    config: {
      systemInstruction: `${systemPrompt}\n${contextPrefix}`
    }
  });

  const answer = extractGeminiText(payload);
  if (!answer) {
    throw new Error("Gemini returned an empty response.");
  }

  const assistantMessage = await saveRecord(TABLES.messages, {
    id: uid("msg"),
    channel: "ai",
    role: "assistant",
    userId: sanitizeText(userId, 120) || "admin",
    tenantId,
    content: answer
  }, { accountId, queue: false, op: "upsert" });

  return {
    answer,
    message: assistantMessage,
    raw: payload
  };
}

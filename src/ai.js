import { TABLES } from "./config.js";
import { getActiveProfile, getAppSettings, listRecords, saveRecord } from "./storage.js";
import { sanitizeText, uid } from "./utils.js";

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
  const apiKey = sanitizeText(ai.apiKey || "", 500);
  if (!apiKey) {
    throw new Error("Gemini API key is missing in settings.");
  }
  if (!navigator.onLine) {
    throw new Error("AI assistant requires an internet connection.");
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

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(safeModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: `${systemPrompt}\n${contextPrefix}` }]
      },
      contents
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini request failed (${response.status}): ${errorText || "Unknown error"}`);
  }

  const payload = await response.json();
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

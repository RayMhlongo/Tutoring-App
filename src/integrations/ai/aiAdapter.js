import { sanitizeText } from "../../utils/common.js";

export async function summarizeWithAi({ endpoint, apiKey, model, prompt, context }) {
  const safeEndpoint = sanitizeText(endpoint, 500);
  const safeKey = sanitizeText(apiKey, 1000);
  if (!safeEndpoint || !safeKey) {
    throw new Error("AI endpoint or API key missing.");
  }

  const response = await fetch(safeEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${safeKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: sanitizeText(model || "gpt-4.1-mini", 100),
      input: [
        {
          role: "system",
          content: "You are EduPulse Insights Assistant. Use only supplied context and keep output concise and practical."
        },
        {
          role: "user",
          content: `${sanitizeText(prompt, 1600)}\n\nContext:\n${JSON.stringify(context).slice(0, 18000)}`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed (${response.status}).`);
  }

  const payload = await response.json();
  const text = payload.output_text
    || payload?.output?.[0]?.content?.[0]?.text
    || payload?.choices?.[0]?.message?.content
    || "";

  const safeText = sanitizeText(text, 8000);
  if (!safeText) throw new Error("AI returned an empty response.");
  return safeText;
}
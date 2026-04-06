import { card, toast, escapeHtml } from "../../ui/components/primitives.js";
import { getRuleInsights, buildAiContext } from "./service.js";
import { getSettings } from "../../data/db/client.js";
import { summarizeWithAi } from "../../integrations/ai/aiAdapter.js";

export async function renderInsights() {
  const data = await getRuleInsights();
  const bullets = data.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
  const kpis = Object.entries(data.kpis).map(([k, v]) => `<span class="pill">${escapeHtml(k)}: ${escapeHtml(String(v))}</span>`).join(" ");
  return `
    ${card("Smart Insights", `<div class="toolbar">${kpis}</div><ul class="plain-list">${bullets}</ul>`)}
    ${card("AI Insights Assistant (Optional)", `
      <p class="muted">Rule-based insights work offline. Enable AI in Settings and provide a key to generate narrative summaries.</p>
      <form id="aiSummaryForm" class="form-grid">
        <label class="field"><span>Prompt</span><textarea class="input" name="prompt" required>Summarize this month for the business owner.</textarea></label>
        <button class="btn" type="submit">Generate AI Summary</button>
      </form>
      <pre id="aiSummaryOutput" class="pre"></pre>
    `)}
  `;
}

export function bindInsights(root) {
  root.querySelector("#aiSummaryForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      const prompt = String(form.get("prompt") || "");
      const settings = await getSettings();
      if (!settings.ai?.enabled) throw new Error("AI is disabled in Settings.");
      const insights = await getRuleInsights();
      const output = await summarizeWithAi({
        endpoint: settings.ai.endpoint,
        apiKey: settings.ai.apiKey,
        model: settings.ai.model,
        prompt,
        context: buildAiContext(insights)
      });
      const pre = root.querySelector("#aiSummaryOutput");
      pre.textContent = output;
      toast("AI summary generated.", "success");
    } catch (error) {
      toast(error.message || "AI summary failed.", "error");
    }
  });
}
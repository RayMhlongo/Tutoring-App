import { escapeHtml, renderMaybe } from "../src/view-utils.js";
import { formatDateTime } from "../src/utils.js";

function messageRow(item) {
  const roleLabel = item.role === "assistant" ? "Assistant" : "You";
  const roleClass = item.role === "assistant" ? "badge-success" : "badge-warning";
  return `
    <div class="list-item">
      <div class="list-item-main">
        <div class="list-item-title">${escapeHtml(roleLabel)}</div>
        <div class="list-item-sub">${escapeHtml(item.content || "")}</div>
      </div>
      <span class="badge ${roleClass}">${escapeHtml(formatDateTime(item.updatedAt || item.createdAt || ""))}</span>
    </div>
  `;
}

export function aiAssistantTemplate(data) {
  const messages = Array.isArray(data.messages) ? data.messages : [];
  const aiEnabled = Boolean(data.aiEnabled);
  const model = data.model || "gemini-2.0-flash";
  const tenantId = data.tenantId || "-";

  return `
    <section class="view" data-view-root="ai">
      <article class="card">
        <div class="card-title-row">
          <h2>AI Assistant</h2>
          <span class="badge ${aiEnabled ? "badge-success" : "badge-warning"}">${aiEnabled ? "Enabled" : "Disabled"}</span>
        </div>
        <p class="help-text">Tenant: ${escapeHtml(tenantId)} | Model: ${escapeHtml(model)}</p>
        <p class="help-text">Use this assistant for lesson planning, parent updates, and performance insights.</p>
        ${aiEnabled ? "" : `<p class="help-text">Enable AI and add a Gemini API key in Settings > APP Developer.</p>`}
        <form id="aiPromptForm" class="grid">
          <div class="field">
            <label for="aiPrompt">Message</label>
            <textarea id="aiPrompt" class="textarea" name="prompt" placeholder="Ask about student progress, lesson ideas, weak topics, or parent communication..." ${aiEnabled ? "" : "disabled"}></textarea>
          </div>
          <div class="action-row">
            <button class="btn btn-primary" id="aiSendBtn" type="submit" ${aiEnabled ? "" : "disabled"}>Send</button>
            <button class="btn btn-outline" id="aiRefreshBtn" type="button">Refresh</button>
          </div>
        </form>
      </article>

      <article class="card">
        <div class="card-title-row">
          <h3>Conversation</h3>
          <span class="badge badge-warning">${messages.length} messages</span>
        </div>
        <div class="list" id="aiConversationList">
          ${renderMaybe(messages.length > 0, messages.map(messageRow).join(""), `<div class="empty-state">No conversation yet.</div>`)}
        </div>
      </article>
    </section>
  `;
}

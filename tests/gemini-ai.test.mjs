import test from "node:test";
import assert from "node:assert/strict";
import { askGemini, listAiMessages, __setGeminiClientFactoryForTests } from "../src/ai.js";
import { patchAppSettings } from "../src/storage.js";
import { resetDatabase } from "./helpers.mjs";

test("Gemini AI assistant stores tenant-scoped conversation history", async () => {
  await resetDatabase();
  await patchAppSettings({
    ai: {
      enabled: true,
      provider: "gemini",
      model: "gemini-2.0-flash",
      apiKey: "test-key",
      systemPrompt: "You are a test analytics assistant."
    }
  });

  __setGeminiClientFactoryForTests(() => ({
    models: {
      async generateContent() {
        return { text: "Attendance is improving week over week." };
      }
    }
  }));

  try {
    if (globalThis.navigator) {
      globalThis.navigator.onLine = true;
    }
    const result = await askGemini({
      accountId: "local-profile",
      userId: "admin",
      prompt: "Analyze tutoring centre attendance trends"
    });

    assert.match(result.answer, /improving/i);
    const history = await listAiMessages("local-profile", "admin", 10);
    assert.equal(history.length, 2);
    assert.equal(history[0].role, "user");
    assert.equal(history[1].role, "assistant");
    assert.ok(history.every((item) => item.tenantId));
  } finally {
    __setGeminiClientFactoryForTests(null);
  }
});

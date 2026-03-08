import test from "node:test";
import assert from "node:assert/strict";
import { authenticateGoogleCredential, updateAuthSettings } from "../src/auth.js";
import { getAppSettings } from "../src/storage.js";
import { resetDatabase } from "./helpers.mjs";

function createFakeIdToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

test("google auth accepts allowed email and creates session profile", async () => {
  await resetDatabase();
  await updateAuthSettings({
    googleEnabled: true,
    allowedGoogleEmail: "owner@test.com"
  });

  const token = createFakeIdToken({
    email: "owner@test.com",
    email_verified: true,
    name: "Owner User",
    sub: "google-sub-123"
  });

  const session = await authenticateGoogleCredential(token);
  assert.equal(session.mode, "google");
  assert.equal(session.email, "owner@test.com");

  const settings = await getAppSettings();
  const profile = settings.syncProfiles.find((item) => item.id === settings.activeProfileId);
  assert.ok(profile);
  assert.equal(profile.gmail, "owner@test.com");
});

test("google auth rejects email not in allow-list", async () => {
  await resetDatabase();
  await updateAuthSettings({
    googleEnabled: true,
    allowedGoogleEmail: "owner@test.com"
  });
  const token = createFakeIdToken({
    email: "intruder@test.com",
    email_verified: true,
    sub: "google-sub-456"
  });

  await assert.rejects(
    () => authenticateGoogleCredential(token),
    /Access denied/
  );
});

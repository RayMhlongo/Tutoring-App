import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { uid, monthKey, sanitizeText, toNumber } from "../src/utils/common.js";
import { encryptJson, decryptJson, hashPasscode } from "../src/utils/crypto.js";

if (!globalThis.crypto) globalThis.crypto = webcrypto;
globalThis.btoa = globalThis.btoa || ((text) => Buffer.from(text, "binary").toString("base64"));
globalThis.atob = globalThis.atob || ((text) => Buffer.from(text, "base64").toString("binary"));

async function run(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

await run("uid prefix", () => {
  const id = uid("stu");
  assert.equal(id.startsWith("stu_"), true);
});

await run("monthKey format", () => {
  assert.equal(monthKey("2026-04-06"), "2026-04");
});

await run("sanitizeText limit", () => {
  assert.equal(sanitizeText("  abc  ", 2), "ab");
});

await run("toNumber fallback", () => {
  assert.equal(toNumber("x", 9), 9);
});

await run("encrypt/decrypt", async () => {
  const payload = { hello: "world", n: 2 };
  const enc = await encryptJson(payload, "pass1234");
  const dec = await decryptJson(enc, "pass1234");
  assert.deepEqual(dec, payload);
});

await run("passcode hash deterministic with same salt", async () => {
  const one = await hashPasscode("1234");
  const saltBytes = Uint8Array.from(atob(one.salt), (c) => c.charCodeAt(0));
  const two = await hashPasscode("1234", saltBytes);
  assert.equal(one.hash, two.hash);
});

if (!process.exitCode) {
  console.log("All tests passed.");
}
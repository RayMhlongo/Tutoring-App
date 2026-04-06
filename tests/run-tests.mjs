import assert from "node:assert/strict";
import fs from "node:fs";

function ok(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

ok("index exists", () => assert.equal(fs.existsSync("index.html"), true));
ok("main exists", () => assert.equal(fs.existsSync("src/main.js"), true));
ok("core store exists", () => assert.equal(fs.existsSync("src/core/store.js"), true));
ok("features page module exists", () => assert.equal(fs.existsSync("src/features/pages.js"), true));
ok("main mounts initial render", () => {
  const text = fs.readFileSync("src/main.js", "utf8");
  assert.equal(text.includes("render();"), true);
});

if (!process.exitCode) console.log("All tests passed.");

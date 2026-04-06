import assert from "node:assert/strict";
import fs from "node:fs";

function ok(name, fn){
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e); process.exitCode = 1; }
}

ok("index exists", ()=> assert.equal(fs.existsSync("index.html"), true));
ok("main exists", ()=> assert.equal(fs.existsSync("src/main.js"), true));
ok("main has boot call", ()=> {
  const t = fs.readFileSync("src/main.js","utf8");
  assert.equal(t.includes("boot();"), true);
});

if(!process.exitCode) console.log("All tests passed.");
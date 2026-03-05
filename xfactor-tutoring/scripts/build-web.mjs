import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, "www");

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

const requiredFiles = ["index.html", "manifest.json", "service-worker.js"];
for (const file of requiredFiles) {
  const src = join(root, file);
  if (!existsSync(src)) {
    throw new Error(`Missing required web asset: ${file}`);
  }
  cpSync(src, join(outDir, file));
}

const optionalDirs = ["icons", "assets"];
for (const dir of optionalDirs) {
  const src = join(root, dir);
  if (existsSync(src)) {
    cpSync(src, join(outDir, dir), { recursive: true });
  }
}

console.log("Built web assets into ./www");

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "www");

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      copyFile(srcPath, destPath);
    }
  }
}

removeDir(target);
fs.mkdirSync(target, { recursive: true });

["index.html", "manifest.json", "offline.html", "service-worker.js", "env.js"].forEach((file) => {
  copyFile(path.join(root, file), path.join(target, file));
});

["assets", "components", "icons", "src", "styles"].forEach((dir) => {
  copyDir(path.join(root, dir), path.join(target, dir));
});

console.log("Prepared web assets in /www");

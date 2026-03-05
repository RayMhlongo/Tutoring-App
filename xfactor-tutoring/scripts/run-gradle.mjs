import { spawnSync } from "node:child_process";
import { join } from "node:path";

const task = process.argv[2];
if (!task) {
  console.error("Usage: node scripts/run-gradle.mjs <gradleTask>");
  process.exit(1);
}

const androidDir = join(process.cwd(), "android");
const gradleCmd = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const prep = process.platform === "win32" ? null : spawnSync("chmod", ["+x", "gradlew"], { cwd: androidDir, stdio: "inherit" });
if (prep && prep.status !== 0) process.exit(prep.status ?? 1);

const result = spawnSync(gradleCmd, [task], {
  cwd: androidDir,
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);

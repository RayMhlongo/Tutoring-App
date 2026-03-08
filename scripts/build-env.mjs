import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const root = process.cwd();
const envPath = path.join(root, ".env");
const template = {
  VITE_GOOGLE_CLIENT_ID: "",
  VITE_GEMINI_API_KEY: "",
  VITE_STRIPE_PUBLISHABLE_KEY: "",
  VITE_STRIPE_CHECKOUT_ENDPOINT: ""
};

let parsed = {};
if (fs.existsSync(envPath)) {
  parsed = dotenv.parse(fs.readFileSync(envPath, "utf8"));
}

const merged = { ...template };
Object.keys(template).forEach((key) => {
  merged[key] = process.env[key] || parsed[key] || "";
});

const outPath = path.join(root, "env.js");
const file = `window.__APP_ENV__ = ${JSON.stringify(merged, null, 2)};\n`;
fs.writeFileSync(outPath, file, "utf8");
console.log(`Generated ${outPath}`);

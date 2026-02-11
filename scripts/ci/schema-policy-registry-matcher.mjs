// scripts/ci/schema-policy-registry-matcher.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function repoRootFromHere() {
  return path.resolve(__dirname, "..", "..");
}

export function exists(p) {
  return fs.existsSync(p);
}

export function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

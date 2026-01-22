// src/litigation/templates/load.js

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// templates folder root (this file lives in src/litigation/templates)
const ROOT = path.resolve(__dirname);

export async function loadTemplateText(relFile) {
  const full = path.join(ROOT, relFile);
  return fs.readFile(full, "utf8");
}

export async function templateExists(relFile) {
  const full = path.join(ROOT, relFile);
  try {
    await fs.stat(full);
    return true;
  } catch {
    return false;
  }
}

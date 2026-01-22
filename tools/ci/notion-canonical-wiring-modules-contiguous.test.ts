import fs from "node:fs";

const RUNBOOK =
  process.env.NOTION_RUNBOOK_PATH ??
  "notion/job-templates/notion-hands-free-router-wiring.v1.md";

const rawEnv = process.env.CANONICAL_WIRING_HEADER_REGEX;
if (!rawEnv) throw new Error("Missing CANONICAL_WIRING_HEADER_REGEX env var.");
const raw = rawEnv.replace(/\\\\/g, "\\");
const headerRe = new RegExp(raw, "m");

const md = fs.readFileSync(RUNBOOK, "utf8");
const lines = md.split(/\r?\n/);

const start = lines.findIndex((l) => headerRe.test(l));
if (start < 0) throw new Error(`[modules-contiguous] Canonical header not found in ${RUNBOOK}`);

const end = lines.findIndex((l, i) => i > start && /^##\s+/.test(l));
const section = (end < 0 ? lines.slice(start) : lines.slice(start, end)).join("\n");

const moduleRe = /\bModule\s+(\d{1,3})\b/g;
const found = Array.from(section.matchAll(moduleRe)).map((m) => Number(m[1]));
if (found.length === 0)
  throw new Error(`[modules-contiguous] No Module N labels found in canonical section.`);

const uniq = Array.from(new Set(found));
const missing: number[] = [];
for (let n = 0; n <= 90; n++) if (!uniq.includes(n)) missing.push(n);

if (missing.length) {
  throw new Error(`[modules-contiguous] Missing Module labels: ${missing.join(", ")}`);
}

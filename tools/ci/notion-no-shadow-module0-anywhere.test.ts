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
if (start < 0)
  throw new Error(`[no-shadow-module0-anywhere] Canonical header not found in ${RUNBOOK}`);

const end = lines.findIndex((l, i) => i > start && /^##\s+/.test(l));
const inSection = (i: number) => i >= start && (end < 0 || i < end);

const offenders = lines
  .map((line, i) => ({ line, n: i + 1, i }))
  .filter((x) => /\bModule\s+0\b/.test(x.line))
  .filter((x) => !inSection(x.i));

if (offenders.length) {
  throw new Error(
    `[no-shadow-module0-anywhere] "Module 0" found outside canonical section:\n` +
      offenders.map((o) => `L${o.n}: ${o.line}`).join("\n")
  );
}

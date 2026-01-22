import fs from "node:fs";

const RUNBOOK =
  process.env.NOTION_RUNBOOK_PATH ??
  "notion/job-templates/notion-hands-free-router-wiring.v1.md";

const rawEnv = process.env.CANONICAL_WIRING_HEADER_REGEX;
if (!rawEnv) throw new Error("Missing CANONICAL_WIRING_HEADER_REGEX env var.");
const raw = rawEnv.replace(/\\\\/g, "\\");
const canonicalRe = new RegExp(raw, "m");

const md = fs.readFileSync(RUNBOOK, "utf8");
const lines = md.split(/\r?\n/);

const headingsWithModule0 = lines
  .map((line, i) => ({ line, n: i + 1 }))
  .filter((x) => /^#{1,6}\s+/.test(x.line))
  .filter((x) => /\bModule\s+0\b/.test(x.line));

const canonicalHeading = headingsWithModule0.find((x) => canonicalRe.test(x.line));
if (!canonicalHeading) {
  throw new Error(
    `[no-shadow-module0-heading] Canonical header must itself be a heading containing "Module 0".\n` +
      `Found:\n${headingsWithModule0.map((h) => `L${h.n}: ${h.line}`).join("\n")}`
  );
}

const offenders = headingsWithModule0.filter((h) => h.n !== canonicalHeading.n);
if (offenders.length) {
  throw new Error(
    `[no-shadow-module0-heading] Shadow wiring headings detected:\n` +
      offenders.map((o) => `L${o.n}: ${o.line}`).join("\n")
  );
}

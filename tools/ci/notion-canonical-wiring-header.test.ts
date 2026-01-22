import fs from "node:fs";

const RUNBOOK =
  process.env.NOTION_RUNBOOK_PATH ??
  "notion/job-templates/notion-hands-free-router-wiring.v1.md";

const rawEnv = process.env.CANONICAL_WIRING_HEADER_REGEX;
if (!rawEnv) throw new Error("Missing CANONICAL_WIRING_HEADER_REGEX env var.");

// CI/YAML often require doubled backslashes. Normalize for JS RegExp.
const raw = rawEnv.replace(/\\\\/g, "\\");
const re = new RegExp(raw, "gm");
const md = fs.readFileSync(RUNBOOK, "utf8");
const matches = Array.from(md.matchAll(re));

if (matches.length !== 1) {
  throw new Error(
    `[notion-canonical-wiring-header] Expected exactly 1 canonical header match, found ${matches.length}.\n` +
      `Regex: ${rawEnv}\nFile: ${RUNBOOK}`
  );
}

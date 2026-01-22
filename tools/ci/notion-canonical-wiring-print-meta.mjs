import fs from "node:fs";
import crypto from "node:crypto";

const RUNBOOK =
  process.env.NOTION_RUNBOOK_PATH ??
  "notion/job-templates/notion-hands-free-router-wiring.v1.md";

const rawEnv =
  process.env.CANONICAL_WIRING_HEADER_REGEX ??
  "^##\\s+Pinned-Mode\\s+Make\\s+Wiring\\s+\\(Module\\s+0\\s+→\\s+90\\)\\s+—\\s+v(\\d+)\\s*$";

const raw = rawEnv.replace(/\\\\/g, "\\");
const headerRe = new RegExp(raw);

const md = fs.readFileSync(RUNBOOK, "utf8");
const lines = md.split(/\r?\n/);

const start = lines.findIndex((l) => headerRe.test(l));
if (start < 0) {
  throw new Error(`[meta] Canonical header not found in ${RUNBOOK}`);
}

const headerLine = lines[start];
const m = headerLine.match(new RegExp(raw));
if (!m) throw new Error("[meta] Header line does not match regex (unexpected)." );
const headerVersion = Number(m[1]);

const end = lines.findIndex((l, i) => i > start && /^##\s+/.test(l));
const section = (end < 0 ? lines.slice(start) : lines.slice(start, end)).join("\n");
const canonicalBytes = section.replace(/\r\n/g, "\n");
const sha256 = crypto.createHash("sha256").update(canonicalBytes, "utf8").digest("hex");

console.log(JSON.stringify({
  runbook: RUNBOOK,
  headerLine,
  headerVersion,
  canonicalSectionSha256: sha256,
}, null, 2));

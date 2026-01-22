// tools/ci/print-canonical-wiring-metadata.mjs
// Prints: (new_sha256, header_version) for the canonical wiring section.
// Deterministic: normalizes CRLF->LF before hashing.

import fs from "node:fs";
import crypto from "node:crypto";

const RUNBOOK =
  process.env.NOTION_RUNBOOK_PATH ??
  process.argv[2] ??
  "notion/job-templates/notion-hands-free-router-wiring.v1.md";

// Exact header regex (CI can override via env var)
const HEADER_REGEX_STR =
  process.env.CANONICAL_WIRING_HEADER_REGEX ??
  String.raw`^##\s+Pinned-Mode\s+Make\s+Wiring\s+\(Module\s+0\s+→\s+90\)\s*$`;

const HEADER_RE = new RegExp(HEADER_REGEX_STR, "m");

const raw = fs.readFileSync(RUNBOOK, "utf8");
const md = raw.replace(/\r\n/g, "\n");

// Require header appears exactly once.
const matches = Array.from(md.matchAll(new RegExp(HEADER_RE.source, "gm")));
if (matches.length !== 1) {
  console.error(
    `ERROR: Canonical wiring header must match exactly once.\n` +
      `RUNBOOK=${RUNBOOK}\n` +
      `HEADER_REGEX=${HEADER_REGEX_STR}\n` +
      `FOUND=${matches.length}`
  );
  process.exit(2);
}

const headerIndex = matches[0].index;
if (headerIndex == null || headerIndex < 0) {
  console.error(`ERROR: Internal: missing header match index.`);
  process.exit(2);
}

// Strict: next line after header must be exactly WIRING_VERSION: vN
const headerLineEnd = md.indexOf("\n", headerIndex);
const nextLineStart = headerLineEnd === -1 ? md.length : headerLineEnd + 1;
if (nextLineStart >= md.length) {
  console.error(`ERROR: Missing WIRING_VERSION line immediately after canonical header.`);
  process.exit(2);
}
const nextLineEnd = md.indexOf("\n", nextLineStart);
const nextLine = (nextLineEnd === -1 ? md.slice(nextLineStart) : md.slice(nextLineStart, nextLineEnd)).trimEnd();
const vm = nextLine.match(/^WIRING_VERSION: v([1-9][0-9]*)$/);
if (!vm) {
  console.error(
    `ERROR: Canonical header must be followed immediately by an exact version line.\n` +
      `Expected: WIRING_VERSION: vN (N>=1)\n` +
      `Found: ${JSON.stringify(nextLine)}`
  );
  process.exit(2);
}
const version = `v${vm[1]}`;

// Section bounds: header line start -> before next "## " header
const afterHeaderIndex = headerIndex + matches[0][0].length;
const rest = md.slice(afterHeaderIndex);
const nextH2Rel = rest.search(/\n##\s+/);
const section =
  nextH2Rel === -1
    ? md.slice(headerIndex)
    : md.slice(headerIndex, afterHeaderIndex + nextH2Rel + 1);

// Hash EXACT canonical section bytes (post LF-normalization)
const sha256 = crypto.createHash("sha256").update(section, "utf8").digest("hex");

// Paste-friendly outputs
console.log(`(${sha256}, ${version})`);
console.log(JSON.stringify({ new_sha256: sha256, header_version: version }, null, 0));

// Optional: env lines you can paste into GitHub Actions / Make / wherever
console.log(`CANONICAL_WIRING_SECTION_SHA256=${sha256}`);
console.log(`CANONICAL_WIRING_HEADER_VERSION=${version}`);

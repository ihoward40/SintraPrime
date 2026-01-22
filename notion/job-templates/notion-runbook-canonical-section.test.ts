import fs from "node:fs";
import path from "node:path";

function fail(msg: string): never {
  throw new Error(`[notion-runbook-canonical] ${msg}`);
}

function getRunbookPath(): string {
  const p =
    process.env.NOTION_RUNBOOK_PATH ??
    "notion/job-templates/notion-hands-free-router-wiring.v1.md";
  return path.resolve(process.cwd(), p);
}

/**
 * Canonical header rule:
 * - Must exist EXACTLY once.
 * - Must be a Markdown heading line (starts with #, ##, ###, etc.).
 *
 * Default pattern matches:
 *   "Module 0 → 90"
 * and also tolerates ASCII fallback:
 *   "Module 0 -> 90"
 *
 * You can override with CANONICAL_WIRING_HEADER_REGEX in CI if you want
 * to lock to an even stricter string later.
 */
function getHeaderRegex(): RegExp {
  const raw = process.env.CANONICAL_WIRING_HEADER_REGEX;
  if (raw) return new RegExp(raw, "gm");

  // Default: match the versioned canonical heading line.
  return /^##\s+Pinned-Mode\s+Make\s+Wiring\s+\(Module\s+0\s*(?:→|->)\s*90\)\s+—\s+v\d+\s*$/gm;
}

(function main() {
  const runbookPath = getRunbookPath();
  const md = fs.readFileSync(runbookPath, "utf8");

  const re = getHeaderRegex();
  const matches = md.match(re) ?? [];

  if (matches.length === 0) {
    fail(
      'Missing canonical wiring header. Expected exactly one Markdown heading containing "Module 0 → 90" (or "Module 0 -> 90").'
    );
  }
  if (matches.length > 1) {
    fail(
      `Duplicate canonical wiring headers found (${matches.length}). Keep exactly ONE canonical "Module 0 → 90" section. Offenders:\n- ${matches.join(
        "\n- "
      )}`
    );
  }

  // Optional sanity: ensure it’s not inside a code block (rare but catastrophic).
  // Quick heuristic: count fenced blocks before the match line.
  const line = matches[0];
  const idx = md.indexOf(line);
  const before = md.slice(0, idx);
  const fences = (before.match(/```/g) ?? []).length;
  if (fences % 2 === 1) {
    fail(`Canonical wiring header appears inside a fenced code block. Move it out.`);
  }

  if (process.env.CI !== "true") {
    // eslint-disable-next-line no-console
    console.log(
      `[notion-runbook-canonical] OK: exactly one canonical wiring header found.`
    );
  }
})();

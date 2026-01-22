#!/usr/bin/env node
/**
 * Fake-claims warning scan (non-blocking)
 *
 * Purpose:
 * - Surface reintroduction of non-verifiable numeric outcome claims early.
 * - WARNING-ONLY by default (exit code 0).
 *
 * This is a lightweight hygiene gate; it does not assert legal/compliance correctness.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();

const DEFAULT_DIRS = [
  "docs",
  "templates",
  "public",
  "public-demo-release",
  "ui",
];

const DEFAULT_EXTS = new Set([".md", ".txt", ".html", ".htm", ".js", ".jsx", ".ts", ".tsx"]);

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
]);

const IGNORE_TOKEN = "fake-claims:ignore";

const DEFAULT_ALLOWLIST_PATH = path.join(REPO_ROOT, "scripts", "ci", "fake-claims-allowlist.txt");

const SEVERITY_RANK = {
  LOW: 1,
  MED: 2,
  HIGH: 3,
};

function loadAllowlist(p) {
  if (!p) return [];
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf8");
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"));
}

function containsAllowlistedPhrase(lineText, allowlist) {
  const hay = lineText.toLowerCase();
  for (const phrase of allowlist) {
    if (hay.includes(phrase.toLowerCase())) return true;
  }
  return false;
}

const RULES = [
  {
    severity: "HIGH",
    id: "revenue-generated",
    re: /revenue\s+generated/gi,
    message: "Phrase 'revenue generated' often implies outcome claims; verify/replace.",
  },
  {
    severity: "HIGH",
    id: "success-rate",
    re: /success\s+rate/gi,
    message: "Phrase 'success rate' is an outcome claim; verify/replace.",
  },
  {
    severity: "HIGH",
    id: "percent-2plus",
    re: /\b\d{2,}%\b/g,
    message: "Percent values often read as performance metrics; verify/replace.",
  },
  {
    severity: "HIGH",
    id: "money-large",
    re: /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d{2})?/g,
    message: "Large dollar figures often read as outcomes/claims; verify/replace.",
  },
  {
    severity: "HIGH",
    id: "discharged-with-number",
    re: /(discharg(?:e|ed|es)\b[^\n]{0,80}\b\$?\d{1,3}(?:,\d{3})+)/gi,
    message: "Debt discharge + numeric figure is an outcome claim; verify/replace.",
  },
  {
    severity: "HIGH",
    id: "guaranteed-results",
    re: /guaranteed\s+results/gi,
    message: "Avoid 'guaranteed results' phrasing; replace with scope + disclaimers.",
  },
];

function parseArgs(argv) {
  const out = {
    allowlistPath: DEFAULT_ALLOWLIST_PATH,
    minSeverity: "HIGH", // default CI-safe
    failOnWarn: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--allowlist" && argv[i + 1]) {
      out.allowlistPath = argv[i + 1];
      i++;
    } else if (a === "--no-allowlist") {
      out.allowlistPath = null;
    } else if (a === "--strict") {
      out.minSeverity = "MED";
    } else if (a === "--paranoid") {
      out.minSeverity = "LOW";
    } else if (a === "--fail") {
      out.failOnWarn = true;
    }
  }

  return out;
}

function listFilesRecursive(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      out.push(...listFilesRecursive(p));
    }
    else out.push(p);
  }
  return out;
}

function isTextExt(file) {
  return DEFAULT_EXTS.has(path.extname(file).toLowerCase());
}

function computeLineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function offsetToLine(lineStarts, offset) {
  // binary search: largest idx where starts[idx] <= offset
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lineStarts[mid] <= offset) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi + 1; // 1-based line number
}

function warn(fileRel, line, msg) {
  // GitHub Actions annotation format.
  process.stdout.write(`::warning file=${fileRel},line=${line}::${msg}\n`);
}

function getLineAt(text, lineStarts, line1) {
  const idx = Math.max(0, Math.min(lineStarts.length - 1, line1 - 1));
  const start = lineStarts[idx];
  const end = idx + 1 < lineStarts.length ? lineStarts[idx + 1] - 1 : text.length;
  return text.slice(start, end);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const allowlist = loadAllowlist(args.allowlistPath);
  const threshold = SEVERITY_RANK[args.minSeverity] ?? SEVERITY_RANK.HIGH;

  const dirs = DEFAULT_DIRS.map((d) => path.join(REPO_ROOT, d));
  const files = dirs.flatMap(listFilesRecursive).filter(isTextExt);

  const findings = [];

  for (const abs of files) {
    const rel = path.relative(REPO_ROOT, abs).replace(/\\/g, "/");

    let text;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }

    const lineStarts = computeLineStarts(text);

    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      // eslint-disable-next-line no-cond-assign
      while ((m = rule.re.exec(text))) {
        const line = offsetToLine(lineStarts, m.index);
        const lineText = getLineAt(text, lineStarts, line);
        if (lineText.includes(IGNORE_TOKEN)) continue;
        if (containsAllowlistedPhrase(lineText, allowlist)) continue;
        const sev = rule.severity;
        const rank = SEVERITY_RANK[sev] ?? 0;
        if (rank < threshold) continue;

        findings.push({
          file: rel,
          line,
          severity: sev,
          id: rule.id,
          message: rule.message,
        });
      }
    }
  }

  for (const f of findings) {
    warn(f.file, f.line, `[fake-claims:${f.severity}:${f.id}] ${f.message}`);
  }

  process.stdout.write(
    `Fake-claims scan complete: ${findings.length} warning(s) (minSeverity=${args.minSeverity})\n`,
  );

  if (args.failOnWarn && findings.length > 0) {
    process.exit(1);
  }
}

main();

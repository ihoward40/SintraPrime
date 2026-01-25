#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function die(msg) {
  console.error(`\n[skills:status] ❌ ${msg}\n`);
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const root = process.cwd();
const lockPath = path.join(root, "skills.lock.json");
if (!fs.existsSync(lockPath)) die("skills.lock.json not found.");

const lock = readJson(lockPath);
const skills = Array.isArray(lock.skills) ? lock.skills : [];

const KNOWN = new Set(["experimental", "trusted", "revoked"]);
function normStatus(s) {
  const v = String(s || "").toLowerCase().trim();
  if (v === "revoked" || s?.revoked === true) return "revoked";
  if (v === "trusted") return "trusted";
  if (v === "experimental") return "experimental";
  return v || "unknown";
}

function shortSha(sha) {
  if (!sha) return "";
  const s = String(sha);
  return s.length > 10 ? s.slice(0, 10) : s;
}

function pad(str, w) {
  const s = String(str ?? "");
  if (s.length >= w) return s.slice(0, w - 1) + "…";
  return s + " ".repeat(w - s.length);
}

function printTable(rows) {
  const cols = [
    { key: "status", title: "STATUS", w: 12 },
    { key: "name", title: "NAME", w: 20 },
    { key: "repo", title: "REPO", w: 32 },
    { key: "commit", title: "COMMIT", w: 12 },
    { key: "risk", title: "RISK", w: 10 },
    { key: "approved_by", title: "BY", w: 10 },
    { key: "evidence_dir", title: "EVIDENCE", w: 36 }
  ];

  const header = cols.map(c => pad(c.title, c.w)).join("  ");
  const sep = cols.map(c => "-".repeat(c.w)).join("  ");

  console.log(header);
  console.log(sep);
  for (const r of rows) {
    console.log(cols.map(c => pad(r[c.key] ?? "", c.w)).join("  "));
  }
}

const rows = skills
  .map(s => {
    const status = normStatus(s.status ?? (s.revoked ? "revoked" : ""));
    const risk = s.risk_tier || s.risk_level || "";
    const approved_by =
      status === "trusted" ? (s.approved_by || s.promoted_by || "") :
      status === "revoked" ? (s.revoked_by || "") :
      "";
    return {
      status,
      name: s.name || "",
      repo: s.repo || "",
      commit: shortSha(s.commit || ""),
      risk,
      approved_by,
      evidence_dir: s.evidence_dir || ""
    };
  })
  .sort((a, b) => {
    const order = { trusted: 0, experimental: 1, revoked: 2, unknown: 9 };
    const oa = order[a.status] ?? 9;
    const ob = order[b.status] ?? 9;
    if (oa !== ob) return oa - ob;
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.commit.localeCompare(b.commit);
  });

const counts = rows.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, {});

console.log("\n====================== SKILLS STATUS ======================");
console.log(
  `Trusted: ${counts.trusted || 0}  |  Experimental: ${counts.experimental || 0}  |  Revoked: ${counts.revoked || 0}` +
  (counts.unknown ? `  |  Unknown: ${counts.unknown}` : "")
);
console.log("===========================================================\n");

printTable(rows);

// ----------------------
// WARN: experimental references outside sandbox/
// ----------------------

const experimental = skills.filter(s => normStatus(s.status) === "experimental");

if (experimental.length === 0) {
  console.log("\n[skills:status] ✅ No experimental skills detected. No usage warnings.\n");
  process.exit(0);
}

// Repo scan configuration
const EXCLUDE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".turbo", ".cache", "coverage",
  "artifacts", "evidence",
  // IMPORTANT: exclude sandbox so any hit we find is, by definition, "outside sandbox"
  "sandbox"
]);

const TEXT_EXTS = new Set([
  ".js", ".mjs", ".cjs", ".ts", ".tsx",
  ".json", ".yml", ".yaml",
  ".md", ".txt",
  ".ps1", ".sh", ".bash", ".zsh", ".cmd", ".bat",
  ".toml", ".ini", ".env", ".gitignore"
]);

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTS.has(ext);
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      walk(p, out);
    } else if (e.isFile()) {
      if (isTextFile(p)) out.push(p);
    }
  }
}

function escRe(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPatterns(s) {
  const n = escRe(s.name);
  const c = escRe(s.commit);
  const r = escRe(s.repo || "");

  const patterns = [
    // Typical "use this skill" patterns
    new RegExp(`\\bskill\\s*[:=]\\s*${n}\\b`, "i"),
    new RegExp(`\\bskills\\s*[:=]\\s*${n}\\b`, "i"),
    new RegExp(`["']skill["']\\s*:\\s*["']${n}["']`, "i"),
    new RegExp(`\\b--name\\s+${n}\\b`, "i"),
    new RegExp(`\\b--skill\\s+${n}\\b`, "i"),
    new RegExp(`\\b${n}\\s*@\\s*${escRe(shortSha(s.commit))}\\b`, "i"),
    new RegExp(`\\b${n}\\s*@\\s*${c}\\b`, "i"),

    // Repo+commit references (common in docs/config)
    ...(s.repo ? [new RegExp(`${r}.*${escRe(shortSha(s.commit))}`, "i")] : []),
    ...(s.repo ? [new RegExp(`${r}.*${c}`, "i")] : [])
  ];

  return patterns;
}

function findMatches(filePath, patterns) {
  const txt = fs.readFileSync(filePath, "utf8");
  const lines = txt.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const re of patterns) {
      if (re.test(line)) {
        hits.push({ lineNo: i + 1, line: line.slice(0, 260) });
        break;
      }
    }
  }
  return hits;
}

const files = [];
walk(root, files);

const warnings = [];
for (const s of experimental) {
  const patterns = buildPatterns(s);
  for (const f of files) {
    const hits = findMatches(f, patterns);
    if (hits.length) {
      warnings.push({
        skill: `${s.name}@${shortSha(s.commit)}`,
        file: path.relative(root, f).replaceAll("\\", "/"),
        hits
      });
    }
  }
}

if (!warnings.length) {
  console.log(`\n[skills:status] ✅ No references to EXPERIMENTAL skills found outside sandbox/.`);
  console.log(`[skills:status] (That's correct: experimental skills should only exist in sandbox/ until promoted.)\n`);
  process.exit(0);
}

console.warn(`\n[skills:status] ⚠️  EXPERIMENTAL skill usage detected OUTSIDE sandbox/ (warning only):\n`);
for (const w of warnings) {
  console.warn(`- ${w.skill} referenced in ${w.file}`);
  for (const h of w.hits.slice(0, 4)) {
    console.warn(`    L${h.lineNo}: ${h.line}`);
  }
  if (w.hits.length > 4) console.warn(`    … +${w.hits.length - 4} more`);
}

console.warn(
  `\nFix: move references into sandbox/ (test-only) OR promote the skill (skills:promote) before using it in real code/config.\n`
);

// Intentionally exit 0 (warn-only)
process.exit(0);

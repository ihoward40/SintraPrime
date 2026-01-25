#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function die(msg) {
  console.error(`\n[skills:check] ❌ ${msg}\n`);
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const root = process.cwd();
const lockPath = path.join(root, "skills.lock.json");
if (!fs.existsSync(lockPath)) die("skills.lock.json not found.");

const lock = readJson(lockPath);
const skills = lock.skills || [];
const revoked = skills.filter(s => (s.status === "revoked") || (s.revoked === true));

if (revoked.length === 0) {
  console.log("[skills:check] ✅ No revoked skills. Gate passes.");
  process.exit(0);
}

const EXCLUDE_DIRS = new Set([
  "node_modules", ".git", "artifacts", "evidence", "sandbox",
  "dist", "build", ".next", ".turbo", ".cache", "coverage"
]);

const TEXT_EXTS = new Set([
  ".js", ".mjs", ".cjs", ".ts", ".tsx",
  ".json", ".yml", ".yaml",
  ".md", ".txt",
  ".ps1", ".sh", ".bash", ".zsh", ".cmd", ".bat",
  ".toml", ".ini", ".env", ".gitignore"
]);

function isExcludedDir(dirName) {
  return EXCLUDE_DIRS.has(dirName);
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTS.has(ext);
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith(".")) {
      // allow dotfiles, but exclude dot-directories like .git handled above
    }
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (isExcludedDir(e.name)) continue;
      walk(p, out);
    } else if (e.isFile()) {
      if (isTextFile(p)) out.push(p);
    }
  }
}

function buildPatterns(name, repo, commit) {
  // "Skill reference" patterns (not raw substring everywhere, to avoid noise)
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape regex
  const c = commit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const r = (repo || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patterns = [
    // canonical-ish
    new RegExp(`\\bskill\\s*[:=]\\s*${n}\\b`, "i"),
    new RegExp(`\\bskills\\s*[:=]\\s*${n}\\b`, "i"),
    new RegExp(`\\bskill\\/${n}\\b`, "i"),
    new RegExp(`\\bskills\\/${n}\\b`, "i"),

    // json/yaml-ish
    new RegExp(`["']skill["']\\s*:\\s*["']${n}["']`, "i"),
    new RegExp(`["']skills["']\\s*:\\s*\\[[^\\]]*["']${n}["']`, "i"),
    new RegExp(`\\b-\\s*${n}\\b`, "i"), // YAML list item (when under a skills key)

    // CLI flags
    new RegExp(`\\b--skill\\s+${n}\\b`, "i"),
    new RegExp(`\\b--skills\\s+${n}\\b`, "i"),

    // pinned reference
    new RegExp(`\\b${n}\\s*@\\s*${c}\\b`, "i")
  ];

  // If repo present, also catch repo@commit or repo#commit style references
  if (repo) {
    patterns.push(new RegExp(`${r}.*${c}`, "i"));
  }

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
        hits.push({ lineNo: i + 1, line: line.slice(0, 300) });
        break;
      }
    }
  }
  return hits;
}

const files = [];
walk(root, files);

const violations = [];
for (const s of revoked) {
  const patterns = buildPatterns(s.name, s.repo, s.commit);
  for (const f of files) {
    const hits = findMatches(f, patterns);
    if (hits.length) {
      violations.push({
        skill: `${s.name}@${s.commit}`,
        file: path.relative(root, f).replaceAll("\\", "/"),
        hits
      });
    }
  }
}

if (violations.length === 0) {
  console.log("[skills:check] ✅ No references to revoked skills found. Gate passes.");
  process.exit(0);
}

console.error("\n[skills:check] ❌ Revoked skill references detected:\n");
for (const v of violations) {
  console.error(`- ${v.skill} referenced in ${v.file}`);
  for (const h of v.hits.slice(0, 5)) {
    console.error(`    L${h.lineNo}: ${h.line}`);
  }
  if (v.hits.length > 5) console.error(`    … +${v.hits.length - 5} more`);
}
console.error("\nFix: remove/replace these references (or un-revoke explicitly with a new intake+promote).");
process.exit(2);

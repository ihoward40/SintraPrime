// tools/scan-agents.mjs
// Config-driven agent discovery -> audit/agent_map.generated.json
// BOM-safe + parse-failure resilient: never bricks scanning due to a bad config edit.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "tools", "agent-scan.config.json");

const DEFAULT_CONFIG = {
  include_dirs: ["src"],
  exclude_dir_parts: [
    "SintraPrime",
    "skills",
    "vendor",
    "third_party",
    "node_modules",
    "dist",
    "build",
    "out",
    "coverage",
    ".next",
    ".turbo",
    ".cache",
    ".git",
    ".venv",
    "generated",
    "upstream",
  ],
};

const ALLOWED_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
]);

const MAX_FILE_BYTES = 2_000_000;

const NAME_RE = /\b[A-Z][A-Za-z0-9_]{2,80}(Agent|Bot|Orchestrator|Sentinel|Guardian)\b/g;
const KEY_RE = /\b(agent_id|agentId|bot_id|botId|dispatcher|dispatchRule|orchestrator)\b/g;

function readJsonFileBOMSafe(filePath) {
  let raw = fs.readFileSync(filePath, "utf8");
  raw = raw.replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;
    const parsed = readJsonFileBOMSafe(CONFIG_PATH);
    return {
      include_dirs: Array.isArray(parsed.include_dirs) ? parsed.include_dirs : DEFAULT_CONFIG.include_dirs,
      exclude_dir_parts: Array.isArray(parsed.exclude_dir_parts)
        ? parsed.exclude_dir_parts
        : DEFAULT_CONFIG.exclude_dir_parts,
    };
  } catch (e) {
    console.warn(
      `[scan-agents] WARNING: invalid config JSON (${path.relative(ROOT, CONFIG_PATH)}). Using defaults.`
    );
    console.warn(String(e?.message ?? e));
    return DEFAULT_CONFIG;
  }
}

function isExcluded(fullPath, excludeParts) {
  const rel = path.relative(ROOT, fullPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return true;
  return rel.split(path.sep).some((p) => excludeParts.includes(p));
}

function walk(dir, excludeParts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (isExcluded(full, excludeParts)) continue;
    if (ent.isDirectory()) walk(full, excludeParts, out);
    else out.push(full);
  }
  return out;
}

function safeRead(file) {
  try {
    const st = fs.statSync(file);
    if (st.size > MAX_FILE_BYTES) return null;
    const ext = path.extname(file).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) return null;
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function classify(name) {
  const n = name.toLowerCase();
  if (n.includes("sentinel")) return "sentinel";
  if (n.includes("guardian")) return "guardian";
  if (n.includes("orchestrator")) return "orchestrator";
  if (n.includes("planner")) return "planner";
  if (n.includes("validator") || n.includes("validation")) return "validation";
  if (n.includes("dispatch")) return "dispatch";
  return "unclassified";
}

function main() {
  const cfg = readConfig();

  const files = [];
  for (const d of cfg.include_dirs) {
    files.push(...walk(path.join(ROOT, d), cfg.exclude_dir_parts));
  }

  const hits = new Map(); // name -> {count, files:Set}
  const keywordFiles = new Set();
  const configKeyFiles = new Set();

  for (const f of files) {
    const text = safeRead(f);
    if (!text) continue;

    NAME_RE.lastIndex = 0;
    KEY_RE.lastIndex = 0;
    const hasNameLike = NAME_RE.test(text);
    const hasConfigKey = KEY_RE.test(text);
    if (!hasNameLike && !hasConfigKey) continue;

    keywordFiles.add(f);

    NAME_RE.lastIndex = 0;
    for (const m of text.matchAll(NAME_RE)) {
      const name = m[0];
      const cur = hits.get(name) ?? { count: 0, files: new Set() };
      cur.count += 1;
      cur.files.add(f);
      hits.set(name, cur);
    }

    if (hasConfigKey) configKeyFiles.add(f);
  }

  const names = Array.from(hits.keys()).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const buckets = {
    planner: [],
    validation: [],
    orchestrator: [],
    sentinel: [],
    guardian: [],
    dispatch: [],
    unclassified: [],
  };

  for (const name of names) {
    const cur = hits.get(name);
    buckets[classify(name)].push({
      name,
      count: cur.count,
      evidence_files: Array.from(cur.files).sort(),
    });
  }

  const out = {
    generated_at: new Date().toISOString(),
    config_path: path.relative(ROOT, CONFIG_PATH),
    include_dirs: cfg.include_dirs,
    excluded_dir_parts: cfg.exclude_dir_parts,
    keyword_files_count: keywordFiles.size,
    agent_like_names_found: names.length,
    buckets,
    config_key_files: Array.from(configKeyFiles).sort(),
  };

  fs.mkdirSync(path.join(ROOT, "audit"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "audit", "agent_map.generated.json"),
    JSON.stringify(out, null, 2) + "\n",
    "utf8"
  );

  console.log("[scan-agents] wrote audit/agent_map.generated.json");
  console.log("[scan-agents] agent-like names:", names.length);
  console.log("[scan-agents] keyword files:", keywordFiles.size);
}

main();

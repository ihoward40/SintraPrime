#!/usr/bin/env node
/*
  SintraPrime Run Skeleton Generator

  Creates a Trust-grade run directory under runs/ with:
  - RUN-YYYYMMDD-HHMMSS-ET-<TAG>-<SEQ>
  - standard folder tree
  - minimal intake/audit/hash scaffolding
  - a bundle zip (via yazl)

  Usage:
    node tools/run-skeleton/run-skeleton.mjs --tag CASEFILE --objective "Smoke test run"

  Optional:
    --runs-root <path>    (default: runs)
    --run-id <RUN_ID>     (create/rehash a specific run id)
    --rehash              (rehash an existing run in-place)
    --seq <NNN>           (override sequence)
    --now <ISO>           (override time; interpreted in ET formatting only)
*/

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

let OUTPUT_JSON = true;
function die(msg, extra) {
  // Always keep CI-safe: one JSON line describing the failure.
  if (OUTPUT_JSON) {
    const payload = {
      ok: false,
      error: String(msg),
      ...(extra && typeof extra === "object" ? extra : null),
    };
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }

  // In JSON mode, do not emit human-readable stderr noise.
  if (!OUTPUT_JSON) {
    process.stderr.write(`Error: ${msg}\n`);
  }
  process.exit(1);
}

function helpText() {
  return (
    "Usage:\n" +
    "  node tools/run-skeleton/run-skeleton.mjs --tag <SHORTTAG> --objective <text> [--governance G1|G2|G3] [--runs-root <path>] [--run-id <RUN_ID>] [--seq <NNN>] [--now <ISO>] [--ship|--publish] [--notion-runlog]\n" +
    "  node tools/run-skeleton/run-skeleton.mjs --rehash --run-id <RUN_ID> [--runs-root <path>] [--notion-runlog]\n" +
    "  node tools/run-skeleton/run-skeleton.mjs --ship --run-id <RUN_ID> [--runs-root <path>] [--notion-runlog]\n" +
    "  node tools/run-skeleton/run-skeleton.mjs --version\n" +
    "\nNotes:\n" +
    "  - Outputs exactly one JSON line on success/failure (except --help).\n" +
    "  - --version prints a human-readable provenance string and exits 0.\n" +
    "  - G2 requires 04_audit/verification_checklist.json completed=true to ship.\n" +
    "  - G3 requires 05_hash/approval.json approved=true and manifest_sha256 match to ship.\n"
  );
}

function usage() {
  die(helpText());
}

function parseArgs(argv) {
  const out = {
    tag: null,
    objective: null,
    governance: "G1",
    runsRoot: "runs",
    runId: null,
    rehash: false,
    ship: false,
    publish: false,
    notionRunlog: false,
    seq: null,
    nowIso: null,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      out.help = true;
      continue;
    }
    if (a === "--version") {
      out.version = true;
      continue;
    }
    if (a === "--tag" && argv[i + 1]) {
      out.tag = String(argv[++i]).trim();
      continue;
    }
    if (a === "--objective" && argv[i + 1]) {
      out.objective = String(argv[++i]).trim();
      continue;
    }
    if (a === "--runs-root" && argv[i + 1]) {
      out.runsRoot = String(argv[++i]).trim();
      continue;
    }
    if (a === "--governance" && argv[i + 1]) {
      out.governance = String(argv[++i]).trim().toUpperCase();
      continue;
    }
    if (a === "--run-id" && argv[i + 1]) {
      out.runId = String(argv[++i]).trim();
      continue;
    }
    if (a === "--rehash") {
      out.rehash = true;
      continue;
    }
    if (a === "--ship") {
      out.ship = true;
      continue;
    }
    if (a === "--publish") {
      out.publish = true;
      continue;
    }
    if (a === "--notion-runlog") {
      out.notionRunlog = true;
      continue;
    }
    if (a === "--seq" && argv[i + 1]) {
      out.seq = String(argv[++i]).trim();
      continue;
    }
    if (a === "--now" && argv[i + 1]) {
      out.nowIso = String(argv[++i]).trim();
      continue;
    }

    usage();
  }

  if (out.help) {
    // Help is a successful, human-facing path; don't emit JSON.
    OUTPUT_JSON = false;
    process.stdout.write(helpText());
    process.exit(0);
  }

  if (out.version) {
    // Version is a successful, human-facing path; don't emit JSON.
    OUTPUT_JSON = false;
    // main() prints the version to keep parseArgs pure.
    return out;
  }

  if (!/^G[123]$/.test(out.governance)) {
    die("Invalid --governance (expected G1, G2, or G3)");
  }

  // Ship-only mode (operate on an existing run): requires run-id, forbids create-only args.
  if ((out.ship || out.publish) && out.runId && !out.rehash) {
    if (out.tag || out.objective || out.seq || out.nowIso) {
      die("--ship/--publish with --run-id does not accept --tag/--objective/--seq/--now");
    }

    const m = out.runId.match(/^RUN-\d{8}-\d{6}-ET-[A-Z0-9_-]{2,}-\d{3}$/);
    if (!m) die("Invalid --run-id (expected RUN-YYYYMMDD-HHMMSS-ET-TAG-NNN)");
    return out;
  }

  if (out.rehash) {
    if (!out.runId) usage();
    if (out.tag || out.objective || out.seq || out.nowIso) {
      die("--rehash only accepts --run-id, optional --runs-root, and optional --notion-runlog");
    }

    if (out.ship || out.publish) {
      die("Do not combine --rehash with --ship/--publish");
    }

    const m = out.runId.match(/^RUN-\d{8}-\d{6}-ET-[A-Z0-9_-]{2,}-\d{3}$/);
    if (!m) die("Invalid --run-id (expected RUN-YYYYMMDD-HHMMSS-ET-TAG-NNN)");
    return out;
  }

  if (!out.tag || !out.objective) usage();

  if (out.runId && (out.seq || out.nowIso)) {
    die("Do not combine --run-id with --seq/--now");
  }

  // Normalize tag to safe filesystem token.
  out.tag = out.tag.toUpperCase().replace(/[^A-Z0-9_\-]/g, "-");
  if (!out.tag || out.tag.length < 2) die("Invalid --tag (must contain A-Z/0-9/_/-)");

  if (out.runId) {
    const m = out.runId.match(/^RUN-\d{8}-\d{6}-ET-[A-Z0-9_-]{2,}-\d{3}$/);
    if (!m) die("Invalid --run-id (expected RUN-YYYYMMDD-HHMMSS-ET-TAG-NNN)");
  }

  if ((out.ship || out.publish) && !out.runId) {
    // Allow create+ship in one pass, but only when a fixed run-id is provided.
    // This prevents accidental shipping of an auto-generated run id.
    die("--ship/--publish requires --run-id");
  }

  return out;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeUtf8(p, text) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, text, "utf8");
}

function writeJson(p, obj) {
  writeUtf8(p, JSON.stringify(obj, null, 2) + "\n");
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sha256FileHex(filePath) {
  return sha256Hex(fs.readFileSync(filePath));
}

function stablePosixRel(fromDirAbs, fileAbs) {
  return path.relative(fromDirAbs, fileAbs).split(path.sep).join("/");
}

function listFilesRec(dirAbs) {
  const out = [];
  for (const name of fs.readdirSync(dirAbs)) {
    const abs = path.join(dirAbs, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      out.push(...listFilesRec(abs));
    } else if (st.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

function fmtEtParts(date) {
  // Returns { yyyymmdd, hhmmss }
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const y = parts.year;
  const m = parts.month;
  const d = parts.day;
  const hh = parts.hour;
  const mm = parts.minute;
  const ss = parts.second;

  if (!y || !m || !d || !hh || !mm || !ss) {
    die("Failed to format ET timestamp parts");
  }

  return {
    yyyymmdd: `${y}${m}${d}`,
    hhmmss: `${hh}${mm}${ss}`,
  };
}

function nextSeq(runsRootAbs, yyyymmdd, tag) {
  let max = 0;
  if (!fs.existsSync(runsRootAbs)) return 1;

  const re = new RegExp(`^RUN-${yyyymmdd}-\\d{6}-ET-${tag}-(\\d{3})$`);
  for (const name of fs.readdirSync(runsRootAbs)) {
    const m = name.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }

  return max + 1;
}

function zpad3(n) {
  return String(n).padStart(3, "0");
}

function computeHashChainEntries(runDirAbs, fileRelsPosix) {
  // JSONL entries compatible with verify-run.js (hash_chain + head derivation)
  const entries = [];
  let prev = null;

  for (const rel of fileRelsPosix) {
    const abs = path.join(runDirAbs, rel.split("/").join(path.sep));
    const sha = sha256FileHex(abs);
    const head = sha256Hex(`${prev || ""}|${rel}|${sha}`);

    entries.push({
      kind: "hash_chain",
      artifact: rel,
      sha256: sha,
      prev,
      head,
      at_utc: new Date().toISOString(),
    });

    prev = head;
  }

  return entries;
}

function safeReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function readToolVersion(repoRootAbs) {
  try {
    const pkgPath = path.join(repoRootAbs, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg && typeof pkg.version === "string" && pkg.version.trim()) return pkg.version.trim();
  } catch {
    // ignore
  }
  return "0.0.0";
}

function sanitizeArgv(argv) {
  const redactedKeys = /token|secret|password|passwd|api[-_]?key|bearer|cookie/i;
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i]);
    out.push(a);
    if (redactedKeys.test(a) && i + 1 < argv.length) {
      out.push("[REDACTED]");
      i++;
    }
  }
  return out;
}

function buildCommandReceipt({
  runId,
  mode,
  governance,
  ship,
  publish,
  toolVersion,
  manifestSha,
}) {
  const argv = sanitizeArgv(process.argv.slice(2));
  return {
    kind: "command_receipt",
    tool: "run-skeleton",
    tool_version: toolVersion,
    mode,
    run_id: runId,
    governance,
    ship: Boolean(ship),
    publish: Boolean(publish),
    argv,
    manifest_sha256: manifestSha ? `sha256:${manifestSha}` : null,
    at_utc: new Date().toISOString(),
  };
}

function computeRunManifest(runDirAbs, meta) {
  const createdFilesRel = listFilesRec(runDirAbs)
    .map((abs) => stablePosixRel(runDirAbs, abs))
    .filter((rel) => !rel.startsWith("07_publish/"))
    .sort((a, b) => a.localeCompare(b));

  return {
    schemaVersion: 1,
    run_id: meta.run_id,
    created_at_utc: meta.created_at_utc,
    tag: meta.tag,
    objective: meta.objective,
    files: createdFilesRel.map((rel) => {
      const abs = path.join(runDirAbs, rel.split("/").join(path.sep));
      return { path: rel, sha256: `sha256:${sha256FileHex(abs)}` };
    }),
  };
}

function parseManifestSha256Text(text) {
  const t = String(text || "").trim();
  const m = t.match(/^sha256:([0-9a-f]{64})$/i);
  return m ? m[1].toLowerCase() : null;
}

function readRunManifestSha256Hex(runDirAbs) {
  const shaPath = path.join(runDirAbs, "05_hash", "manifest_sha256.txt");
  if (fs.existsSync(shaPath)) {
    const hex = parseManifestSha256Text(fs.readFileSync(shaPath, "utf8"));
    if (hex) return hex;
    die("Invalid 05_hash/manifest_sha256.txt (expected sha256:<hex>)");
  }

  const manifestPath = path.join(runDirAbs, "05_hash", "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    die("Missing 05_hash/manifest.json (cannot derive manifest hash)");
  }

  const buf = fs.readFileSync(manifestPath);
  return sha256Hex(buf);
}

function writeLedgerOnly(runDirAbs, receipt) {
  const chainRels = listFilesRec(runDirAbs)
    .map((abs) => stablePosixRel(runDirAbs, abs))
    .filter((rel) => !rel.startsWith("07_publish/"))
    .filter((rel) => rel !== "ledger.jsonl")
    .sort((a, b) => a.localeCompare(b));

  const groupHead = {
    kind: "hash_chain_group",
    name: "run_skeleton_v1",
    head: null,
    at_utc: new Date().toISOString(),
  };

  const chainEntries = computeHashChainEntries(runDirAbs, chainRels);
  const lastHead = chainEntries.length ? chainEntries[chainEntries.length - 1].head : null;
  groupHead.head = lastHead;

  const ledgerObjs = [receipt, groupHead, ...chainEntries].filter(Boolean);
  const ledgerLines = ledgerObjs.map((o) => JSON.stringify(o)).join("\n") + "\n";
  writeUtf8(path.join(runDirAbs, "ledger.jsonl"), ledgerLines);

  return { chainHead: lastHead, hashEntries: chainEntries.length };
}

function writeHashesAndLedger(runDirAbs, manifest, manifestText, opts) {
  const manifestSha =
    opts && typeof opts.manifestSha === "string" && opts.manifestSha
      ? opts.manifestSha
      : sha256Hex(Buffer.from(manifestText, "utf8"));

  // Write manifest copies
  writeUtf8(path.join(runDirAbs, "05_hash", "manifest.json"), manifestText);
  writeUtf8(path.join(runDirAbs, "manifest.json"), manifestText);

  // sha256.txt (simple, operator-friendly)
  const shaLines = manifest.files.map((f) => `${f.sha256.replace(/^sha256:/, "")}  ${f.path}`);
  writeUtf8(path.join(runDirAbs, "05_hash", "sha256.txt"), shaLines.join("\n") + "\n");

  // manifest sha
  writeUtf8(path.join(runDirAbs, "05_hash", "manifest_sha256.txt"), `sha256:${manifestSha}\n`);

  // approval binding (safe behavior: refuse to rewrite approved runs)
  const approvalPath = path.join(runDirAbs, "05_hash", "approval.json");
  if (fs.existsSync(approvalPath)) {
    const approval = safeReadJson(approvalPath);
    if (!approval || typeof approval !== "object") die("approval.json exists but is not valid JSON");

    // Never mutate approvals here; approval is an operator action.
    void approval;
  }

  const receipt = opts && opts.receipt && typeof opts.receipt === "object" ? opts.receipt : null;
  const { chainHead, hashEntries } = writeLedgerOnly(runDirAbs, receipt);

  return { manifestSha, chainHead, hashEntries };
}

function buildNotionRunlog({ runId, runDirRel, objective, outputRel, manifestSha }) {
  const nextSteps = [
    `node verify-run.js ${runDirRel} --json`,
    "Review outputs + hashes",
    "Set 05_hash/approval.json approved=true after review",
  ];

  const md = [
    "# Run Log",
    "",
    `- Run ID: ${runId}`,
    objective ? `- Objective: ${objective}` : "- Objective: (unknown)",
    outputRel ? `- Output: ${outputRel}` : "- Output: (none)",
    `- Manifest SHA256: sha256:${manifestSha}`,
    "- Approval Needed: YES",
    "",
    "## Next Steps",
    ...nextSteps.map((s) => `- ${s}`),
    "",
  ].join("\n");

  const json = {
    run_id: runId,
    run_dir: runDirRel,
    objective: objective || null,
    outputs: outputRel ? [outputRel] : [],
    manifest_sha256: `sha256:${manifestSha}`,
    approval_needed: true,
    next_steps: nextSteps,
  };

  return { md, json };
}

function governanceLevel(governance) {
  if (governance === "G1") return 1;
  if (governance === "G2") return 2;
  if (governance === "G3") return 3;
  return 1;
}

function readApprovalOrNull(runDirAbs) {
  const approvalPath = path.join(runDirAbs, "05_hash", "approval.json");
  if (!fs.existsSync(approvalPath)) return null;
  return safeReadJson(approvalPath);
}

function assertShipAllowed({ runDirAbs, governance, manifestSha256Hex }) {
  const lvl = governanceLevel(governance);

  if (lvl >= 2) {
    const checklistPath = path.join(runDirAbs, "04_audit", "verification_checklist.json");
    const checklist = safeReadJson(checklistPath);
    if (!checklist || typeof checklist !== "object") {
      die("G2+ requires 04_audit/verification_checklist.json");
    }
    if (checklist.completed !== true) {
      die("Refusing to ship: verification checklist not completed (set completed=true)");
    }
  }

  // G3: approval-by-hash is mandatory for shipping.
  if (lvl >= 3) {
    const approval = readApprovalOrNull(runDirAbs);
    if (!approval || typeof approval !== "object") {
      die("Refusing to ship: missing 05_hash/approval.json");
    }
    if (approval.approved !== true) {
      die("Refusing to ship: approval.json approved!=true");
    }
    const expected = `sha256:${manifestSha256Hex}`;
    if (approval.manifest_sha256 !== expected) {
      die("Refusing to ship: approval.json manifest_sha256 mismatch", {
        expected_manifest_sha256: expected,
        approval_manifest_sha256: approval.manifest_sha256 ?? null,
      });
    }
  }
}

function printOneLineJson(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

async function tryWriteZip(zipAbs, rootAbs, excludeRelPosixSet) {
  // NOTE: `yazl` is a dependency of this repo, but we load it dynamically so
  // the tool can leave deterministic breadcrumbs even if packaging is unavailable.
  let yazl;
  try {
    yazl = await import("yazl");
  } catch {
    return { ok: false, reason: "yazl_not_available" };
  }

  return await new Promise((resolve, reject) => {
    const ZipFile = yazl?.ZipFile;
    if (!ZipFile) {
      resolve({ ok: false, reason: "yazl_missing_ZipFile" });
      return;
    }

    const zip = new ZipFile();

    // Deterministic ordering
    const files = listFilesRec(rootAbs)
      .map((abs) => ({ abs, rel: stablePosixRel(rootAbs, abs) }))
      .filter((x) => !excludeRelPosixSet.has(x.rel))
      .sort((a, b) => a.rel.localeCompare(b.rel));

    for (const f of files) {
      // Keep archive paths POSIX.
      zip.addFile(f.abs, f.rel);
    }

    zip.end();

    ensureDir(path.dirname(zipAbs));
    const out = fs.createWriteStream(zipAbs);

    zip.outputStream
      .pipe(out)
      .on("close", () => resolve({ ok: true }))
      .on("error", (e) => reject(e));
  });
}

async function main() {
  // Resolve script path for friendly usage messages.
  void fileURLToPath(import.meta.url);

  const args = parseArgs(process.argv.slice(2));

  const repoRoot = process.cwd();
  const toolVersion = readToolVersion(repoRoot);

  if (args.version) {
    process.stdout.write(`run-skeleton ${toolVersion}\n`);
    process.exit(0);
  }
  const runsRootAbs = path.resolve(repoRoot, args.runsRoot);
  ensureDir(runsRootAbs);

  if (args.rehash) {
    const runDirAbs = path.join(runsRootAbs, args.runId);
    if (!fs.existsSync(runDirAbs) || !fs.statSync(runDirAbs).isDirectory()) {
      die(`Run directory not found: ${path.relative(repoRoot, runDirAbs)}`);
    }

    const requestPath = path.join(runDirAbs, "00_intake", "request.json");
    const req = safeReadJson(requestPath);
    const meta = {
      run_id: args.runId,
      created_at_utc: typeof req?.created_at_utc === "string" ? req.created_at_utc : new Date().toISOString(),
      tag: typeof req?.tag === "string" ? req.tag : null,
      objective: typeof req?.objective === "string" ? req.objective : null,
    };

    const manifestSha = readRunManifestSha256Hex(runDirAbs);
    const receipt = buildCommandReceipt({
      runId: args.runId,
      mode: "rehash",
      governance: args.governance,
      ship: false,
      publish: false,
      toolVersion,
      manifestSha,
    });

    writeLedgerOnly(runDirAbs, receipt);

    const runDirRel = path.relative(repoRoot, runDirAbs).split(path.sep).join("/");
    const payload = {
      ok: true,
      mode: "rehash",
      run_id: args.runId,
      run_dir: runDirRel,
      bundle: null,
      manifest_sha256: `sha256:${manifestSha}`,
      tool_version: toolVersion,
    };

    if (args.notionRunlog) {
      payload.notion_runlog = buildNotionRunlog({
        runId: args.runId,
        runDirRel,
        objective: meta.objective,
        outputRel: null,
        manifestSha,
      });
    }

    printOneLineJson(payload);
    return;
  }

  // Ship-only mode against an existing run.
  if (args.runId && (args.ship || args.publish) && !args.tag && !args.objective) {
    const runDirAbs = path.join(runsRootAbs, args.runId);
    if (!fs.existsSync(runDirAbs) || !fs.statSync(runDirAbs).isDirectory()) {
      die(`Run directory not found: ${path.relative(repoRoot, runDirAbs)}`);
    }

    const req = safeReadJson(path.join(runDirAbs, "00_intake", "request.json"));
    const meta = {
      run_id: args.runId,
      created_at_utc: typeof req?.created_at_utc === "string" ? req.created_at_utc : new Date().toISOString(),
      tag: typeof req?.tag === "string" ? req.tag : null,
      objective: typeof req?.objective === "string" ? req.objective : null,
      governance: typeof req?.governance === "string" ? req.governance : args.governance,
    };

    const manifestSha = readRunManifestSha256Hex(runDirAbs);

    // Enforce governance shipping rules.
    const effectiveGovernance = governanceLevel(meta.governance) < 3 ? "G3" : meta.governance;
    assertShipAllowed({ runDirAbs, governance: effectiveGovernance, manifestSha256Hex: manifestSha });

    const runDirRel = path.relative(repoRoot, runDirAbs).split(path.sep).join("/");
    const payload = {
      ok: true,
      mode: args.publish ? "publish" : "ship",
      run_id: args.runId,
      run_dir: runDirRel,
      manifest_sha256: `sha256:${manifestSha}`,
      tool_version: toolVersion,
    };

    if (args.notionRunlog) {
      payload.notion_runlog = buildNotionRunlog({
        runId: args.runId,
        runDirRel,
        objective: meta.objective,
        outputRel: null,
        manifestSha,
      });
    }

    printOneLineJson(payload);
    return;
  }

  const now = args.nowIso ? new Date(args.nowIso) : new Date();
  if (Number.isNaN(now.getTime())) die("Invalid --now (must be parseable date/ISO)");

  const { yyyymmdd, hhmmss } = fmtEtParts(now);

  const seqNum = args.seq ? Number(args.seq) : nextSeq(runsRootAbs, yyyymmdd, args.tag);
  if (!Number.isFinite(seqNum) || seqNum <= 0) die("Invalid --seq");

  const runId = args.runId || `RUN-${yyyymmdd}-${hhmmss}-ET-${args.tag}-${zpad3(seqNum)}`;
  const runDirAbs = path.join(runsRootAbs, runId);

  if (fs.existsSync(runDirAbs)) die(`Run directory already exists: ${path.relative(repoRoot, runDirAbs)}`);

  // Folder tree
  const dirs = [
    "00_intake",
    "01_research",
    "02_work",
    "03_outputs",
    "04_audit",
    "05_hash",
    "06_diff",
    "07_publish",
  ];
  for (const d of dirs) ensureDir(path.join(runDirAbs, d));

  // Minimal intake + audit scaffold
  const requestObj = {
    run_id: runId,
    created_at_utc: new Date().toISOString(),
    timezone: "America/New_York",
    tag: args.tag,
    objective: args.objective,
    governance: args.governance,
    ship_requested: args.ship || args.publish,
    assumptions: [],
    constraints: [],
  };

  writeJson(path.join(runDirAbs, "00_intake", "request.json"), requestObj);
  writeUtf8(path.join(runDirAbs, "00_intake", "objective.txt"), args.objective + "\n");
  writeUtf8(
    path.join(runDirAbs, "00_intake", "assumptions.md"),
    "# Assumptions\n\n- (Assumption)\n",
  );
  writeJson(path.join(runDirAbs, "00_intake", "assumptions.json"), { assumptions: [] });

  writeUtf8(
    path.join(runDirAbs, "00_intake", "constraints.md"),
    "# Constraints\n\n- (Constraint)\n",
  );
  writeJson(path.join(runDirAbs, "00_intake", "constraints.json"), { constraints: [] });

  writeUtf8(
    path.join(runDirAbs, "04_audit", "run_log.md"),
    `# Run Log\n\n- Run ID: ${runId}\n- Created (UTC): ${new Date().toISOString()}\n- Tag: ${args.tag}\n- Objective: ${args.objective}\n`,
  );

  // Governance: verification checklist required for G2+
  if (governanceLevel(args.governance) >= 2) {
    const checklist = {
      schemaVersion: 1,
      run_id: runId,
      governance: args.governance,
      completed: false,
      items: [
        "Verify ledger.jsonl passes verify-run.js",
        "Review outputs and hash manifest",
        "Confirm constraints and assumptions are complete",
      ],
      note: "Set completed=true only after checklist is satisfied.",
    };
    writeUtf8(
      path.join(runDirAbs, "04_audit", "verification_checklist.json"),
      JSON.stringify(checklist, null, 2) + "\n",
    );
  }

  // actions.jsonl is the operator-facing append-only spine for what happened (even if empty).
  writeUtf8(
    path.join(runDirAbs, "04_audit", "actions.jsonl"),
    JSON.stringify({ kind: "run_skeleton_created", run_id: runId, at_utc: new Date().toISOString() }) + "\n",
  );

  const manifest = computeRunManifest(runDirAbs, {
    run_id: runId,
    created_at_utc: requestObj.created_at_utc,
    tag: args.tag,
    objective: args.objective,
  });

  const manifestText = JSON.stringify(manifest, null, 2) + "\n";

  // approval.json placeholder is only required in G3, or if ship/publish is requested.
  const manifestSha = sha256Hex(Buffer.from(manifestText, "utf8"));
  const effectiveGovernance = (args.ship || args.publish) && governanceLevel(args.governance) < 3 ? "G3" : args.governance;
  if (governanceLevel(effectiveGovernance) >= 3) {
    const approval = {
      schemaVersion: 1,
      run_id: runId,
      manifest_sha256: `sha256:${manifestSha}`,
      approved: false,
      approved_by: null,
      approved_at_utc: null,
      note: "Set approved=true only after human review of outputs and hashes.",
    };
    writeUtf8(path.join(runDirAbs, "05_hash", "approval.json"), JSON.stringify(approval, null, 2) + "\n");
  }

  const receipt = buildCommandReceipt({
    runId,
    mode: "create",
    governance: args.governance,
    ship: args.ship,
    publish: args.publish,
    toolVersion,
    manifestSha,
  });

  const { manifestSha: manifestSha2 } = writeHashesAndLedger(runDirAbs, manifest, manifestText, {
    manifestSha,
    receipt,
  });

  // Bundle zip
  const zipName = `${runId}__BUNDLE__v01.zip`;
  const zipRel = `07_publish/${zipName}`;
  const zipAbs = path.join(runDirAbs, "07_publish", zipName);

  // Exclude the zip itself (it doesn't exist yet, but keep the rule explicit)
  const exclude = new Set([zipRel]);
  const zipAttempt = await tryWriteZip(zipAbs, runDirAbs, exclude);

  if (zipAttempt.ok) {
    const zipSha = sha256FileHex(zipAbs);
    writeUtf8(path.join(runDirAbs, "07_publish", "bundle.sha256"), `sha256:${zipSha}\n`);
    writeUtf8(
      path.join(runDirAbs, "07_publish", "distribution_log.md"),
      `# Distribution Log\n\n- Bundle: ${zipName}\n- SHA256: sha256:${zipSha}\n- Created (UTC): ${new Date().toISOString()}\n`,
    );
  } else {
    // Deterministic fallback list: what would have been bundled (POSIX paths, sorted)
    const list = listFilesRec(runDirAbs)
      .map((abs) => stablePosixRel(runDirAbs, abs))
      .filter((rel) => !exclude.has(rel))
      .sort((a, b) => a.localeCompare(b));

    writeUtf8(path.join(runDirAbs, "07_publish", ".zip_list.txt"), list.join("\n") + "\n");
    writeUtf8(
      path.join(runDirAbs, "07_publish", "distribution_log.md"),
      `# Distribution Log\n\n- Bundle: (not created)\n- Reason: ${zipAttempt.reason}\n- Created (UTC): ${new Date().toISOString()}\n`,
    );
  }

  const runDirRel = path.relative(repoRoot, runDirAbs).split(path.sep).join("/");
  const outputRel = zipAttempt.ok ? zipRel : "07_publish/.zip_list.txt";
  const payload = {
    ok: true,
    mode: "create",
    run_id: runId,
    run_dir: runDirRel,
    bundle: zipAttempt.ok ? zipRel : null,
    manifest_sha256: `sha256:${manifestSha2}`,
    output: outputRel,
    tool_version: toolVersion,
  };

  if (args.notionRunlog) {
    payload.notion_runlog = buildNotionRunlog({
      runId,
      runDirRel,
      objective: args.objective,
      outputRel: zipAttempt.ok ? zipRel : `${runDirRel}/07_publish/.zip_list.txt`,
      manifestSha: manifestSha2,
    });
  }

  // If ship/publish was requested during creation, enforce approve-by-hash and hard-fail.
  if (args.ship || args.publish) {
    assertShipAllowed({ runDirAbs, governance: effectiveGovernance, manifestSha256Hex: manifestSha2 });
    payload.ship = { ok: true, mode: args.publish ? "publish" : "ship" };
  }

  printOneLineJson(payload);
}

main().catch((e) => {
  die(e instanceof Error ? e.message : String(e));
});

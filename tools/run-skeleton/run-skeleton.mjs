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
    --seq <NNN>           (override sequence)
    --now <ISO>           (override time; interpreted in ET formatting only)
*/

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

function die(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

function usage() {
  die(
    "Usage: node tools/run-skeleton/run-skeleton.mjs --tag <SHORTTAG> --objective <text> [--runs-root <path>] [--seq <NNN>] [--now <ISO>]",
  );
}

function parseArgs(argv) {
  const out = {
    tag: null,
    objective: null,
    runsRoot: "runs",
    seq: null,
    nowIso: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
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

  if (!out.tag || !out.objective) usage();

  // Normalize tag to safe filesystem token.
  out.tag = out.tag.toUpperCase().replace(/[^A-Z0-9_\-]/g, "-");
  if (!out.tag || out.tag.length < 2) die("Invalid --tag (must contain A-Z/0-9/_/-)");

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

  const now = args.nowIso ? new Date(args.nowIso) : new Date();
  if (Number.isNaN(now.getTime())) die("Invalid --now (must be parseable date/ISO)");

  const { yyyymmdd, hhmmss } = fmtEtParts(now);

  const repoRoot = process.cwd();
  const runsRootAbs = path.resolve(repoRoot, args.runsRoot);
  ensureDir(runsRootAbs);

  const seqNum = args.seq ? Number(args.seq) : nextSeq(runsRootAbs, yyyymmdd, args.tag);
  if (!Number.isFinite(seqNum) || seqNum <= 0) die("Invalid --seq");

  const runId = `RUN-${yyyymmdd}-${hhmmss}-ET-${args.tag}-${zpad3(seqNum)}`;
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

  // actions.jsonl is the operator-facing append-only spine for what happened (even if empty).
  writeUtf8(
    path.join(runDirAbs, "04_audit", "actions.jsonl"),
    JSON.stringify({ kind: "run_skeleton_created", run_id: runId, at_utc: new Date().toISOString() }) + "\n",
  );

  // Build a manifest of *files we created so far* (excluding the final bundle zip and its sha file)
  const createdFilesAbs = listFilesRec(runDirAbs);
  const createdFilesRel = createdFilesAbs
    .map((abs) => stablePosixRel(runDirAbs, abs))
    .filter((rel) => !rel.startsWith("07_publish/"))
    .sort((a, b) => a.localeCompare(b));

  const manifest = {
    schemaVersion: 1,
    run_id: runId,
    created_at_utc: requestObj.created_at_utc,
    tag: args.tag,
    objective: args.objective,
    files: createdFilesRel.map((rel) => {
      const abs = path.join(runDirAbs, rel.split("/").join(path.sep));
      return { path: rel, sha256: `sha256:${sha256FileHex(abs)}` };
    }),
  };

  const manifestText = JSON.stringify(manifest, null, 2) + "\n";
  writeUtf8(path.join(runDirAbs, "05_hash", "manifest.json"), manifestText);
  writeUtf8(path.join(runDirAbs, "manifest.json"), manifestText);

  // sha256.txt (simple, operator-friendly)
  const shaLines = manifest.files.map((f) => `${f.sha256.replace(/^sha256:/, "")}  ${f.path}`);
  writeUtf8(path.join(runDirAbs, "05_hash", "sha256.txt"), shaLines.join("\n") + "\n");

  // approval.json placeholder binds approval to manifest hash
  const manifestSha = sha256Hex(Buffer.from(manifestText, "utf8"));
  writeUtf8(path.join(runDirAbs, "05_hash", "manifest_sha256.txt"), `sha256:${manifestSha}\n`);
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

  // ledger.jsonl (hash chain) — verifier expects this at the run root.
  // Only hash files that exist; exclude the bundle directory and the ledger itself.
  const chainRels = listFilesRec(runDirAbs)
    .map((abs) => stablePosixRel(runDirAbs, abs))
    .filter((rel) => !rel.startsWith("07_publish/"))
    .filter((rel) => rel !== "ledger.jsonl")
    .sort((a, b) => a.localeCompare(b));

  const groupHead = { kind: "hash_chain_group", name: "run_skeleton_v1", head: null, at_utc: new Date().toISOString() };
  const chainEntries = computeHashChainEntries(runDirAbs, chainRels);

  // Patch group head to match the final head (or null if empty)
  const lastHead = chainEntries.length ? chainEntries[chainEntries.length - 1].head : null;
  groupHead.head = lastHead;

  const ledgerLines = [JSON.stringify(groupHead), ...chainEntries.map((e) => JSON.stringify(e))].join("\n") + "\n";
  writeUtf8(path.join(runDirAbs, "ledger.jsonl"), ledgerLines);

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

  process.stdout.write(`${path.relative(repoRoot, runDirAbs)}\n`);
  if (zipAttempt.ok) process.stdout.write(`${zipRel}\n`);
}

main().catch((e) => {
  die(e instanceof Error ? e.message : String(e));
});

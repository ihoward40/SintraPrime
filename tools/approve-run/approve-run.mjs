#!/usr/bin/env node
/*
  approve-run.mjs

  Purpose:
    Standardize approve-by-hash for SintraPrime runs.

  Contract:
    - Success: single-line JSON
    - Failure: single-line JSON
    - Only --help/-h and --version print human-readable output (exit 0)

  Behavior:
    - Reads manifest hash from 05_hash/manifest_sha256.txt (preferred), else sha256(05_hash/manifest.json)
    - Writes 05_hash/approval.json with approved:true bound to that manifest hash
    - Optionally rehashes the run ledger (default: yes) so verify-run remains green
*/

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

let OUTPUT_JSON = true;

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function parseManifestSha256Text(text) {
  const t = String(text || "").trim();
  const m = t.match(/^sha256:([0-9a-f]{64})$/i);
  return m ? m[1].toLowerCase() : null;
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

function helpText() {
  return (
    "Usage:\n" +
    "  node tools/approve-run/approve-run.mjs --run-id <RUN_ID> --by <name> [--note <text>] [--runs-root <path>] [--no-rehash]\n" +
    "  node tools/approve-run/approve-run.mjs --help|-h\n" +
    "  node tools/approve-run/approve-run.mjs --version\n" +
    "\nNotes:\n" +
    "  - Reads manifest hash from 05_hash/manifest_sha256.txt (preferred), else hashes 05_hash/manifest.json.\n" +
    "  - Writes 05_hash/approval.json with approved:true bound to that manifest hash.\n" +
    "  - By default, rehashes ledger.jsonl via run-skeleton --rehash so verify-run stays green.\n"
  );
}

function printJsonLine(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function die(msg, extra) {
  if (OUTPUT_JSON) {
    printJsonLine({ ok: false, error: String(msg), ...(extra && typeof extra === "object" ? extra : null) });
  }
  // In JSON mode, do not emit human-readable stderr noise.
  if (!OUTPUT_JSON) {
    process.stderr.write(`Error: ${msg}\n`);
  }
  process.exit(1);
}

function parseArgs(argv) {
  const out = {
    runId: null,
    runsRoot: "runs",
    by: null,
    note: null,
    rehash: true,
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

    if (a === "--run-id" && argv[i + 1]) {
      out.runId = String(argv[++i]).trim();
      continue;
    }
    if (a === "--runs-root" && argv[i + 1]) {
      out.runsRoot = String(argv[++i]).trim();
      continue;
    }
    if (a === "--by" && argv[i + 1]) {
      out.by = String(argv[++i]).trim();
      continue;
    }
    if (a === "--note" && argv[i + 1]) {
      out.note = String(argv[++i]).trim();
      continue;
    }
    if (a === "--no-rehash") {
      out.rehash = false;
      continue;
    }

    die(helpText());
  }

  if (out.help) {
    OUTPUT_JSON = false;
    process.stdout.write(helpText());
    process.exit(0);
  }

  return out;
}

function readManifestSha256Hex(runDirAbs) {
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

  return sha256Hex(fs.readFileSync(manifestPath));
}

function writeApproval(runDirAbs, runId, manifestShaHex, by, note, toolVersion) {
  const approvalDir = path.join(runDirAbs, "05_hash");
  fs.mkdirSync(approvalDir, { recursive: true });

  const approvalPath = path.join(approvalDir, "approval.json");
  const now = new Date().toISOString();

  const approval = {
    schemaVersion: 1,
    run_id: runId,
    manifest_sha256: `sha256:${manifestShaHex}`,
    approved: true,
    approved_by: by,
    approved_at_utc: now,
    approval_note: note || null,
    tool: { name: "approve-run", version: toolVersion },
  };

  fs.writeFileSync(approvalPath, JSON.stringify(approval, null, 2) + "\n", "utf8");
  return approvalPath;
}

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: "utf8" });
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const repoRoot = process.cwd();
  const toolVersion = readToolVersion(repoRoot);

  if (args.version) {
    OUTPUT_JSON = false;
    process.stdout.write(`approve-run ${toolVersion}\n`);
    process.exit(0);
  }

  if (!args.runId || !args.by) {
    die("Missing required --run-id and/or --by");
  }

  const m = args.runId.match(/^RUN-\d{8}-\d{6}-ET-[A-Z0-9_-]{2,}-\d{3}$/);
  if (!m) die("Invalid --run-id (expected RUN-YYYYMMDD-HHMMSS-ET-TAG-NNN)");

  const runDirAbs = path.resolve(repoRoot, args.runsRoot, args.runId);
  if (!fs.existsSync(runDirAbs) || !fs.statSync(runDirAbs).isDirectory()) {
    die(`Run directory not found: ${path.relative(repoRoot, runDirAbs)}`);
  }

  const manifestShaHex = readManifestSha256Hex(runDirAbs);
  const approvalPath = writeApproval(runDirAbs, args.runId, manifestShaHex, args.by, args.note, toolVersion);

  let rehashResult = null;
  if (args.rehash) {
    const r = run("node", [
      "tools/run-skeleton/run-skeleton.mjs",
      "--rehash",
      "--run-id",
      args.runId,
      "--runs-root",
      args.runsRoot,
    ]);

    if (r.status !== 0) {
      die("Rehash failed after writing approval.json", {
        approval_json: path.relative(repoRoot, approvalPath).split(path.sep).join("/"),
        rehash_stdout: r.stdout || "",
        rehash_stderr: r.stderr || "",
      });
    }

    try {
      rehashResult = JSON.parse(String(r.stdout || "").trim());
    } catch {
      rehashResult = { ok: false, error: "rehash_output_not_json", raw: String(r.stdout || "") };
    }
  }

  printJsonLine({
    ok: true,
    run_id: args.runId,
    run_dir: path.relative(repoRoot, runDirAbs).split(path.sep).join("/"),
    manifest_sha256: `sha256:${manifestShaHex}`,
    approval_json: path.relative(repoRoot, approvalPath).split(path.sep).join("/"),
    tool_version: toolVersion,
    rehash: rehashResult,
  });
}

try {
  main();
} catch (e) {
  die(e instanceof Error ? e.message : String(e));
}

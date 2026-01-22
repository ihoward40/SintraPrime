#!/usr/bin/env node
/*
  agent.mjs

  End-to-end Agent Wrapper

  Implements:
    - routes request -> playbook (tools/router/router.mjs)
    - creates run via run-skeleton (tools/run-skeleton/run-skeleton.mjs)
    - composes bundle (tools/bundle-compose/bundle-compose.mjs)
    - rehashes (run-skeleton --rehash)
    - emits single-line JSON including Notion-ready run log (JSON + Markdown)
    - if G3 + --ship/--publish requested: blocks until approve-by-hash is satisfied,
      then executes ship/publish through run-skeleton

  Contract:
    - Success: single-line JSON
    - Failure: single-line JSON
    - Only --help/-h and --version print human-readable output (exit 0)
*/

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { emitOneLineJSON } from "./emit-jsonl.mjs";

let OUTPUT_JSON = true;

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
    "  node tools/agent/agent.mjs --text <request> [--governance G1|G2|G3] [--runs-root <path>] [--timeout-sec <n>] [--ship|--publish]\n" +
    "  node tools/agent/agent.mjs --help|-h\n" +
    "  node tools/agent/agent.mjs --version\n" +
    "\nNotes:\n" +
    "  - Outputs exactly one JSON line on success/failure (except --help/--version).\n" +
    "  - If --ship/--publish is set, effective governance is treated as G3.\n"
  );
}

function die(msg, extra) {
  if (OUTPUT_JSON) {
    emitOneLineJSON({ ok: false, error: String(msg), ...(extra && typeof extra === "object" ? extra : {}) });
  } else {
    process.stderr.write(`Error: ${msg}\n`);
  }
  process.exit(1);
}

function parseArgs(argv) {
  const out = {
    text: null,
    governance: null,
    runsRoot: "runs",
    timeoutSec: 0,
    ship: false,
    publish: false,
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
    if (a === "--text" && argv[i + 1]) {
      out.text = String(argv[++i]);
      continue;
    }
    if (a === "--governance" && argv[i + 1]) {
      out.governance = String(argv[++i]).trim().toUpperCase();
      continue;
    }
    if (a === "--runs-root" && argv[i + 1]) {
      out.runsRoot = String(argv[++i]).trim();
      continue;
    }
    if (a === "--timeout-sec" && argv[i + 1]) {
      out.timeoutSec = Number(argv[++i]);
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

    die(helpText());
  }

  if (out.help) {
    OUTPUT_JSON = false;
    process.stdout.write(helpText());
    process.exit(0);
  }

  if (out.version) {
    OUTPUT_JSON = false;
    return out;
  }

  if (!out.text || !String(out.text).trim()) die("Missing --text");
  if (out.ship && out.publish) die("Do not combine --ship and --publish");
  if (out.governance && !/^G[123]$/.test(out.governance)) die("Invalid --governance (expected G1, G2, or G3)");

  return out;
}

function runNodeJsonLine({ repoRootAbs, scriptRel, args, stage }) {
  const scriptAbs = path.join(repoRootAbs, scriptRel);
  const cmdArgs = [scriptAbs, ...args];

  const res = spawnSync(process.execPath, cmdArgs, {
    cwd: repoRootAbs,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const out = String(res.stdout || "").trim();
  if (!out) {
    throw new Error(`${stage}: no stdout JSON produced`);
  }

  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    throw new Error(`${stage}: stdout was not valid JSON`);
  }

  if (res.status !== 0 || !parsed || parsed.ok !== true) {
    const err = parsed && typeof parsed.error === "string" ? parsed.error : `exit ${res.status}`;
    throw new Error(`${stage}: ${err}`);
  }

  return parsed;
}

function parseManifestSha256Text(text) {
  const t = String(text || "").trim();
  const m = t.match(/^sha256:([0-9a-f]{64})$/i);
  return m ? m[1].toLowerCase() : null;
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function readStableManifestSha256Hex(runDirAbs) {
  const txtPath = path.join(runDirAbs, "05_hash", "manifest_sha256.txt");
  if (fs.existsSync(txtPath)) {
    const parsed = parseManifestSha256Text(fs.readFileSync(txtPath, "utf8"));
    if (parsed) return parsed;
  }

  const manifestPath = path.join(runDirAbs, "05_hash", "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  return sha256Hex(fs.readFileSync(manifestPath));
}

function readApproval(runDirAbs) {
  const approvalPath = path.join(runDirAbs, "05_hash", "approval.json");
  if (!fs.existsSync(approvalPath)) return { ok: false, reason: "missing" };

  let obj;
  try {
    obj = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  return { ok: true, approval: obj };
}

function sleepMs(ms) {
  const i32 = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(i32, 0, 0, Math.max(0, ms | 0));
}

function waitForApproval({ runDirAbs, manifestSha256Hex, timeoutSec }) {
  const start = Date.now();
  const timeoutMs = Number.isFinite(timeoutSec) && timeoutSec > 0 ? timeoutSec * 1000 : 0;

  while (true) {
    const r = readApproval(runDirAbs);
    if (r.ok) {
      const a = r.approval;
      const approved = a?.approved === true;
      const sha = parseManifestSha256Text(a?.manifest_sha256);
      if (approved && sha === manifestSha256Hex) {
        return {
          ok: true,
          waited_ms: Date.now() - start,
          approved_by: a?.approved_by ?? null,
          approved_at_utc: a?.approved_at_utc ?? null,
        };
      }
    }

    if (timeoutMs && Date.now() - start >= timeoutMs) {
      return { ok: false, waited_ms: Date.now() - start, reason: "timeout" };
    }

    sleepMs(2000);
  }
}

async function main() {
  const repoRootAbs = process.cwd();
  const toolVersion = readToolVersion(repoRootAbs);

  const args = parseArgs(process.argv.slice(2));

  if (args.version) {
    process.stdout.write(`agent ${toolVersion}\n`);
    process.exit(0);
  }

  const route = runNodeJsonLine({
    repoRootAbs,
    scriptRel: "tools/router/router.mjs",
    args: ["--text", args.text, ...(args.governance ? ["--governance", args.governance] : [])],
    stage: "route",
  });

  const effectiveGovernance = (args.ship || args.publish) ? "G3" : (args.governance || route.governance || "G1");
  if (!/^G[123]$/.test(effectiveGovernance)) die("Invalid effective governance");

  const objective = String(args.text).trim();
  const tag = String(route.tag || "AGENT").trim();

  const create = runNodeJsonLine({
    repoRootAbs,
    scriptRel: "tools/run-skeleton/run-skeleton.mjs",
    args: [
      "--tag", tag,
      "--objective", objective,
      "--governance", effectiveGovernance,
      "--runs-root", args.runsRoot,
      "--notion-runlog",
      ...(args.ship ? ["--ship"] : []),
      ...(args.publish ? ["--publish"] : []),
    ],
    stage: "create",
  });

  const runId = create.run_id;
  const runDirRel = create.run_dir;
  const runDirAbs = path.join(repoRootAbs, runDirRel);

  const bundle = runNodeJsonLine({
    repoRootAbs,
    scriptRel: "tools/bundle-compose/bundle-compose.mjs",
    args: ["--run-id", runId, "--runs-root", args.runsRoot],
    stage: "bundle",
  });

  const rehash = runNodeJsonLine({
    repoRootAbs,
    scriptRel: "tools/run-skeleton/run-skeleton.mjs",
    args: ["--rehash", "--run-id", runId, "--runs-root", args.runsRoot, "--notion-runlog"],
    stage: "rehash",
  });

  const payload = {
    ok: true,
    kind: "AgentWrapperResult",
    route,
    create,
    bundle,
    rehash,
    run_id: runId,
    run_dir: runDirRel,
    manifest_sha256: rehash.manifest_sha256 || create.manifest_sha256,
    tool_version: toolVersion,
    notion_runlog: rehash.notion_runlog || create.notion_runlog || null,
  };

  if (args.ship || args.publish) {
    const manifestHex = readStableManifestSha256Hex(runDirAbs);
    if (!manifestHex) {
      die("Missing stable manifest hash (05_hash/manifest_sha256.txt or 05_hash/manifest.json)");
    }

    const wait = waitForApproval({ runDirAbs, manifestSha256Hex: manifestHex, timeoutSec: args.timeoutSec });
    if (!wait.ok) {
      die("Approval wait failed", { stage: "approval_wait", wait });
    }

    const ship = runNodeJsonLine({
      repoRootAbs,
      scriptRel: "tools/run-skeleton/run-skeleton.mjs",
      args: [
        ...(args.publish ? ["--publish"] : ["--ship"]),
        "--run-id", runId,
        "--runs-root", args.runsRoot,
        "--notion-runlog",
      ],
      stage: args.publish ? "publish" : "ship",
    });

    payload.approval_wait = wait;
    payload.ship = ship;
  }

  emitOneLineJSON(payload);
}

main().catch((e) => {
  die(e instanceof Error ? e.message : String(e));
});

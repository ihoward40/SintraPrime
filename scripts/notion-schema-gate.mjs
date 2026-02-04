import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function nowIso() {
  return new Date().toISOString();
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function parseArgs(argv) {
  const out = {
    dryRun: false,
    cap: 50,
    baselinePath: null,
    currentPath: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--cap") {
      out.cap = Number(argv[i + 1] || "50");
      i++;
    } else if (a === "--baseline") {
      out.baselinePath = argv[i + 1] || null;
      i++;
    } else if (a === "--current") {
      out.currentPath = argv[i + 1] || null;
      i++;
    }
  }

  if (!Number.isFinite(out.cap) || out.cap < 1) out.cap = 50;
  return out;
}

function stableStringify(value) {
  // Canonical-ish JSON: recursively sort object keys.
  // Detect only *true* cycles using an ancestor set (allow repeated references).
  const ancestors = new WeakSet();
  const normalize = (v) => {
    if (v === null || v === undefined) return v;
    if (typeof v !== "object") return v;
    if (ancestors.has(v)) throw new Error("stableStringify: circular structure");

    ancestors.add(v);
    try {
      if (Array.isArray(v)) return v.map(normalize);
      const out = {};
      for (const k of Object.keys(v).sort((a, b) => a.localeCompare(b))) {
        out[k] = normalize(v[k]);
      }
      return out;
    } finally {
      ancestors.delete(v);
    }
  };
  return JSON.stringify(normalize(value));
}

function runLintJson({ baselinePath, currentPath }) {
  const repoRoot = path.resolve(process.cwd());
  const lintPath = path.resolve(repoRoot, "scripts", "notion-schema-lint.mjs");

  const args = [lintPath, "--json", "--strict"];
  if (baselinePath) args.push("--baseline", baselinePath);
  if (currentPath) args.push("--current", currentPath);

  const result = spawnSync("node", args, { encoding: "utf8" });

  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();

  let parsed = null;
  try {
    parsed = stdout ? JSON.parse(stdout) : null;
  } catch {
    parsed = null;
  }

  return { code: typeof result.status === "number" ? result.status : 1, parsed, stdout, stderr };
}

function runGateDoctor() {
  const repoRoot = path.resolve(process.cwd());
  const doctorPath = path.resolve(repoRoot, "scripts", "notion-gate-doctor.mjs");
  const result = spawnSync("node", [doctorPath], { encoding: "utf8" });
  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();
  return {
    code: typeof result.status === "number" ? result.status : 1,
    stdout,
    stderr,
  };
}

function indexDbFingerprints(list) {
  const map = {};
  for (const x of Array.isArray(list) ? list : []) {
    const id = x?.databaseId;
    if (!id) continue;
    map[id] = x?.fingerprint || null;
  }
  return map;
}

function summarizeDrift(drift, cap = 50) {
  const dbs = Array.isArray(drift?.diff?.databases) ? drift.diff.databases : [];

  const affectedDbIds = [];
  const flat = [];

  for (const db of dbs) {
    const dbId = db?.databaseId || null;
    if (!dbId) continue;
    affectedDbIds.push(dbId);

    const changes = Array.isArray(db?.changes) ? db.changes : [];
    for (const c of changes) flat.push({ databaseId: dbId, ...c });
  }

  const uniqueDbIds = Array.from(new Set(affectedDbIds));

  const baseDbFp = indexDbFingerprints(drift?.baseline?.databases);
  const curDbFp = indexDbFingerprints(drift?.current?.databases);

  const affectedDbFingerprints = {};
  for (const id of uniqueDbIds) {
    affectedDbFingerprints[id] = {
      baseline: baseDbFp[id] || null,
      current: curDbFp[id] || null,
    };
  }

  const sampleChanges = flat.slice(0, cap);
  const truncated = flat.length > cap;

  return {
    affectedDbIds: uniqueDbIds,
    affectedDbFingerprints,
    counts: drift?.diff?.counts || null,
    sampleChanges,
    truncated,
    cap,
    totalChanges: flat.length,
  };
}

function computeReceiptFingerprint(receipt) {
  return sha256Hex(Buffer.from(stableStringify(receipt), "utf8"));
}

function initBlockedRunDir() {
  const runsDir = path.resolve(process.cwd(), "runs");
  const runId = `blocked_schema_drift_${Date.now()}`;
  const outDir = path.join(runsDir, runId);
  ensureDir(outDir);
  return { runId, outDir };
}

function capText(s, maxLen) {
  if (typeof s !== "string") return s;
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + `…(truncated:${s.length})`;
}

function writeBlockedReceipt({ runId, outDir, stamp, driftSummary, flipResult }) {
  if (!runId || !outDir) throw new Error("writeBlockedReceipt: missing runId/outDir");

  const githubRunId = process.env.GITHUB_RUN_ID || null;
  const githubRepo = process.env.GITHUB_REPOSITORY || null;
  const githubServer = process.env.GITHUB_SERVER_URL || null;
  const runUrl = githubRunId && githubRepo && githubServer ? `${githubServer}/${githubRepo}/actions/runs/${githubRunId}` : null;

  const receiptCore = {
    kind: "BlockedRunReceipt",
    schema_version: "blocked.schema-drift@1",
    ts: nowIso(),
    reason: "Notion schema drift detected; execution blocked (fail-closed).",
    block_kind: "schema_drift",
    stamp,
    drift_summary: driftSummary,
    ci: {
      github_run_id: githubRunId,
      github_sha: process.env.GITHUB_SHA || null,
      github_ref: process.env.GITHUB_REF || null,
      github_workflow: process.env.GITHUB_WORKFLOW || null,
      github_run_url: runUrl,
    },
    notion_gate_flip: flipResult || { flipped: false, reason: "not_attempted" },
  };

  const receipt = {
    ...receiptCore,
    fingerprint: computeReceiptFingerprint(receiptCore),
  };

  fs.writeFileSync(path.join(outDir, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n", "utf8");
  return { runId, outDir };
}

async function maybeFlipNotionGate({ drift, runId }) {
  if (process.env.NOTION_SCHEMA_DRIFT_GATE_FLIP !== "1") return { flipped: false, reason: "disabled" };

  const token = process.env.NOTION_TOKEN;
  const gatePageId = process.env.NOTION_SCHEMA_DRIFT_GATE_PAGE_ID;
  if (!token || !gatePageId) {
    return { flipped: false, reason: "missing NOTION_TOKEN or NOTION_SCHEMA_DRIFT_GATE_PAGE_ID" };
  }

  // Safety: never attempt the flip unless the doctor is green.
  const doctor = runGateDoctor();
  if (doctor.code !== 0) {
    return {
      flipped: false,
      reason: "doctor_failed",
      doctor: {
        exit_code: doctor.code,
        stdout: doctor.stdout.slice(0, 4000),
        stderr: doctor.stderr.slice(0, 4000),
      },
    };
  }

  const baseUrl = String(process.env.NOTION_API_BASE || "https://api.notion.com").trim();
  const version = String(process.env.NOTION_API_VERSION || "2022-06-28").trim();

  const currentFp = drift?.current?.globalFingerprint || "unknown";
  const baselineFp = drift?.baseline?.globalFingerprint || "unknown";

  const body = {
    properties: {
      "Gate Status": { select: { name: "BLOCKED" } },
      "Gate Reason": { rich_text: [{ type: "text", text: { content: "Schema drift detected" } }] },
      "Gate Timestamp": { date: { start: nowIso() } },
      "Gate RunId": { rich_text: [{ type: "text", text: { content: String(runId) } }] },
      "Gate Fingerprint": {
        rich_text: [{ type: "text", text: { content: `${baselineFp} -> ${currentFp}` } }],
      },
    },
  };

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/pages/${encodeURIComponent(gatePageId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": version,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { flipped: false, reason: `http_${res.status}`, detail: text.slice(0, 2000) };
  }

  return { flipped: true };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { code, parsed, stdout, stderr } = runLintJson({ baselinePath: args.baselinePath, currentPath: args.currentPath });

  if (code === 0) {
    process.exit(0);
  }

  // Drift detected (intentional block).
  if (code === 2 && parsed && parsed.ok === false) {
    const summary = summarizeDrift(parsed, args.cap);

    const stamp = {
      schema_fingerprints: {
        baseline_global: parsed?.baseline?.globalFingerprint || null,
        current_global: parsed?.current?.globalFingerprint || null,
      },
      affected_db_ids: summary.affectedDbIds,
      affected_db_fingerprints: summary.affectedDbFingerprints,
      diff_summary: {
        counts: summary.counts,
        sample_changes: summary.sampleChanges,
        truncated: summary.truncated,
        cap: summary.cap,
        total_changes: summary.totalChanges,
      },
    };

    if (args.dryRun) {
      console.error("DRY-RUN: schema drift detected. Would block execution.");
      console.error(JSON.stringify(stamp, null, 2));
      console.error("DRY-RUN: would write BlockedRunReceipt under runs/ and (optionally) flip Notion gate.");
      process.exit(2);
    }

    const { runId, outDir } = initBlockedRunDir();
    const flipResult = await maybeFlipNotionGate({ drift: parsed, runId });

    // Write receipt with FINAL flip outcome (evidence-grade, deterministic).
    writeBlockedReceipt({ runId, outDir, stamp, driftSummary: parsed, flipResult });

    // Sidecars: keep them small and non-duplicative.
    try {
      if (flipResult?.doctor) {
        const doctorSidecar = {
          exit_code: flipResult.doctor.exit_code,
          stdout: capText(flipResult.doctor.stdout, 4000),
          stderr: capText(flipResult.doctor.stderr, 4000),
        };
        fs.writeFileSync(path.join(outDir, "notion_gate_doctor.json"), JSON.stringify(doctorSidecar, null, 2) + "\n", "utf8");
      }

      const flipSidecar = {
        flipped: !!flipResult?.flipped,
        reason: flipResult?.reason || null,
        detail: capText(flipResult?.detail || null, 2000),
      };
      fs.writeFileSync(path.join(outDir, "notion_gate_flip.json"), JSON.stringify(flipSidecar, null, 2) + "\n", "utf8");
    } catch {
      // ignore
    }

    console.error("SCHEMA DRIFT: execution blocked (see runs/ blocked receipt).");
    if (flipResult?.flipped) console.error("Notion drift gate flipped: BLOCKED");
    else if (process.env.NOTION_SCHEMA_DRIFT_GATE_FLIP === "1") {
      console.error(`Notion drift gate flip not performed: ${flipResult?.reason || "unknown"}`);
    }

    process.exit(2);
  }

  // Lint runtime/misconfig error.
  const msg = stderr || stdout || "Schema lint error";
  console.error(msg);
  process.exit(1);
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});

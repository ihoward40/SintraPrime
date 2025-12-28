import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { nowUtcIso, shouldRunNow } from "../scheduler/schedule.js";
import { recordRun } from "../scheduler/history.js";
import { readSchedulerHistory } from "../scheduler/readHistory.js";
import { writeSchedulerReceipt } from "../artifacts/writeSchedulerReceipt.js";
import { decisionTrace } from "../scheduler/decisionTrace.js";
import { runSchedulerExplain } from "./run-scheduler-explain.js";
import { schedulerExplain } from "./scheduler-explain.js";
import { writeSchedulerDecision } from "../scheduler/writeSchedulerDecision.js";
import { deriveFingerprint } from "../governor/runGovernor.js";

type SchedulerMode = "OFF" | "READ_ONLY_AUTONOMY" | "PROPOSE_ONLY_AUTONOMY" | "APPROVAL_GATED_AUTONOMY";

type JobBudgets = {
  max_steps: number;
  max_runtime_ms: number;
  max_runs_per_day: number;
};

type JobDefinition = {
  job_id: string;
  schedule: string;
  command: string;
  mode: SchedulerMode;
  budgets: JobBudgets;
  paused?: boolean;
};

function nowIso() {
  const fixed = process.env.SMOKE_FIXED_NOW_ISO;
  if (fixed && fixed.trim()) return fixed.trim();
  return nowUtcIso();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function getArgCommand() {
  const raw = process.argv.slice(2).join(" ").trim();
  if (!raw) throw new Error("Missing command argument");
  return raw;
}

function schedulerDir() {
  return path.join(process.cwd(), "runs", "scheduler");
}

function readJobsRegistry(): JobDefinition[] {
  const file = path.join(process.cwd(), "jobs", "registry.json");
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(json)) throw new Error("jobs/registry.json must be an array");
  return json as JobDefinition[];
}

function findJob(jobId: string): JobDefinition {
  const jobs = readJobsRegistry();
  const job = jobs.find((j) => j?.job_id === jobId);
  if (!job) throw new Error(`Unknown job_id '${jobId}'`);
  return job;
}

function runEngineCommand(command: string, env: NodeJS.ProcessEnv, timeoutMs: number) {
  const entry = path.join(process.cwd(), "src", "cli", "run-command.ts");
  const tsxBin = path.join(process.cwd(), "node_modules", ".bin", "tsx");
  const tsxNodeEntrypoint = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");

  const res = process.platform === "win32"
    ? spawnSync(process.execPath, [tsxNodeEntrypoint, entry, command], {
        env,
        encoding: "utf8",
        timeout: timeoutMs,
      })
    : spawnSync(tsxBin, [entry, command], {
        env,
        encoding: "utf8",
        timeout: timeoutMs,
      });

  if (res.error) {
    const anyErr: any = res.error;
    if (anyErr?.code === "ETIMEDOUT") {
      return {
        exitCode: 3,
        json: {
          kind: "PolicyDenied",
          code: "BUDGET_EXCEEDED",
          reason: `Job runtime exceeded ${timeoutMs}ms`,
        },
      };
    }
    throw new Error(res.error.message);
  }

  const stdout = String(res.stdout ?? "").trim();
  if (!stdout) {
    return { exitCode: res.status ?? 1, json: { kind: "CliError", code: "SCHEDULER_ENGINE_EMPTY", reason: "Engine produced no output" } };
  }

  let json: any = null;
  try {
    json = JSON.parse(stdout);
  } catch {
    json = { kind: "CliError", code: "SCHEDULER_ENGINE_NON_JSON", reason: stdout.slice(0, 240) };
  }

  return { exitCode: res.status ?? 0, json };
}

function parseSchedulerCommand(command: string): { kind: "SchedulerRun"; job_id?: string } | null {
  const trimmed = command.trim();
  const m = trimmed.match(/^\/scheduler\s+run(?:\s+(\S+))?\s*$/i);
  if (!m) return null;
  return { kind: "SchedulerRun", job_id: m[1] };
}

function parseSchedulerHistoryCommand(command: string):
  | { kind: "SchedulerHistory"; job_id?: string; limit?: number; since?: Date }
  | null {
  const trimmed = String(command ?? "").trim();
  if (!/^\/scheduler\s+history\b/i.test(trimmed)) return null;

  const tokens = trimmed.split(/\s+/).slice(2);
  let job_id: string | undefined;
  let limit: number | undefined;
  let since: Date | undefined;

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;

    if (t === "--limit") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /scheduler history [job_id] [--limit N] [--since ISO]");
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) throw new Error("--limit must be a positive number");
      limit = n;
      i += 1;
      continue;
    }

    if (t === "--since") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /scheduler history [job_id] [--limit N] [--since ISO]");
      const d = new Date(v);
      if (!Number.isFinite(d.getTime())) throw new Error("--since must be a valid ISO timestamp");
      since = d;
      i += 1;
      continue;
    }

    if (t.startsWith("--")) {
      throw new Error(`Unknown flag: ${t}`);
    }

    if (!job_id) {
      job_id = t;
      continue;
    }

    throw new Error("Usage: /scheduler history [job_id] [--limit N] [--since ISO]");
  }

  return { kind: "SchedulerHistory", job_id, limit, since };
}

function parseSchedulerExplainCommand(command: string):
  | { kind: "SchedulerExplain"; query: string; at?: Date }
  | null {
  const trimmed = String(command ?? "").trim();
  if (!/^\/scheduler\s+explain\b/i.test(trimmed)) return null;

  const tokens = trimmed.split(/\s+/).slice(2);
  const query = tokens[0];
  if (!query) throw new Error("Usage: /scheduler explain <job_id|execution_id> [--at <timestamp>]");

  let at: Date | undefined;
  for (let i = 1; i < tokens.length; i += 1) {
    const t = tokens[i]!;
    if (t === "--at") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /scheduler explain <job_id|execution_id> [--at <timestamp>]");
      const d = new Date(v);
      if (!Number.isFinite(d.getTime())) throw new Error("--at must be a valid ISO timestamp");
      at = d;
      i += 1;
      continue;
    }
    if (t.startsWith("--")) throw new Error(`Unknown flag: ${t}`);
    throw new Error("Usage: /scheduler explain <job_id|execution_id> [--at <timestamp>]");
  }

  return { kind: "SchedulerExplain", query, at };
}

export async function runScheduler(jobId?: string) {
  const jobs = readJobsRegistry();
  const selected = jobId ? jobs.filter((j) => j?.job_id === jobId) : jobs;

  const receipts: any[] = [];

  for (const job of selected) {
    // When running a specific job explicitly, treat it as a manual trigger.
    // When running the whole registry, only run jobs that are due now.
    if (!jobId && !shouldRunNow(job.schedule)) continue;

    const started_at = nowIso();
    const now = new Date(started_at);

    const trace = decisionTrace({
      job,
      at: now,
      manual_trigger: Boolean(jobId),
    });

    // Tier-13.5: write deterministic scheduler decision breadcrumbs.
    const fingerprint = deriveFingerprint({ command: job.command, domain_id: null });

    if (trace.scheduler_action === "SKIP") {
      const skipDecision =
        trace.primary_reason === "OUTSIDE_SCHEDULE"
          ? "SKIPPED_NOT_DUE"
          : trace.primary_reason === "DEDUP_ACTIVE"
            ? "SKIPPED_DEDUP"
            : "ERROR";

      writeSchedulerDecision({
        kind: "SchedulerDecision",
        decision: skipDecision,
        job_id: job.job_id,
        fingerprint,
        now: started_at,
        next_run_at: trace.next_eligible_at ?? undefined,
        dedup_hit: trace.primary_reason === "DEDUP_ACTIVE",
        message: `Scheduler skipped: ${trace.primary_reason}`,
        decided_at: started_at,
      });

      const skipped = {
        job_id: job.job_id,
        window_id: trace.window_id,
        skipped: true,
        reason: trace.primary_reason,
      };

      if (jobId) {
        console.log(JSON.stringify(skipped, null, 2));
        return;
      }

      receipts.push(skipped);
      continue;
    }

    // Delegate through the existing engine CLI; no executor shortcuts.
    // Budgets are enforced by policy (via env caps) rather than scheduler-side logic.
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      AUTONOMY_MODE: job.mode,
      POLICY_MAX_STEPS: String(job.budgets.max_steps),
      POLICY_MAX_RUNTIME_MS: String(job.budgets.max_runtime_ms),
      POLICY_MAX_RUNS_PER_DAY: String(job.budgets.max_runs_per_day),
      POLICY_BUDGET_DENY_CODE: "BUDGET_EXCEEDED",
    };

    let outcome: any;
    try {
      // Record that the scheduler attempted to run this job.
      writeSchedulerDecision({
        kind: "SchedulerDecision",
        decision: "SCHEDULED",
        job_id: job.job_id,
        fingerprint,
        now: started_at,
        scheduled_for: started_at,
        next_run_at: trace.next_eligible_at ?? undefined,
        decided_at: started_at,
      });

      const engineOut = runEngineCommand(job.command, env, job.budgets.max_runtime_ms);
      outcome = engineOut.json;
    } catch (err: any) {
      outcome = { kind: "SchedulerError", error: err?.message ? String(err.message) : String(err) };
    }

    recordRun({
      job_id: job.job_id,
      window_id: trace.window_id,
      started_at,
      outcome,
    });

    // Record post-outcome decision classification (receipts-only).
    try {
      const k = typeof outcome?.kind === "string" ? outcome.kind : "";
      const execution_id = typeof outcome?.execution_id === "string" ? outcome.execution_id : undefined;

      if (k === "PolicyDenied") {
        const code = typeof outcome?.code === "string" ? outcome.code : "UNKNOWN";
        const reason = typeof outcome?.reason === "string" ? outcome.reason : "";
        writeSchedulerDecision({
          kind: "SchedulerDecision",
          decision: "DENIED_POLICY",
          job_id: job.job_id,
          execution_id,
          fingerprint,
          now: started_at,
          policy: { code, reason },
          decided_at: started_at,
        });
      } else if (k === "Throttled") {
        const reason = typeof outcome?.reason === "string" ? outcome.reason : undefined;
        const retry_after = typeof outcome?.retry_after === "string" ? outcome.retry_after : undefined;
        writeSchedulerDecision({
          kind: "SchedulerDecision",
          decision: "THROTTLED_GOVERNOR",
          job_id: job.job_id,
          execution_id,
          fingerprint,
          now: started_at,
          governor: { decision: "DELAY", reason, retry_after },
          decided_at: started_at,
        });
      } else if (k === "ApprovalRequired" || k === "ApprovalRequiredBatch" || k === "NeedApprovalAgain") {
        const state_file = typeof outcome?.state_file === "string" ? outcome.state_file : "runs/approvals";
        const plan_hash = typeof outcome?.plan_hash === "string" ? outcome.plan_hash : undefined;
        writeSchedulerDecision({
          kind: "SchedulerDecision",
          decision: "PAUSED_APPROVAL",
          job_id: job.job_id,
          execution_id,
          fingerprint,
          now: started_at,
          approval: { status: "awaiting_approval", state_file, plan_hash },
          decided_at: started_at,
        });
      }
    } catch {
      // Never block scheduler runs on breadcrumb writes.
    }

    const receipt = writeSchedulerReceipt({
      job_id: job.job_id,
      schedule: job.schedule,
      window_id: trace.window_id,
      started_at,
      outcome,
    });
    receipts.push(receipt);

    // For explicit single-job runs, surface PolicyDenied directly (smoke expects exit 3).
    if (jobId && isRecord(outcome) && outcome.kind === "PolicyDenied") {
      console.log(JSON.stringify(outcome, null, 2));
      process.exitCode = 3;
      return;
    }
  }

  console.log(
    JSON.stringify(
      {
        kind: "SchedulerRunResult",
        ran: receipts.length,
        receipts,
      },
      null,
      2
    )
  );
}

async function main() {
  const cmd = getArgCommand();

  const parsedExplain = parseSchedulerExplainCommand(cmd);
  if (parsedExplain) {
    const query = parsedExplain.query;
    const at = parsedExplain.at ?? new Date(nowIso());

    let job: JobDefinition | null = null;
    try {
      job = findJob(query);
    } catch {
      job = null;
    }

    const decisionLookup = schedulerExplain(query);
    const traceOut = job ? runSchedulerExplain({ job, at }) : null;

    const found = Boolean(job) || decisionLookup.found;
    const out: any = {
      kind: "SchedulerExplain",
      query,
      found,
      ...(traceOut ?? {}),
    };

    if (decisionLookup.found) out.decision_record = decisionLookup.decision;
    if (!found && decisionLookup.hint) out.hint = decisionLookup.hint;

    console.log(JSON.stringify(out, null, 2));
    if (!found) process.exitCode = 2;
    return;
  }

  const parsedHistory = parseSchedulerHistoryCommand(cmd);
  if (parsedHistory) {
    const rows = readSchedulerHistory({
      job_id: parsedHistory.job_id,
      limit: parsedHistory.limit,
      since: parsedHistory.since,
    });

    console.log(JSON.stringify({ kind: "SchedulerHistory", count: rows.length, rows }, null, 2));
    return;
  }

  const parsed = parseSchedulerCommand(cmd);
  if (!parsed) throw new Error("Unknown scheduler command");

  if (parsed.job_id) {
    // validate job_id eagerly for good error messages
    findJob(parsed.job_id);
  }

  await runScheduler(parsed.job_id);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.log(JSON.stringify({ kind: "CliError", code: "SCHEDULER_ERROR", reason: msg }, null, 2));
  process.exitCode = 1;
});

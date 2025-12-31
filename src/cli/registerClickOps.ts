import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import YAML from "yaml";

import { WorkflowDefinitionSchema } from "../workflow/WorkflowDefinition.schema.js";
import {
  createWorkflowPlan,
  loadWorkflowPlanFromPath,
  runWorkflowFromPlan,
  type WorkflowRunOptions,
} from "../workflow/runWorkflow.js";
import { createClickOpsAuditBundle } from "../clickops/auditBundle.js";

const DEFAULT_LOCK_TTL_MINUTES = 60;
const MIN_LOCK_TTL_MINUTES = 5;
const MAX_LOCK_TTL_MINUTES = 6 * 60;

type AuditMode = true | "auto" | undefined;

type ClickOpsLockfile = {
  locked: boolean;
  owner: string | null;
  pid: number | null;
  started_at: string | null;
  spec: string | null;
  expires_at: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function formatRunIdSuffix(d: Date): string {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const y = d.getUTCFullYear();
  const mo = pad2(d.getUTCMonth() + 1);
  const da = pad2(d.getUTCDate());
  const h = pad2(d.getUTCHours());
  const mi = pad2(d.getUTCMinutes());
  const s = pad2(d.getUTCSeconds());
  return `${y}${mo}${da}-${h}${mi}${s}`;
}

function computeShortHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 6);
}

function parseLockTtlMinutes(raw: unknown): number {
  if (raw === null || typeof raw === "undefined" || raw === "") return DEFAULT_LOCK_TTL_MINUTES;
  const n = typeof raw === "number" ? raw : Number(String(raw));
  if (!Number.isFinite(n)) return DEFAULT_LOCK_TTL_MINUTES;
  const clamped = Math.max(MIN_LOCK_TTL_MINUTES, Math.min(MAX_LOCK_TTL_MINUTES, Math.floor(n)));
  return clamped;
}

function parseAuditMode(raw: unknown): AuditMode {
  if (raw === true) return true;
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (!v) return true;
    if (v === "auto") return "auto";
  }
  return undefined;
}

function safeRunDirPart(input: string): string {
  return String(input ?? "").replace(/[\\/<>:\"|?*\x00-\x1F]/g, "_").slice(0, 160);
}

function extractExecutionIdFromReceipt(receipt: any): string | null {
  if (!receipt || typeof receipt !== "object") return null;
  const id = (receipt as any).execution_id ?? (receipt as any).executionId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function lockfilePath() {
  return path.join(process.cwd(), "clickops.lockfile.json");
}

function readLockfileSync(): ClickOpsLockfile {
  try {
    const raw = fs.readFileSync(lockfilePath(), "utf8");
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") throw new Error("bad");
    return {
      locked: Boolean((obj as any).locked),
      owner: typeof (obj as any).owner === "string" ? (obj as any).owner : null,
      pid: typeof (obj as any).pid === "number" ? (obj as any).pid : null,
      started_at: typeof (obj as any).started_at === "string" ? (obj as any).started_at : null,
      spec: typeof (obj as any).spec === "string" ? (obj as any).spec : null,
      expires_at: typeof (obj as any).expires_at === "string" ? (obj as any).expires_at : null,
    };
  } catch {
    return { locked: false, owner: null, pid: null, started_at: null, spec: null, expires_at: null };
  }
}

function writeLockfileSync(lf: ClickOpsLockfile) {
  fs.writeFileSync(lockfilePath(), JSON.stringify(lf, null, 2) + "\n", "utf8");
}

function acquireClickOpsLock(params: { specLabel: string; ttlMinutes?: number }) {
  const ttlMinutes = typeof params.ttlMinutes === "number" && params.ttlMinutes > 0 ? params.ttlMinutes : DEFAULT_LOCK_TTL_MINUTES;
  const lf = readLockfileSync();
  const now = Date.now();
  const expiresAtMs = now + ttlMinutes * 60_000;

  const activeUntil = (() => {
    if (!lf.locked) return 0;
    if (!lf.expires_at) return 0;
    const t = Date.parse(lf.expires_at);
    return Number.isFinite(t) ? t : 0;
  })();

  if (lf.locked && activeUntil > now) {
    const owner = lf.owner ? ` owner=${lf.owner}` : "";
    const pid = typeof lf.pid === "number" ? ` pid=${lf.pid}` : "";
    const exp = lf.expires_at ? ` expires_at=${lf.expires_at}` : "";
    throw new Error(`clickops: lockfile engaged (${owner}${pid}${exp}). Refusing concurrent run.`);
  }

  const owner =
    (typeof process.env.USERNAME === "string" && process.env.USERNAME.trim())
      ? process.env.USERNAME.trim()
      : (typeof process.env.USER === "string" && process.env.USER.trim())
        ? process.env.USER.trim()
        : "unknown";

  const next: ClickOpsLockfile = {
    locked: true,
    owner,
    pid: process.pid,
    started_at: nowIso(),
    spec: params.specLabel,
    expires_at: new Date(expiresAtMs).toISOString(),
  };
  writeLockfileSync(next);
  return { acquired: true, lockfile: next, lock_ttl_minutes: ttlMinutes };
}

function releaseClickOpsLock() {
  const lf = readLockfileSync();
  if (!lf.locked) return;
  if (typeof lf.pid === "number" && lf.pid !== process.pid) return;
  writeLockfileSync({ locked: false, owner: null, pid: null, started_at: null, spec: null, expires_at: null });
}

function parseDotenv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) out[key] = val;
  }
  return out;
}

function loadWorkflowSpec(specPath: string): unknown {
  const ext = path.extname(specPath).toLowerCase().replace(".", "");
  const raw = fs.readFileSync(specPath, "utf8");
  if (ext === "yaml" || ext === "yml") return YAML.parse(raw);
  return JSON.parse(raw);
}

function assertClickOpsOnly(plan: any) {
  const steps = plan?.execution_plan?.steps;
  if (!Array.isArray(steps)) throw new Error("clickops: invalid plan (missing execution_plan.steps)");

  for (const s of steps) {
    const adapter = String(s?.adapter ?? "").trim();
    if (adapter !== "BrowserAgent") {
      throw new Error(`clickops: blocked adapter '${adapter || "(missing)"}'. Only BrowserAgent is allowed.`);
    }
    const method = String(s?.method ?? "").trim();
    if (method && method !== "goto" && method !== "pause_for_confirmation" && method !== "run_script") {
      throw new Error(
        `clickops: blocked BrowserAgent method '${method}'. Allowed: goto, pause_for_confirmation, run_script.`
      );
    }
  }
}

export function registerClickOps(program: Command) {
  program
    .command("clickops.run")
    .description("Execute a BrowserAgent-only workflow (ClickOps lane)")
    .option("--spec <path>", "Workflow YAML spec (BrowserAgent-only)")
    .option("--plan <path>", "Run from a deterministic execution plan (BrowserAgent-only)")
    .option("--dry-run", "Simulate execution only", false)
    .option(
      "--visualize",
      "Flight-plan preview: resolves steps, opens the first URL, takes one screenshot, and performs no inputs",
      false
    )
    .option("--audit [mode]", "Audit bundle mode: --audit (always) or --audit=auto (only on non-success)")
    .option("--confirm", "Required to execute when not --dry-run", false)
    .option("--lock-ttl <minutes>", "Override ClickOps lock TTL in minutes (min 5, max 360)")
    .option("--execution-id <id>", "Override execution id")
    .option("--secrets <path>", "Optional secrets JSON file for template vars and redaction")
    .option("--dotenv <path>", "Optional .env file to load for template vars")
    .option("--operator-id <id>", "Override operator id for role checks")
    .action(async (opts) => {
      const startedAtIso = nowIso();
      const auditMode: AuditMode = parseAuditMode((opts as any).audit);
      const lockTtlMinutes = parseLockTtlMinutes((opts as any).lockTtl);

      let runStatus: "success" | "failed" | "aborted" = "failed";
      let receivedSignal: "SIGINT" | "SIGTERM" | null = null;
      const onSigint = () => {
        receivedSignal = "SIGINT";
      };
      const onSigterm = () => {
        receivedSignal = "SIGTERM";
      };
      process.once("SIGINT", onSigint);
      process.once("SIGTERM", onSigterm);

      let lockAcquired = false;
      let lockState: {
        lock_ttl_minutes: number;
        acquired_at: string | null;
        expires_at: string | null;
        released_cleanly: boolean;
      } = {
        lock_ttl_minutes: lockTtlMinutes,
        acquired_at: null,
        expires_at: null,
        released_cleanly: false,
      };

      let specLabelForAudit = "(unknown)";
      let runExecutionId: string | null = null;
      let runDirAbsForAudit: string | null = null;
      let specNameForBanner = "(unknown)";
      let receipt: any = null;
      let caughtError: any = null;

      try {
        if (!opts.dryRun && !opts.confirm && !opts.visualize) {
          throw new Error("clickops: refusing to execute without --confirm (use --dry-run to simulate)");
        }

        if (opts.visualize) {
          process.env.SINTRAPRIME_CLICKOPS_VISUALIZE = "1";
        }

        const planPath = typeof opts.plan === "string" && String(opts.plan).trim()
          ? path.resolve(process.cwd(), String(opts.plan))
          : null;

        const specPath = typeof opts.spec === "string" && String(opts.spec).trim()
          ? path.resolve(process.cwd(), String(opts.spec))
          : null;

        if (!planPath && !specPath) throw new Error("Provide --spec <path> or --plan <path>");

        // Determine run id early so that we can stamp screenshots and always emit audit bundle.
        // RUN_ID is visual and court-friendly; execution_id uses RUN_<suffix>.
        const execOverride =
          typeof opts.executionId === "string" && String(opts.executionId).trim() ? String(opts.executionId).trim() : null;

        if (execOverride) {
          runExecutionId = execOverride;
        } else {
          const suffix = formatRunIdSuffix(new Date());
          const hash = computeShortHash(`${suffix}|${planPath ?? ""}|${specPath ?? ""}|${process.pid}`);
          runExecutionId = `RUN_${suffix}-${hash}`;
        }

        runDirAbsForAudit = path.join(process.cwd(), "runs", safeRunDirPart(runExecutionId));
        try {
          fs.mkdirSync(runDirAbsForAudit, { recursive: true });
        } catch {
          // best-effort
        }

        specNameForBanner = specPath
          ? path.basename(specPath)
          : planPath
            ? path.basename(planPath)
            : "(unknown)";

        // Set banner + audit context for the executor.
        process.env.SINTRAPRIME_RUN_ID = runExecutionId;
        process.env.SINTRAPRIME_RUN_SPEC_NAME = specNameForBanner;
        process.env.SINTRAPRIME_RUN_MODE = "clickops.run";
        process.env.SINTRAPRIME_RUN_STARTED_AT = startedAtIso;

        // Single-body guarantee (TTL expires after 60 minutes if the process crashes).
        const specLabel = planPath ? `plan:${planPath}` : specPath ? `spec:${specPath}` : "(unknown)";
        specLabelForAudit = specLabel;
        const lock = acquireClickOpsLock({ specLabel, ttlMinutes: lockTtlMinutes });
        lockAcquired = Boolean((lock as any)?.acquired);
        if ((lock as any)?.lockfile) {
          lockState.acquired_at = (lock as any).lockfile.started_at ?? null;
          lockState.expires_at = (lock as any).lockfile.expires_at ?? null;
        }

        const templateVars: Record<string, string> = {};
        const redactSecrets: string[] = [];

        if (typeof opts.dotenv === "string" && String(opts.dotenv).trim()) {
          const envPath = path.resolve(process.cwd(), String(opts.dotenv));
          const envRaw = fs.readFileSync(envPath, "utf8");
          Object.assign(templateVars, parseDotenv(envRaw));
        }

        if (typeof opts.secrets === "string" && String(opts.secrets).trim()) {
          const secretsPath = path.resolve(process.cwd(), String(opts.secrets));
          const secretsObj = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
          if (secretsObj && typeof secretsObj === "object") {
            for (const [k, v] of Object.entries(secretsObj)) {
              if (!k) continue;
              templateVars[String(k)] = String(v ?? "");
            }
          }
          // Enable global redaction inside executePlan for this process.
          process.env.SINTRAPRIME_REDACT_SECRETS_PATH = secretsPath;
        }

        const runOpts: WorkflowRunOptions = {
          template_vars: templateVars,
          redact_secrets: redactSecrets,
          operator_id: typeof opts.operatorId === "string" ? String(opts.operatorId) : undefined,
        };

        // Hint to the executor that this run is invoked via workflow.run (reuse existing receipt conventions).
        process.env.SINTRAPRIME_WORKFLOW_RUN = "1";
        if (planPath) {
          const plan: any = loadWorkflowPlanFromPath(planPath);

          // Canonical run id
          if (runExecutionId) {
            plan.execution_id = runExecutionId;
            if (plan.execution_plan) plan.execution_plan.execution_id = runExecutionId;
            if (plan.workflow) plan.workflow = { ...(plan.workflow ?? {}), execution_id: runExecutionId };
          }
          if (opts.dryRun) {
            if (plan.workflow) plan.workflow = { ...(plan.workflow ?? {}), dry_run: true };
            if (plan.execution_plan) plan.execution_plan.dry_run = true;
          }

          assertClickOpsOnly(plan);
          receipt = await runWorkflowFromPlan({ plan, opts: runOpts, approval: null });
        } else {
          const raw = loadWorkflowSpec(specPath!);
          const def = WorkflowDefinitionSchema.parse(raw);
          const planned = await createWorkflowPlan({
            def: { ...(def as any), dry_run: opts.dryRun ? true : def.dry_run } as any,
            opts: runOpts,
            execution_id: runExecutionId ?? undefined,
          });

          assertClickOpsOnly(planned.plan);
          receipt = await runWorkflowFromPlan({ plan: planned.plan as any, opts: runOpts, approval: null });
        }

        if ((receipt as any)?.status === "success") runStatus = "success";

        process.stdout.write(JSON.stringify(receipt) + "\n");
        const status = (receipt as any)?.status;
        process.exitCode = status === "success" ? 0 : status === "failed" || status === "denied" ? 1 : 0;
      } catch (e: any) {
        caughtError = e;
        if (receivedSignal) {
          runStatus = "aborted";
        } else if (String(e?.message ?? e) === "operator_declined") {
          runStatus = "aborted";
        } else {
          runStatus = "failed";
        }
        process.stderr.write(String(e?.message ?? e) + "\n");
        process.exitCode = 2;
      } finally {
        process.removeListener("SIGINT", onSigint);
        process.removeListener("SIGTERM", onSigterm);

        // Release lock first (so LOCK_STATE reflects clean release).
        try {
          if (lockAcquired) {
            releaseClickOpsLock();
            lockState.released_cleanly = true;
          }
        } catch {
          // ignore
        }

        // Audit bundle is non-optional once requested.
        const shouldEmit =
          auditMode === true ||
          (auditMode === "auto" && runStatus !== "success");

        if (shouldEmit) {
          const executionId = runExecutionId ?? extractExecutionIdFromReceipt(receipt);
          const runDirAbs = runDirAbsForAudit ?? (executionId ? path.join(process.cwd(), "runs", safeRunDirPart(executionId)) : null);

          if (executionId && runDirAbs) {
            const suffix = executionId.startsWith("RUN_") ? executionId.slice(4) : executionId;
            const outZipAbs = path.join(runDirAbs, `clickops.audit_bundle.RUN_${safeRunDirPart(suffix)}.zip`);
            try {
              fs.mkdirSync(runDirAbs, { recursive: true });
            } catch {
              // ignore
            }

            try {
              await createClickOpsAuditBundle({
                runDirAbs,
                outZipAbs,
                run_id: executionId,
                spec_label: specLabelForAudit,
                spec_name: specNameForBanner,
                mode: "clickops.run",
                started_at: startedAtIso,
                finished_at: nowIso(),
                visualize: Boolean(opts.visualize),
                dry_run: Boolean(opts.dryRun),
                receipt,
                error: caughtError ? String(caughtError?.message ?? caughtError) : null,
                lock_state: lockState,
              });
              // eslint-disable-next-line no-console
              console.log(`clickops: wrote audit bundle: ${outZipAbs}`);
            } catch (bundleErr) {
              // eslint-disable-next-line no-console
              console.warn(`clickops: audit bundle failed: ${(bundleErr as any)?.message ?? String(bundleErr)}`);
            }
          }
        }
      }
    });
}

import type { ExecutionPlan, ExecutionStep } from "../schemas/ExecutionPlan.schema.js";
import { ExecutionPlanSchema } from "../schemas/ExecutionPlan.schema.js";
import crypto from "node:crypto";
import { computePlanHash } from "../utils/planHash.js";
import { proposeStatus } from "../analysis/proposeStatus.js";
import { notionLiveGet, notionLiveWhoAmI } from "../adapters/notionLiveRead.js";
import { notionLivePatchWithIdempotency, notionLivePostWithIdempotency } from "../adapters/notionLiveWrite.js";
import { writeNotionLiveWriteArtifact } from "../artifacts/writeNotionLiveWriteArtifact.js";
import { writeDocsCaptureArtifact } from "../artifacts/writeDocsCaptureArtifact.js";
import { getIdempotencyRecord, writeIdempotencyRecord } from "../idempotency/idempotencyLedger.js";
import { computeBundleHashFromIndexStrict, assertApprovedForSend } from "../cases/approval.js";
import { readArtifactIndex } from "../cases/artifactIndex.js";
import { appendCaseEvent } from "../cases/mirror.js";
import type { CaseStage } from "../cases/types.js";
import {
  initPlanState,
  loadEgressAllowlistFromEnv,
  isHostAllowed,
  allowlistMatch,
  requiresEgressGuard,
  updatePlanStateAfterStep,
  safeHostFromUrl,
  redactUrlForLogs,
} from "./egressPolicy.js";

type RunStatus =
  | "running"
  | "success"
  | "failed"
  | "denied"
  | "awaiting_approval"
  | "rejected"
  | "throttled";

type StepStatus = "success" | "failed" | "skipped";

export type StepRunLog = {
  step_id: string;
  action: string;
  adapter: ExecutionStep["adapter"];
  method: ExecutionStep["method"];
  url: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  status: StepStatus;
  http_status: number | null;
  response: unknown;
  expectations: {
    http_status_expected: number[];
    http_status_ok: boolean;
    json_paths_present?: string[];
    json_paths_ok?: boolean;
  };
  error?: string;
  watch?: {
    enabled?: boolean;
    phases?: string[];
    screenshots?: Array<{
      system: string;
      path: string;
      sha256: string;
      captured_at: string;
    }>;
  };

  // Audit-friendly policy snapshot for guarded external steps.
  egress_policy_snapshot?: {
    decision_reason: string;
    requires_guard: boolean;
    host: string | null;
    allowlist_match: "exact" | "regex" | "none";
    approval_status: string | null;
    approved_hash: string | null;
    current_hash: string | null;
    approval_freshness_mode: "max_age_ok" | "approved_after_index" | "fail" | "n/a";
  };
};

export type ExecutePlanOptions = {
  onStepFinished?: (args: {
    plan: ExecutionPlan;
    step: ExecutionStep;
    stepLog: StepRunLog;
  }) => Promise<void> | void;
};

export type ExecutionRunLog = {
  execution_id: string;
  threadId: string;
  goal: string;
  dry_run: boolean;
  plan_hash?: string;
  started_at: string;
  finished_at?: string;
  status: RunStatus;
  failed_step?: string;
  error?: string;
  receipt_hash?: string;
  agent_versions?: Record<string, string>;
  resolved_capabilities?: Record<string, string>;
  phases_planned?: string[];
  phases_executed?: string[];
  denied_phase?: string;
  artifacts?: Record<
    string,
    {
      outputs: Record<string, unknown>;
      files?: string[];
      metadata: { started_at: string; finished_at: string };
    }
  >;
  policy_denied?: { code: string; reason: string };
  approval_required?: unknown;
  steps: StepRunLog[];
};

function computeReceiptHash(runLog: ExecutionRunLog) {
  // Hash the final run log as an execution receipt.
  // Note: timestamps are included, so receipts differ per run (intended).
  const payload = JSON.stringify(runLog);
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function deriveIdempotencyKey(input: {
  action: string;
  plan_hash: string;
  step_id: string;
  threadId: string;
}) {
  const payload = `${input.action}|${input.plan_hash}|${input.step_id}|${input.threadId}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function getTimeoutMs() {
  const raw = process.env.DEFAULT_STEP_TIMEOUT_MS;
  if (!raw) return 30_000;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 30_000;
}

function getMaxRuntimeMs() {
  const raw = process.env.POLICY_MAX_RUNTIME_MS;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function methodAllowsBody(method: string) {
  return method !== "GET" && method !== "HEAD";
}

function hasHeader(headers: Record<string, string>, headerName: string) {
  const wanted = headerName.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === wanted);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getNestedString(root: unknown, keys: string[]): string | null {
  let cur: any = root;
  for (const k of keys) {
    if (!cur || typeof cur !== "object") return null;
    cur = cur[k];
  }
  return typeof cur === "string" ? cur : null;
}

function tryParseJson(text: string): unknown | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}


// Minimal JSON path resolver supporting: a.b.c and a[0].b
function getByPath(root: unknown, path: string): unknown {
  if (!path) return undefined;
  const normalized = path.startsWith("$") ? path.replace(/^\$\.?/, "") : path;
  const tokens: Array<string | number> = [];

  // tokenize: split by dots, but also parse [index]
  for (const part of normalized.split(".")) {
    if (!part) continue;
    const re = /([^[\]]+)|(\[(\d+)\])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(part))) {
      if (m[1]) tokens.push(m[1]);
      if (m[3]) tokens.push(Number(m[3]));
    }
  }

  let cur: any = root;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[t as any];
  }
  return cur;
}

function validateRequiredSecrets(plan: ExecutionPlan) {
  const missing = plan.required_secrets
    .filter((s) => s.source === "env")
    .map((s) => s.name)
    .filter((name) => !process.env[name] || String(process.env[name]).trim() === "");

  return missing;
}

async function executeStep(step: ExecutionStep, timeoutMs: number) {
  const headers: Record<string, string> = { ...(step.headers ?? {}) };

  if (step.idempotency_key && !hasHeader(headers, "Idempotency-Key")) {
    headers["Idempotency-Key"] = step.idempotency_key;
  }

  const method = step.method;

  let body: string | undefined;
  if (methodAllowsBody(method) && step.payload !== undefined && step.payload !== null) {
    if (typeof step.payload === "string") {
      body = step.payload;
    } else {
      if (!hasHeader(headers, "Content-Type")) {
        headers["Content-Type"] = "application/json";
      }
      body = JSON.stringify(step.payload);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(step.url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    const text = await res.text();
    const contentType = res.headers.get("content-type") ?? "";
    const json = contentType.includes("application/json") ? tryParseJson(text) : tryParseJson(text);

    return {
      ok: res.ok,
      status: res.status,
      response: json ?? text,
      responseJson: json,
    };
  } finally {
    clearTimeout(timeout);
  }
}

class EgressRefusedError extends Error {
  public readonly code: string;
  public readonly caseId?: string;
  public readonly notionPageId?: string;
  public readonly stepId?: string;
  public readonly action?: string;
  public readonly method?: string;
  public readonly host?: string;
  public readonly decisionReason?: string;

  constructor(
    code: string,
    message: string,
    meta?: {
      caseId?: string;
      notionPageId?: string;
      stepId?: string;
      action?: string;
      method?: string;
      host?: string;
      decisionReason?: string;
    }
  ) {
    super(message);
    this.code = code;
    this.caseId = meta?.caseId;
    this.notionPageId = meta?.notionPageId;
    this.stepId = meta?.stepId;
    this.action = meta?.action;
    this.method = meta?.method;
    this.host = meta?.host;
    this.decisionReason = meta?.decisionReason;
  }
}

function parseDateMs(iso: string | null | undefined): number | null {
  const s = String(iso ?? "").trim();
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : null;
}

function approvalIsFresh(params: {
  approvedAtIso: string | null | undefined;
  indexUpdatedAtIso: string | null | undefined;
  maxAgeDays: number;
}): boolean {
  const approvedAtMs = parseDateMs(params.approvedAtIso);
  if (approvedAtMs === null) return false;

  const maxAgeMs = Math.max(1, params.maxAgeDays) * 24 * 60 * 60 * 1000;
  const withinWindow = Date.now() - approvedAtMs <= maxAgeMs;

  const indexUpdatedAtMs = parseDateMs(params.indexUpdatedAtIso);
  const afterIndexUpdate = indexUpdatedAtMs === null ? false : approvedAtMs >= indexUpdatedAtMs;

  return withinWindow || afterIndexUpdate;
}

function computeFreshnessMode(params: {
  approvedAtIso: string | null | undefined;
  indexUpdatedAtIso: string | null | undefined;
  maxAgeDays: number;
}): "max_age_ok" | "approved_after_index" | "fail" {
  const approvedAtMs = parseDateMs(params.approvedAtIso);
  if (approvedAtMs === null) return "fail";

  const maxAgeMs = Math.max(1, params.maxAgeDays) * 24 * 60 * 60 * 1000;
  const withinWindow = Date.now() - approvedAtMs <= maxAgeMs;
  if (withinWindow) return "max_age_ok";

  const indexUpdatedAtMs = parseDateMs(params.indexUpdatedAtIso);
  const afterIndexUpdate = indexUpdatedAtMs === null ? false : approvedAtMs >= indexUpdatedAtMs;
  return afterIndexUpdate ? "approved_after_index" : "fail";
}

async function executeDocsCaptureStep(step: ExecutionStep, timeoutMs: number, execution_id: string) {
  const headers: Record<string, string> = { ...(step.headers ?? {}) };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(step.url, {
      method: step.method,
      headers,
      signal: controller.signal,
    });

    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    const sha256_hex = crypto.createHash("sha256").update(buf).digest("hex");
    const content_type = res.headers.get("content-type");

    const { metaFile, bodyFile } = writeDocsCaptureArtifact({
      execution_id,
      step_id: step.step_id,
      url: step.url,
      http_status: res.status,
      content_type,
      sha256_hex,
      body_bytes: buf,
    });

    const response = {
      sha256_hex,
      byte_length: buf.length,
      content_type,
      artifact: { metaFile, bodyFile },
    };

    return {
      ok: res.ok,
      status: res.status,
      response,
      responseJson: response,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function executePlan(rawPlan: unknown, opts: ExecutePlanOptions = {}): Promise<ExecutionRunLog> {
  const plan = ExecutionPlanSchema.parse(rawPlan);
  const nowIso = () => new Date().toISOString();

  const existingPlanHash = (rawPlan as any)?.plan_hash;
  const plan_hash =
    typeof existingPlanHash === "string" && existingPlanHash
      ? existingPlanHash
      : computePlanHash(plan);

  const runLog: ExecutionRunLog = {
    execution_id: plan.execution_id,
    threadId: plan.threadId,
    goal: plan.goal,
    dry_run: plan.dry_run,
    plan_hash,
    started_at: nowIso(),
    steps: [],
    status: "running",
  };

  try {
    if (!plan.dry_run) {
      const missing = validateRequiredSecrets(plan);
      if (missing.length) {
        runLog.status = "failed";
        runLog.error = `Missing required env secrets: ${missing.join(", ")}`;
        runLog.finished_at = nowIso();
        runLog.receipt_hash = computeReceiptHash(runLog);
        return runLog;
      }
    }

    const timeoutMs = getTimeoutMs();
    const maxRuntimeMs = getMaxRuntimeMs();
    const startedWall = Date.now();

    const casesRootDir = process.env.CASES_ROOT_DIR ?? process.cwd();
    const egressAllowlist = loadEgressAllowlistFromEnv(process.env);
    const planState = initPlanState();

    for (const step of plan.steps) {
      if (maxRuntimeMs !== null && Date.now() - startedWall > maxRuntimeMs) {
        runLog.status = "denied";
        runLog.policy_denied = {
          code: "POLICY_MAX_RUNTIME_MS",
          reason: `runtime budget exceeded (> ${maxRuntimeMs}ms)`,
        };
        runLog.error = runLog.policy_denied.reason;
        runLog.finished_at = nowIso();
        runLog.receipt_hash = computeReceiptHash(runLog);
        return runLog;
      }

      const stepStarted = nowIso();
      const start = Date.now();

      const stepLog: StepRunLog = {
        step_id: step.step_id,
        action: step.action,
        adapter: step.adapter,
        method: step.method,
        url: step.url,
        started_at: stepStarted,
        finished_at: stepStarted,
        duration_ms: 0,
        status: "skipped",
        http_status: null,
        response: null,
        expectations: {
          http_status_expected: step.expects.http_status,
          http_status_ok: false,
          json_paths_present: step.expects.json_paths_present,
          json_paths_ok: step.expects.json_paths_present ? false : undefined,
        },
      };

      try {
        if (plan.dry_run) {
          stepLog.status = "skipped";
          stepLog.response = { dry_run: true };
        } else {
          // Egress preflight: classify GET/HEAD safely (only when plan is egress-bearing), enforce domain allowlists,
          // and apply approval-by-hash + drift/freshness checks at the true send boundary.
          const host = safeHostFromUrl(step.url);
          const isLocal = host === "localhost" || host === "127.0.0.1";
          const isNotion = host === "api.notion.com";
          const isExternal = Boolean(host) && !isLocal && !isNotion;

          const decision = requiresEgressGuard(step as any, planState);
          const guard = (step as any).egress_guard as
            | {
                case_id: string;
                notion_page_id: string;
                stage?: string;
                kind?: "packet" | "binder";
                override_reason?: string;
                override_by?: string;
              }
            | undefined;

          // Domain allowlist is enforced only when a guard is required.
          if (isExternal && decision.requires_guard) {
            if (!host || !isHostAllowed(host, egressAllowlist)) {
              throw new EgressRefusedError(
                "EGRESS_DOMAIN_NOT_ALLOWED",
                `Refusing external egress to non-allowlisted domain (host=${host ?? "(unknown)"}). Set EGRESS_ALLOWED_DOMAINS/EGRESS_ALLOWED_DOMAINS_REGEX to include this host.`,
                {
                  caseId: guard?.case_id,
                  notionPageId: guard?.notion_page_id,
                  stepId: step.step_id,
                  action: step.action,
                  method: step.method,
                  host: host ?? undefined,
                  decisionReason: decision.reason,
                }
              );
            }
          }

          // Default snapshot (filled in more fully for send steps).
          if (isExternal && decision.requires_guard) {
            stepLog.egress_policy_snapshot = {
              decision_reason: decision.reason,
              requires_guard: true,
              host,
              allowlist_match: host ? allowlistMatch(host, egressAllowlist) : "none",
              approval_status: null,
              approved_hash: null,
              current_hash: null,
              approval_freshness_mode: "n/a",
            };
          }

          if (isExternal && decision.requires_guard) {
            if (!guard || !guard.case_id || !guard.notion_page_id) {
              throw new EgressRefusedError(
                "EGRESS_GUARD_MISSING",
                `Refusing external request without egress_guard (method=${step.method} host=${host}). Provide egress_guard.case_id + egress_guard.notion_page_id.`,
                {
                  stepId: step.step_id,
                  action: step.action,
                  method: step.method,
                  host: host ?? undefined,
                  decisionReason: decision.reason,
                }
              );
            }

            // Approval-by-hash is enforced at the send boundary (non-GET/HEAD).
            if (step.method !== "GET" && step.method !== "HEAD") {
              const page = await notionLiveGet(`/v1/pages/${guard.notion_page_id}`);
              if (page.http_status < 200 || page.http_status >= 300) {
                throw new EgressRefusedError(
                  "EGRESS_NOTION_READ_FAILED",
                  `Refusing send: cannot read Notion page for approval (http_status=${page.http_status})`,
                  {
                    caseId: guard.case_id,
                    notionPageId: guard.notion_page_id,
                    stepId: step.step_id,
                    action: step.action,
                    method: step.method,
                    host: host ?? undefined,
                    decisionReason: decision.reason,
                  }
                );
              }

              const props = (page as any).redacted?.properties ?? (page as any).properties ?? {};
              const approvalStatus = String(props?.["Approval Status"]?.select?.name ?? "");
              const approvedBundleHash = String(props?.["Approved Bundle Hash"]?.rich_text?.[0]?.plain_text ?? "");
              const approvedAt = String(props?.["Approved At"]?.date?.start ?? "");

              const overrideReason = String(props?.["Approval Override Reason"]?.rich_text?.[0]?.plain_text ?? "");
              const overrideBy = Array.isArray(props?.["Approval Override By"]?.people)
                ? String(props?.["Approval Override By"]?.people?.[0]?.id ?? "")
                : "";
              const overrideStage = String(props?.["Approval Override Stage"]?.select?.name ?? "");
              const overrideBundleHash = String(props?.["Approval Override Bundle Hash"]?.rich_text?.[0]?.plain_text ?? "");
              const overrideUntil = String(props?.["Approval Override Until"]?.date?.start ?? "");

              const stageFromNotion = String(props?.["Stage"]?.select?.name ?? "");
              const stage = (guard.stage ? String(guard.stage) : stageFromNotion) as unknown as CaseStage;
              const kind = guard.kind ?? "packet";
              if (!stage || typeof stage !== "string") {
                throw new EgressRefusedError(
                  "EGRESS_STAGE_MISSING",
                  "Refusing send: missing stage for bundle-hash computation",
                  {
                    caseId: guard.case_id,
                    notionPageId: guard.notion_page_id,
                    stepId: step.step_id,
                    action: step.action,
                    method: step.method,
                    host: host ?? undefined,
                    decisionReason: decision.reason,
                  }
                );
              }

              const { bundleHash } = computeBundleHashFromIndexStrict({
                rootDir: casesRootDir,
                caseId: String(guard.case_id),
                stage,
                kind,
              });

              if (stepLog.egress_policy_snapshot) {
                stepLog.egress_policy_snapshot.current_hash = bundleHash;
              }

              const idx = readArtifactIndex(casesRootDir, String(guard.case_id));
              const maxAgeDays = (() => {
                const raw = process.env.APPROVAL_MAX_AGE_DAYS;
                const n = raw ? Number(raw) : 30;
                return Number.isFinite(n) && n > 0 ? n : 30;
              })();

              const stepRequestsOverride = Boolean(guard.override_reason && guard.override_by);
              const notionHasOverride = Boolean(overrideReason && overrideBy);

              if (stepRequestsOverride || notionHasOverride) {
                if (!stepRequestsOverride) {
                  throw new EgressRefusedError(
                    "EGRESS_OVERRIDE_STEP_MISSING",
                    "Refusing send: Notion has override fields set but this step did not declare override metadata (override_reason/override_by)",
                    {
                      caseId: guard.case_id,
                      notionPageId: guard.notion_page_id,
                      stepId: step.step_id,
                      action: step.action,
                      method: step.method,
                      host: host ?? undefined,
                      decisionReason: decision.reason,
                    }
                  );
                }
                if (!notionHasOverride) {
                  throw new EgressRefusedError(
                    "EGRESS_OVERRIDE_NOTION_MISSING",
                    "Refusing send: step declared override metadata but Notion override fields are missing",
                    {
                      caseId: guard.case_id,
                      notionPageId: guard.notion_page_id,
                      stepId: step.step_id,
                      action: step.action,
                      method: step.method,
                      host: host ?? undefined,
                      decisionReason: decision.reason,
                    }
                  );
                }

                // Painful-but-possible bypass: override must be stage-specific and hash-specific.
                if (!overrideStage || overrideStage !== stage) {
                  throw new EgressRefusedError(
                    "EGRESS_OVERRIDE_STAGE_MISMATCH",
                    `Refusing send: override stage missing/mismatch (override_stage=${overrideStage || "(unset)"} required_stage=${stage})`,
                    {
                      caseId: guard.case_id,
                      notionPageId: guard.notion_page_id,
                      stepId: step.step_id,
                      action: step.action,
                      method: step.method,
                      host: host ?? undefined,
                      decisionReason: decision.reason,
                    }
                  );
                }
                if (!overrideBundleHash || overrideBundleHash !== bundleHash) {
                  throw new EgressRefusedError(
                    "EGRESS_OVERRIDE_HASH_MISMATCH",
                    `Refusing send: override bundle hash missing/mismatch (override=${overrideBundleHash || "(unset)"} current=${bundleHash})`,
                    {
                      caseId: guard.case_id,
                      notionPageId: guard.notion_page_id,
                      stepId: step.step_id,
                      action: step.action,
                      method: step.method,
                      host: host ?? undefined,
                      decisionReason: decision.reason,
                    }
                  );
                }
                const untilMs = parseDateMs(overrideUntil);
                if (untilMs !== null && untilMs < Date.now()) {
                  throw new EgressRefusedError(
                    "EGRESS_OVERRIDE_EXPIRED",
                    `Refusing send: override expired (override_until=${overrideUntil})`,
                    {
                      caseId: guard.case_id,
                      notionPageId: guard.notion_page_id,
                      stepId: step.step_id,
                      action: step.action,
                      method: step.method,
                      host: host ?? undefined,
                      decisionReason: decision.reason,
                    }
                  );
                }

                if (stepLog.egress_policy_snapshot) {
                  stepLog.egress_policy_snapshot.approval_status = "OVERRIDE";
                  stepLog.egress_policy_snapshot.approved_hash = overrideBundleHash || null;
                  stepLog.egress_policy_snapshot.approval_freshness_mode = "n/a";
                }
              } else {
                assertApprovedForSend({ approval: { approvalStatus, approvedBundleHash }, currentBundleHash: bundleHash });

                const freshnessMode = computeFreshnessMode({
                  approvedAtIso: approvedAt,
                  indexUpdatedAtIso: idx.updated_at,
                  maxAgeDays,
                });

                if (stepLog.egress_policy_snapshot) {
                  stepLog.egress_policy_snapshot.approval_status = approvalStatus || null;
                  stepLog.egress_policy_snapshot.approved_hash = approvedBundleHash || null;
                  stepLog.egress_policy_snapshot.approval_freshness_mode = freshnessMode;
                }

                if (freshnessMode === "fail") {
                  throw new EgressRefusedError(
                    "EGRESS_APPROVAL_STALE",
                    `Refusing send: approval is stale (approved_at=${approvedAt || "(unset)"}, index_updated_at=${idx.updated_at}, max_age_days=${maxAgeDays})`,
                    {
                      caseId: guard.case_id,
                      notionPageId: guard.notion_page_id,
                      stepId: step.step_id,
                      action: step.action,
                      method: step.method,
                      host: host ?? undefined,
                      decisionReason: decision.reason,
                    }
                  );
                }
              }
            }
          }

          // GOTCHA: Only flip chain state once validation is complete and we are committed to executing the request.
          if (isExternal) {
            updatePlanStateAfterStep(step as any, planState, decision);
          }

          const out =
            step.action === "analysis.propose_status"
              ? {
                  ok: true,
                  status: 200,
                  response: proposeStatus(),
                  responseJson: proposeStatus(),
                }
              : step.action === "notion.live.read"
                ? await (async () => {
                    const notionPath =
                      typeof (step as any).notion_path === "string" &&
                      String((step as any).notion_path).trim()
                        ? String((step as any).notion_path)
                        : new URL(step.url).pathname;

                    const r = await notionLiveGet(notionPath);
                    return {
                      ok: r.http_status >= 200 && r.http_status < 300,
                      status: r.http_status,
                      response: r.redacted,
                      responseJson: r.redacted,
                    };
                  })()
                : step.action === "notion.live.write"
                  ? await (async () => {
                      const notionPath =
                        typeof (step as any).notion_path === "string" &&
                        String((step as any).notion_path).trim()
                          ? String((step as any).notion_path)
                          : new URL(step.url).pathname;

                      const props = (step as any).properties;

                      const stepIdempotencyKey =
                        typeof (step as any).idempotency_key === "string" && String((step as any).idempotency_key).trim()
                          ? String((step as any).idempotency_key).trim()
                          : deriveIdempotencyKey({
                              action: String(step.action),
                              plan_hash,
                              step_id: String(step.step_id),
                              threadId: String(plan.threadId),
                            });
                      (step as any).idempotency_key = stepIdempotencyKey;

                      const existing = getIdempotencyRecord(stepIdempotencyKey);
                      if (existing && typeof existing?.http_status === "number") {
                        return {
                          ok: true,
                          status: existing.http_status,
                          response: existing.response ?? null,
                          responseJson: existing.response ?? null,
                        };
                      }

                      const r = await notionLivePatchWithIdempotency(
                        notionPath,
                        { properties: props },
                        stepIdempotencyKey
                      );

                      if (r.http_status >= 400) {
                        throw new Error(`Notion PATCH failed HTTP ${r.http_status}`);
                      }

                      const approved_at =
                        typeof (step as any).approved_at === "string" &&
                        String((step as any).approved_at).trim()
                          ? String((step as any).approved_at)
                          : new Date().toISOString();

                      writeNotionLiveWriteArtifact({
                        execution_id: plan.execution_id,
                        step_id: step.step_id,
                        notion_path: notionPath,
                        request_properties: props,
                        guards: (step as any).guards || [],
                        http_status: r.http_status,
                        response: r.redacted,
                        approved_at,
                      });

                      writeIdempotencyRecord(stepIdempotencyKey, {
                        status: "executed",
                        idempotency_key: stepIdempotencyKey,
                        execution_id: plan.execution_id,
                        plan_hash,
                        threadId: plan.threadId,
                        step_id: step.step_id,
                        action: step.action,
                        notion_path: notionPath,
                        http_status: r.http_status,
                        response: r.redacted,
                        executed_at: new Date().toISOString(),
                      });

                      return {
                        ok: true,
                        status: r.http_status,
                        response: r.redacted,
                        responseJson: r.redacted,
                      };
                    })()
                : step.action === "notion.live.query"
                  ? await (async () => {
                      const notionPath =
                        typeof (step as any).notion_path === "string" && String((step as any).notion_path).trim()
                          ? String((step as any).notion_path)
                          : new URL(step.url).pathname;

                      const payload = (step as any).payload;
                      const r = await notionLivePostWithIdempotency(notionPath, payload ?? {}, null);
                      return {
                        ok: r.http_status >= 200 && r.http_status < 300,
                        status: r.http_status,
                        response: r.redacted,
                        responseJson: r.redacted,
                      };
                    })()
                  : step.action === "notion.live.create"
                    ? await (async () => {
                        const notionPath =
                          typeof (step as any).notion_path === "string" && String((step as any).notion_path).trim()
                            ? String((step as any).notion_path)
                            : new URL(step.url).pathname;

                        const body = (step as any).payload;

                        const stepIdempotencyKey =
                          typeof (step as any).idempotency_key === "string" && String((step as any).idempotency_key).trim()
                            ? String((step as any).idempotency_key).trim()
                            : deriveIdempotencyKey({
                                action: String(step.action),
                                plan_hash,
                                step_id: String(step.step_id),
                                threadId: String(plan.threadId),
                              });
                        (step as any).idempotency_key = stepIdempotencyKey;

                        const existing = getIdempotencyRecord(stepIdempotencyKey);
                        if (existing && typeof existing?.http_status === "number") {
                          return {
                            ok: true,
                            status: existing.http_status,
                            response: existing.response ?? null,
                            responseJson: existing.response ?? null,
                          };
                        }

                        const r = await notionLivePostWithIdempotency(notionPath, body ?? {}, stepIdempotencyKey);
                        if (r.http_status >= 400) {
                          throw new Error(`Notion POST failed HTTP ${r.http_status}`);
                        }

                        writeIdempotencyRecord(stepIdempotencyKey, {
                          status: "executed",
                          idempotency_key: stepIdempotencyKey,
                          execution_id: plan.execution_id,
                          plan_hash,
                          threadId: plan.threadId,
                          step_id: step.step_id,
                          action: step.action,
                          notion_path: notionPath,
                          http_status: r.http_status,
                          response: r.redacted,
                          executed_at: new Date().toISOString(),
                        });

                        return {
                          ok: true,
                          status: r.http_status,
                          response: r.redacted,
                          responseJson: r.redacted,
                        };
                      })()
                : step.action === "docs.capture"
                  ? await executeDocsCaptureStep(step, timeoutMs, plan.execution_id)
                : await executeStep(step, timeoutMs);
          stepLog.http_status = out.status;
          stepLog.response = out.response;

          const statusOk = step.expects.http_status.includes(out.status);
          stepLog.expectations.http_status_ok = statusOk;

          let jsonPathsOk = true;
          if (step.expects.json_paths_present && step.expects.json_paths_present.length) {
            const root = out.responseJson ?? (isPlainObject(out.response) ? out.response : null);
            for (const p of step.expects.json_paths_present) {
              if (getByPath(root, p) === undefined) {
                jsonPathsOk = false;
                break;
              }
            }
            stepLog.expectations.json_paths_ok = jsonPathsOk;
          }

          const ok = out.ok && statusOk && (step.expects.json_paths_present ? jsonPathsOk : true);
          stepLog.status = ok ? "success" : "failed";

          if (!ok) {
            const why = !out.ok
              ? `HTTP not ok (${out.status})`
              : !statusOk
                ? `Unexpected status (${out.status}); expected one of ${step.expects.http_status.join(",")}`
                : "Missing required json path";

            let hint: string | null = null;
            if (
              step.action === "notion.live.read" &&
              out.status === 404 &&
              isPlainObject(out.responseJson) &&
              (out.responseJson as any).code === "object_not_found"
            ) {
              try {
                const me = await notionLiveWhoAmI();
                if (me.ok && isPlainObject(me.me)) {
                  const name = typeof (me.me as any).name === "string" ? (me.me as any).name : null;
                  const id = typeof (me.me as any).id === "string" ? (me.me as any).id : null;
                  const workspaceName =
                    isPlainObject((me.me as any).bot) && typeof ((me.me as any).bot as any).workspace_name === "string"
                      ? (((me.me as any).bot as any).workspace_name as string)
                      : null;
                  hint = `Token integration: ${name ?? id ?? "(unknown)"}${workspaceName ? ` (workspace: ${workspaceName})` : ""}. Ensure this integration is shared on the database AND its parent page.`;
                }
              } catch {
                // Best-effort diagnostics only.
              }
            }

            stepLog.error = hint ? `${why}. ${hint}` : why;
          }
        }
      } catch (e: any) {
        stepLog.status = "failed";
        stepLog.error = e?.name === "AbortError" ? `Timeout after ${timeoutMs}ms` : (e?.message ?? String(e));
        stepLog.response = null;

        // Make refusal auditable: write a case event when possible.
        if (!plan.dry_run && e instanceof EgressRefusedError && e.caseId) {
          try {
            const eventHost = typeof step.url === "string" ? safeHostFromUrl(step.url) : null;
            appendCaseEvent({
              rootDir: casesRootDir,
              caseId: e.caseId,
              event_type: "EGRESS_REFUSED",
              actor: "executor",
              timestamp: nowIso(),
              details: {
                code: e.code,
                message: e.message,
                decision_reason: e.decisionReason ?? null,
                requires_guard: true,
                step_id: e.stepId ?? step.step_id,
                action: e.action ?? step.action,
                method: e.method ?? step.method,
                url_redacted: typeof step.url === "string" ? redactUrlForLogs(step.url) : null,
                host: e.host ?? eventHost,
                allowlist_match: eventHost ? allowlistMatch(eventHost, egressAllowlist) : null,
                notion_page_id: e.notionPageId ?? null,
              },
              related_artifacts: [],
            });
          } catch {
            // best-effort only
          }

          try {
            process.stderr.write(
              "EGRESS_REFUSED: From repo root, run:\n" +
                `npm run -s policy:snapshot -- --execution ${plan.execution_id} --include-refusals\n`
            );
          } catch {
            // ignore
          }
        }
      } finally {
        stepLog.duration_ms = Date.now() - start;
        stepLog.finished_at = nowIso();

        if (!plan.dry_run && stepLog.status === "success" && typeof opts.onStepFinished === "function") {
          try {
            await opts.onStepFinished({ plan, step, stepLog });
          } catch {
            // best-effort only
          }
        }
        runLog.steps.push(stepLog);
      }

      if (stepLog.status === "failed") {
        runLog.status = "failed";
        runLog.failed_step = step.step_id;
        runLog.finished_at = nowIso();
        runLog.receipt_hash = computeReceiptHash(runLog);
        return runLog;
      }
    }

    runLog.status = "success";
    runLog.finished_at = nowIso();
    runLog.receipt_hash = computeReceiptHash(runLog);
    return runLog;
  } catch (e: any) {
    runLog.status = "failed";
    runLog.error = e?.message ?? String(e);
    runLog.finished_at = new Date().toISOString();
    runLog.receipt_hash = computeReceiptHash(runLog);
    return runLog;
  }
}

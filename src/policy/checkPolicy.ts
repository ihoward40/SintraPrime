import type { ExecutionPlan, ExecutionStep } from "../schemas/ExecutionPlan.schema.js";
import fs from "node:fs";
import { computePromotionFingerprint } from "../autonomy/promotionFingerprint.js";
import { isDemoted, readPromotion } from "../autonomy/promotionStore.js";
import { evaluateDelegationForPlan } from "../delegated/delegationEngine.js";
import type { DelegationDecision } from "../delegated/delegatedTypes.js";
import { readDomainOverlay } from "../domains/domainRegistry.js";
import { deriveFingerprint } from "../governor/runGovernor.js";
import { readRequalificationState } from "../requalification/requalification.js";
import { readConfidence } from "../confidence/updateConfidence.js";
import { assertUrlSafeForL0, BrowserL0GuardError } from "../browser/l0/ssrfGuards.js";
import { recordPolicyHit, setPolicyCoverageAction } from "./policyCoverage.js";
import {
  CODES_AUTONOMY,
  CODES_AUDIO_UDIO,
  CODES_BROWSER_L0,
  CODES_COVERAGE,
  CODES_COMMON,
  CODES_CONFIDENCE,
  CODES_COMPETITIVE_BRIEF,
  CODES_DEV_BRIDGE,
  CODES_DEV_SERENA,
  CODES_DOCS_CAPTURE,
  CODES_DOMAIN_OVERLAY,
  CODES_LLM_ANTHROPIC,
  CODES_LLM_GOOGLE_AI_STUDIO,
  CODES_LIMB,
  CODES_MEETINGS_INGEST,
  CODES_MEDIA_DESCRIPT,
  CODES_MODE_GOVERNANCE,
  CODES_NOTION,
  CODES_NOTION_LIVE,
  CODES_NOTION_WRITE,
  CODES_POLICY_BUDGET,
  CODES_POLICY_ENGINE,
  CODES_PROD_APPROVAL,
  CODES_REQUALIFICATION,
  CODES_RESEARCH_NOTEBOOKLM,
  CODES_RESEARCH_PERPLEXITY,
  CODES_SCHEDULE_MOTION,
  CODES_SKILLS_APPLY,
  CODES_SKILLS_LEARN,
  CODES_URL_GUARD,
  CODES_VOICE_ELEVENLABS,
  CODES_VOICE_WISPRFLOW,
  CODES_WEBHOOK_INGEST,
  CODES_WRITING_GRAMMARLY,
} from "./policyRegistry.js";

export type PolicyDenied = {
  kind: "PolicyDenied";
  code: string;
  reason: string;
};

export type ApprovalRequired = {
  kind: "ApprovalRequired";
  code: string;
  reason: string;
  action: string;
  preview: {
    destination: string;
    summary: string;
  };
};

export type PolicyResult =
  | { allowed: true }
  | { allowed: false; denied: PolicyDenied }
  | { allowed: false; requireApproval: true; approval: ApprovalRequired };

export type PolicyResultMeta = {
  // Tier-19
  promotion_fingerprint?: string | null;
  // Tier-20
  delegation?: DelegationDecision | null;
};

export type PolicyResultWithMeta = PolicyResult & PolicyResultMeta;

export type PolicyMeta = {
  phase_id?: string;
  phases_count?: number;
  total_steps_planned?: number;
  // Tier 5.3: write-time approval gate.
  approved_execution_id?: string;
  execution_id?: string;
  // Tier-19: promotion fingerprint uses the originating command string.
  command?: string;
  // Tier-21: trust domain context.
  domain_id?: string;
  // Tier-21: audit-friendly original command string when wrapped.
  original_command?: string;
};

function getAutonomyMode(env: NodeJS.ProcessEnv): string {
  return env.AUTONOMY_MODE || "OFF";
}

function asInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function deny(code: string, reason: string): PolicyResult {
  recordPolicyHit({ decision: "DENY", code });
  return { allowed: false, denied: { kind: "PolicyDenied", code, reason } };
}

function denyBudget(env: NodeJS.ProcessEnv, defaultCode: string, reason: string): PolicyResult {
  const override = String(env.POLICY_BUDGET_DENY_CODE ?? "").trim();
  const code = override || defaultCode;
  return deny(code, reason);
}

function requireApproval(params: {
  code: string;
  reason: string;
  action: string;
  destination: string;
  summary: string;
}): PolicyResult {
  recordPolicyHit({ action: params.action, decision: "APPROVAL_REQUIRED", code: params.code });
  return {
    allowed: false,
    requireApproval: true,
    approval: {
      kind: "ApprovalRequired",
      code: params.code,
      reason: params.reason,
      action: params.action,
      preview: { destination: params.destination, summary: params.summary },
    },
  };
}

function parseCsv(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isProd(env: NodeJS.ProcessEnv) {
  const e = String(env.ENVIRONMENT ?? "").toLowerCase();
  const n = String(env.NODE_ENV ?? "").toLowerCase();
  return e === "production" || n === "production";
}

function methodIsWrite(method: ExecutionStep["method"]) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function methodIsReadOnly(method: ExecutionStep["method"]) {
  return method === "GET" || method === "HEAD";
}

function findForbiddenKeyDeep(value: unknown, forbiddenKeysLower: Set<string>, opts?: { maxDepth?: number }): string | null {
  const maxDepth = typeof opts?.maxDepth === "number" ? opts.maxDepth : 8;
  const seen = new Set<unknown>();

  const walk = (v: unknown, depth: number): string | null => {
    if (!v || depth > maxDepth) return null;
    if (typeof v !== "object") return null;
    if (seen.has(v)) return null;
    seen.add(v);

    if (Array.isArray(v)) {
      for (const item of v) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return null;
    }

    for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
      if (forbiddenKeysLower.has(String(k).toLowerCase())) return String(k);
      const found = walk(child, depth + 1);
      if (found) return found;
    }
    return null;
  };

  return walk(value, 0);
}

function uniqueHostsFromSteps(steps: ExecutionStep[]): string[] {
  const hosts = new Set<string>();
  for (const step of steps) {
    try {
      hosts.add(new URL(step.url).hostname);
    } catch {
      // ignore here; URL validity is handled elsewhere
    }
  }
  return Array.from(hosts).sort();
}

function parseNumberEnv(envValue: string | undefined): number | null {
  if (!envValue) return null;
  const n = Number(envValue);
  return Number.isFinite(n) ? n : null;
}

function parseUtcHm(envValue: string | undefined): { hour: number; minute: number } | null {
  if (!envValue) return null;
  const m = String(envValue).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function utf8Bytes(value: string): number {
  return Buffer.byteLength(String(value ?? ""), "utf8");
}

function jsonBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    // If it cannot be stringified, treat as very large to force a deny.
    return Number.POSITIVE_INFINITY;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasRequiredCapability(plan: any, cap: string): boolean {
  const req = Array.isArray((plan as any).required_capabilities) ? (plan as any).required_capabilities : [];
  return req.some((c: any) => typeof c === "string" && c === cap);
}

function isUnderRuns(p: string): boolean {
  const norm = String(p ?? "").replace(/\\/g, "/");
  return norm === "runs" || norm.startsWith("runs/");
}

export function checkPlanPolicy(plan: any, env: NodeJS.ProcessEnv = process.env) {
  const maxSteps = asInt(env.POLICY_MAX_STEPS, 10);
  const maxRuntimeMs = asInt(env.POLICY_MAX_RUNTIME_MS, 30000);

  const steps = plan?.steps || plan?.phases?.flatMap((p: any) => p.steps) || [];

  if (steps.length > maxSteps) {
    return {
      kind: 'PolicyDenied',
      code: String(env.POLICY_BUDGET_DENY_CODE ?? '').trim() || CODES_POLICY_BUDGET.MAX_STEPS_EXCEEDED,
      reason: `Plan has ${steps.length} steps; max is ${maxSteps}`
    };
  }

  // Cap per-step timeout (if present)
  for (const s of steps) {
    const t = s?.timeout_ms;
    if (typeof t === 'number' && t > maxRuntimeMs) {
      return {
        kind: 'PolicyDenied',
        code: String(env.POLICY_BUDGET_DENY_CODE ?? '').trim() || CODES_POLICY_BUDGET.MAX_RUNTIME_EXCEEDED,
        reason: `Step timeout ${t}ms exceeds policy cap ${maxRuntimeMs}ms`
      };
    }
  }

  // Autonomy mode enforcement is step-scoped (below), but we also block obvious mixed-mode:
  const mode = getAutonomyMode(env);
  if (mode === 'READ_ONLY_AUTONOMY') {
    const hasWrite = steps.some((s: any) => s?.read_only === false);
    if (hasWrite) {
      return {
        kind: 'PolicyDenied',
        code: CODES_AUTONOMY.READ_ONLY_VIOLATION,
        reason: 'READ_ONLY_AUTONOMY forbids any step with read_only=false'
      };
    }
  }

  // Optional Mode/Limb governance enforcement (operator-driven).
  // This is intentionally opt-in to avoid breaking existing deployments.
  if (env.SINTRAPRIME_MODE_GOVERNANCE_ENFORCE === "1") {
    const declaredMode = String(env.SINTRAPRIME_MODE ?? "").trim();
    const declarationPath = String(env.SINTRAPRIME_MODE_DECLARATION_PATH ?? "").trim();
    const activeLimbs = new Set(parseCsv(env.SINTRAPRIME_ACTIVE_LIMBS));

    if (!declaredMode) {
      return {
        kind: "PolicyDenied",
        code: CODES_MODE_GOVERNANCE.DECLARATION_MISSING,
        reason: "SINTRAPRIME_MODE_GOVERNANCE_ENFORCE=1 requires SINTRAPRIME_MODE",
      };
    }

    if (!declarationPath) {
      return {
        kind: "PolicyDenied",
        code: CODES_MODE_GOVERNANCE.DECLARATION_MISSING,
        reason: "SINTRAPRIME_MODE_GOVERNANCE_ENFORCE=1 requires SINTRAPRIME_MODE_DECLARATION_PATH",
      };
    }

    try {
      if (!fs.existsSync(declarationPath)) {
        return {
          kind: "PolicyDenied",
          code: CODES_MODE_GOVERNANCE.DECLARATION_NOT_FOUND,
          reason: `Mode declaration sheet not found at: ${declarationPath}`,
        };
      }
    } catch {
      return {
        kind: "PolicyDenied",
        code: CODES_MODE_GOVERNANCE.DECLARATION_NOT_FOUND,
        reason: `Mode declaration sheet not found at: ${declarationPath}`,
      };
    }

    if (declaredMode === "FROZEN") {
      return {
        kind: "PolicyDenied",
        code: CODES_MODE_GOVERNANCE.FROZEN,
        reason: "SINTRAPRIME_MODE=FROZEN denies execution",
      };
    }

    const needsNotionWrite = steps.some((s: any) => typeof s?.action === "string" && s.action.startsWith("notion.write."));
    const needsNotionLiveWrite = steps.some((s: any) => s?.action === "notion.live.write");

    if ((needsNotionWrite || needsNotionLiveWrite) && declaredMode !== "SINGLE_RUN_APPROVED") {
      return {
        kind: "PolicyDenied",
        code: CODES_MODE_GOVERNANCE.WRITE_REQUIRES_SINGLE_RUN_APPROVED,
        reason: "Notion write/live-write requires SINTRAPRIME_MODE=SINGLE_RUN_APPROVED",
      };
    }

    if (needsNotionWrite && !activeLimbs.has("notion.write")) {
      return {
        kind: "PolicyDenied",
        code: CODES_LIMB.INACTIVE,
        reason: "Plan requires Notion write but limb 'notion.write' is not ACTIVE",
      };
    }

    if (needsNotionLiveWrite && !activeLimbs.has("notion.live.write")) {
      return {
        kind: "PolicyDenied",
        code: CODES_LIMB.INACTIVE,
        reason: "Plan requires Notion live write but limb 'notion.live.write' is not ACTIVE",
      };
    }
  }

  return null;
}

export function checkPolicy(plan: ExecutionPlan, env: NodeJS.ProcessEnv, clock: Date): PolicyResult {
  return checkPolicyWithMeta(plan, env, clock, undefined);
}

export function checkPolicyWithMeta(
  plan: ExecutionPlan,
  env: NodeJS.ProcessEnv,
  clock: Date,
  meta: PolicyMeta | undefined
): PolicyResultWithMeta {
  const autonomyMode = getAutonomyMode(env);

  // Tier-16: confidence regression enforcement (pre-execution).
  // If confidence is too low, only allow fully read-only plans.
  {
    const command = typeof meta?.command === "string" ? meta.command : "";
    if (command) {
      const fp = deriveFingerprint({ command, domain_id: meta?.domain_id ?? null });
      const confidence = readConfidence(fp).confidence;
      if (confidence <= 0.4) {
        const hasWrite = plan.steps.some((s: any) => s?.read_only === false || methodIsWrite(s?.method));
        if (hasWrite) {
          return {
            allowed: false,
            denied: {
              kind: "PolicyDenied",
              code: CODES_CONFIDENCE.TOO_LOW,
              reason: "confidence <= 0.4 forbids execution of write-capable steps",
            },
            promotion_fingerprint: null,
            delegation: null,
          };
        }
      }
    }
  }

  // Tier-22.1: probation enforcement (policy-level; no writes / approvals).
  // This runs before approval gating so probation cannot silently restore write power.
  {
    const enabled = env.REQUALIFICATION_ENABLED === "1";
    const command = typeof meta?.command === "string" ? meta.command : "";
    if (enabled && command) {
      const fingerprint = deriveFingerprint({ command, domain_id: meta?.domain_id ?? null });
      const state = readRequalificationState(fingerprint);
      if (state && state.state !== "ACTIVE") {
        if (state.state === "PROBATION") {
          const anyNonReadOnly = plan.steps.some((s: any) => s?.read_only !== true);
          if (anyNonReadOnly) {
            return {
              allowed: false,
              denied: {
                kind: "PolicyDenied",
                code: CODES_REQUALIFICATION.PROBATION_READ_ONLY_ENFORCED,
                reason: "probation requires all steps to be explicitly read_only:true",
              },
              promotion_fingerprint: null,
              delegation: null,
            };
          }
        } else {
          const hasWrite = plan.steps.some((s: any) => s?.read_only === false || methodIsWrite(s?.method));
          if (hasWrite) {
            const reason = `requalification state=${state.state} forbids write operations`;
            return {
              allowed: false,
              denied: { kind: "PolicyDenied", code: CODES_REQUALIFICATION.BLOCKED, reason },
              promotion_fingerprint: null,
              delegation: null,
            };
          }
        }
      }
    }
  }

  // Tier-21: domain overlay enforcement (overlay can tighten, never loosen).
  {
    const overlay = readDomainOverlay(meta?.domain_id);
    if (overlay?.deny_write === true) {
      const hasWrite = plan.steps.some((s: any) => s?.read_only === false || methodIsWrite(s?.method));
      if (hasWrite) {
        return {
          allowed: false,
          denied: {
            kind: "PolicyDenied",
            code: CODES_DOMAIN_OVERLAY.DENY_WRITE,
            reason: "domain overlay forbids write operations",
          },
          promotion_fingerprint: null,
          delegation: null,
        };
      }
    }
  }

  const promotionFingerprint = (() => {
    try {
      const requiredCaps = Array.isArray((plan as any).required_capabilities)
        ? (plan as any).required_capabilities.filter((c: any) => typeof c === "string")
        : [];
      const adapters = Array.from(new Set(plan.steps.map((s: any) => String(s?.adapter ?? "").trim()).filter(Boolean))).sort();
      const adapter_type = adapters.length ? adapters.join("+") : "unknown";
      const command = typeof (meta as any)?.command === "string" ? String((meta as any).command) : "";
      if (!command) return null;
      return computePromotionFingerprint({
        command,
        capability_set: requiredCaps,
        adapter_type,
      });
    } catch {
      return null;
    }
  })();

  const isPromotedForThisPlan = (() => {
    if (!promotionFingerprint) return false;
    if (isDemoted(promotionFingerprint)) return false;
    return readPromotion(promotionFingerprint) !== null;
  })();

  const delegationDecision: DelegationDecision | null = (() => {
    try {
      if (autonomyMode !== "APPROVAL_GATED_AUTONOMY") return null;
      const command = typeof (meta as any)?.command === "string" ? String((meta as any).command) : "";
      if (!command) return null;
      return evaluateDelegationForPlan({
        plan,
        command,
        autonomy_mode: autonomyMode,
        promoted: isPromotedForThisPlan,
      });
    } catch {
      return null;
    }
  })();

  const promotionMaySkipApprovalGate =
    isPromotedForThisPlan && !(delegationDecision?.matched === true && delegationDecision?.reason === "SUSPENDED");

  const resultMeta: PolicyResultMeta = {
    promotion_fingerprint: promotionFingerprint,
    delegation: delegationDecision,
  };

  const withMeta = (r: PolicyResult): PolicyResultWithMeta => ({
    ...(r as any),
    ...resultMeta,
  });

  const approved =
    meta?.execution_id && meta?.approved_execution_id && meta.execution_id === meta.approved_execution_id;

  // Tier-13: PROPOSE_ONLY/APPROVAL_GATED autonomy.
  // These modes allow planning + queuing approvals but MUST NOT execute write-capable steps.
  if (autonomyMode === "PROPOSE_ONLY_AUTONOMY" || autonomyMode === "APPROVAL_GATED_AUTONOMY") {
    for (const step of plan.steps) {
      if ((step as any).read_only !== true) {
        // In APPROVAL_GATED_AUTONOMY, allow approved executions to proceed.
        if (
          autonomyMode === "APPROVAL_GATED_AUTONOMY" &&
          (approved ||
            promotionMaySkipApprovalGate ||
            (delegationDecision && delegationDecision.active === true && delegationDecision.reason === "OK"))
        ) {
          continue;
        }
        return withMeta(
          requireApproval({
          code: CODES_AUTONOMY.APPROVAL_REQUIRED,
          reason: `${autonomyMode} forbids execution of write-capable steps (approval required)` ,
          action: typeof (step as any).action === "string" ? String((step as any).action) : "unknown",
          destination: (() => {
            try {
              const u = new URL(step.url);
              return `${u.hostname}${u.pathname}`;
            } catch {
              return String(step.url || "unknown");
            }
          })(),
          summary: `${String(step.method || "GET").toUpperCase()} ${String(step.url || "")}`,
          })
        );
      }
    }
  }

  if (autonomyMode === "READ_ONLY_AUTONOMY") {
    for (const step of plan.steps) {
      // In READ_ONLY_AUTONOMY, every step must be explicitly marked read-only.
      if ((step as any).read_only !== true) {
        return withMeta(
          deny(
          CODES_AUTONOMY.READ_ONLY_VIOLATION,
          "READ_ONLY_AUTONOMY forbids execution of write-capable steps"
          )
        );
      }
    }
  }

  // Tier 5.2: phase-aware budget guards (deterministic, no branching).
  const maxPhases = parseNumberEnv(env.POLICY_MAX_PHASES);
  if (maxPhases !== null && meta?.phases_count !== undefined && meta.phases_count > maxPhases) {
    return withMeta(
      denyBudget(
      env,
      CODES_POLICY_BUDGET.MAX_PHASES,
      `plan has ${meta.phases_count} phases; max ${maxPhases}`
      )
    );
  }

  const maxTotalSteps = parseNumberEnv(env.POLICY_MAX_TOTAL_STEPS);
  if (maxTotalSteps !== null && meta?.total_steps_planned !== undefined && meta.total_steps_planned > maxTotalSteps) {
    return withMeta(
      denyBudget(
      env,
      CODES_POLICY_BUDGET.MAX_TOTAL_STEPS,
      `plan has ${meta.total_steps_planned} total steps; max ${maxTotalSteps}`
      )
    );
  }

  // 0) Capability allowlist (Tier 5.1)
  const allowedCaps = parseCsv(env.POLICY_ALLOWED_CAPABILITIES);
  if (allowedCaps.length) {
    const requiredCaps = Array.isArray((plan as any).required_capabilities)
      ? (plan as any).required_capabilities
      : [];
    for (const cap of requiredCaps) {
      if (typeof cap !== "string") {
        return withMeta(deny(CODES_POLICY_ENGINE.CAPABILITY_INVALID, "required_capabilities must be string[]"));
      }
      if (!allowedCaps.includes(cap)) {
        return withMeta(deny(CODES_POLICY_ENGINE.CAPABILITY_NOT_ALLOWED, `capability ${cap} not allowlisted`));
      }
    }
  }

  // 1) Protocol guard (basic safety)
  for (const step of plan.steps) {
    // Action context must be set before any early returns so coverage logs never
    // attribute step-level policy decisions to UNKNOWN_ACTION.
    const action = typeof (step as any).action === "string" ? ((step as any).action as string) : "";
    setPolicyCoverageAction(action);

    let url: URL;
    try {
      url = new URL(step.url);
    } catch {
      // For browser.l0.* actions we use the action-scoped code so STRICT can prove it.
      const isBrowserL0Action = action === "browser.l0" || action.startsWith("browser.l0.");
      if (isBrowserL0Action) {
        return withMeta(deny(CODES_BROWSER_L0.BAD_URL, `invalid url: ${step.url}`));
      }
      return withMeta(deny(CODES_POLICY_ENGINE.URL_INVALID, `invalid url: ${step.url}`));
    }

    // Tier-10.x: Live Notion safety rails (read-only by default; writes approval-scoped)
    const isNotionLiveEndpoint = url.hostname === "api.notion.com" && url.pathname.startsWith("/v1/");
    const isNotionLiveAction = action.startsWith("notion.live.");
    if (isNotionLiveEndpoint || isNotionLiveAction) {
      const method = String(step.method || "GET").toUpperCase();
      const readOnlyFlag = (step as any).read_only;

      // 1) If it's not explicitly read_only, it MUST be approval_scoped and have prestate.
      if (readOnlyFlag !== true) {
        const approvalScoped = (step as any).approval_scoped;
        if (approvalScoped !== true) {
          return withMeta(
            deny(
            CODES_NOTION_LIVE.REQUIRES_READ_ONLY,
            "Live Notion requires read_only=true unless approval_scoped=true"
            )
          );
        }

        const hasPrestate = !!(step as any).prestate;
        const hasFingerprint = typeof (step as any).prestate_fingerprint === "string" && String((step as any).prestate_fingerprint).trim();
        if (!hasPrestate || !hasFingerprint) {
          return withMeta(
            deny(
            CODES_NOTION_LIVE.WRITE_REQUIRES_PRESTATE,
            "Approval-scoped live writes require prestate + prestate_fingerprint"
            )
          );
        }

        if (method !== "PATCH") {
          return withMeta(
            deny(
            CODES_NOTION_LIVE.WRITE_METHOD_NOT_ALLOWED,
            "Only PATCH allowed for approval-scoped live notion writes"
            )
          );
        }

        // Live writes must be explicitly approved (Tier 10.2) using the same approval token mechanism.
        if (!approved) {
          const destination = `${url.hostname}${url.pathname}`;
          return withMeta(
            requireApproval({
            code: CODES_NOTION_LIVE.WRITE_APPROVAL_REQUIRED,
            reason: "Live Notion writes require explicit approval (Tier 10.2)",
            action,
            destination,
            summary: `PATCH ${url.pathname}`,
            })
          );
        }
      }

      // 2) Read-only method constraints
      if (readOnlyFlag === true) {
        if (method !== "GET" && method !== "HEAD") {
          return withMeta(
            deny(
            CODES_NOTION_LIVE.METHOD_NOT_ALLOWED,
            "Only GET/HEAD allowed for notion.live.read"
            )
          );
        }
      }
    }

    // Tier-XX: Vendor docs capture is a separate evidence lane.
    // It is deny-by-default and requires an explicit host allowlist.
    const isDocsCaptureAction = action === "docs.capture" || action.startsWith("docs.capture.");
    if (isDocsCaptureAction) {
      const method = String(step.method || "GET").toUpperCase();
      const readOnlyFlag = (step as any).read_only;

      if (readOnlyFlag !== true) {
        return withMeta(deny(CODES_DOCS_CAPTURE.REQUIRES_READ_ONLY, "docs.capture requires read_only=true"));
      }

      if (method !== "GET" && method !== "HEAD") {
        return withMeta(deny(CODES_DOCS_CAPTURE.METHOD_NOT_ALLOWED, "docs.capture only allows GET/HEAD"));
      }

      const allowedHosts = parseCsv(env.DOCS_CAPTURE_ALLOWED_HOSTS);
      if (!allowedHosts.length) {
        return withMeta(
          deny(
            CODES_DOCS_CAPTURE.HOST_NOT_ALLOWED,
            "DOCS_CAPTURE_ALLOWED_HOSTS is not set (deny-by-default for docs capture)"
          )
        );
      }

      if (!allowedHosts.includes(url.hostname)) {
        return withMeta(
          deny(CODES_DOCS_CAPTURE.HOST_NOT_ALLOWED, `host ${url.hostname} not allowlisted for docs capture`)
        );
      }
    }

    // Browser L0 (read-only) is a separate evidence lane.
    // It is deny-by-default and requires an explicit host allowlist for http(s) URLs.
    const isBrowserL0Action = action === "browser.l0" || action.startsWith("browser.l0.");
    if (isBrowserL0Action) {
      const method = String(step.method || "GET").toUpperCase();
      const readOnlyFlag = (step as any).read_only;

      if (readOnlyFlag !== true) {
        return withMeta(deny(CODES_BROWSER_L0.REQUIRES_READ_ONLY, "browser.l0 requires read_only=true"));
      }

      if (method !== "GET" && method !== "HEAD") {
        return withMeta(deny(CODES_BROWSER_L0.METHOD_NOT_ALLOWED, "browser.l0 only allows GET/HEAD"));
      }

      const allowData = String(env.BROWSER_L0_ALLOW_DATA ?? "1").trim() !== "0";
      const allowHttp = String(env.BROWSER_L0_ALLOW_HTTP ?? "0").trim() === "1";
      const allowedSchemes = allowData
        ? allowHttp
          ? ["https:", "http:", "data:"]
          : ["https:", "data:"]
        : allowHttp
          ? ["https:", "http:"]
          : ["https:"];

      const allowedHosts = parseCsv(env.BROWSER_L0_ALLOWED_HOSTS);

      try {
        assertUrlSafeForL0(step.url, { allowedSchemes, allowedHosts });
      } catch (err: any) {
        if (err instanceof BrowserL0GuardError) {
          if (err.code === CODES_URL_GUARD.SCHEME_NOT_ALLOWED) {
            return withMeta(deny(CODES_URL_GUARD.SCHEME_NOT_ALLOWED, err.message));
          }
          if (err.code === CODES_URL_GUARD.HOST_NOT_ALLOWED) {
            return withMeta(deny(CODES_URL_GUARD.HOST_NOT_ALLOWED, err.message));
          }
          if (err.code === CODES_URL_GUARD.SSRF_GUARD_BLOCKED) {
            return withMeta(deny(CODES_URL_GUARD.SSRF_GUARD_BLOCKED, err.message));
          }
          return withMeta(deny(CODES_BROWSER_L0.BAD_URL, err.message));
        }
        return withMeta(deny(CODES_BROWSER_L0.BAD_URL, String(err?.message ?? err)));
      }

      // data: is offline and deterministic; allow it through the generic protocol guard.
      if (url.protocol === "data:") {
        continue;
      }
    }

    // CompetitiveBrief: tight 3-pass pipeline (no crawling).
    // This step executes locally but must enforce Browser L0 constraints for each declared target.
    if (action === "competitive.brief.v1") {
      const method = String(step.method || "GET").toUpperCase();
      const readOnlyFlag = (step as any).read_only;

      if (!hasRequiredCapability(plan as any, "browser:l0")) {
        return withMeta(deny(CODES_COMMON.CAPABILITY_MISSING, "competitive.brief.v1 requires capability browser:l0"));
      }

      if (readOnlyFlag !== true) {
        return withMeta(
          deny(CODES_COMPETITIVE_BRIEF.REQUIRES_READ_ONLY, "competitive.brief.v1 requires read_only=true")
        );
      }

      if (method !== "GET" && method !== "HEAD") {
        return withMeta(
          deny(CODES_COMPETITIVE_BRIEF.METHOD_NOT_ALLOWED, "competitive.brief.v1 only allows GET/HEAD")
        );
      }

      const payload = (step as any).payload;
      if (!isPlainObject(payload)) {
        return withMeta(
          deny(CODES_COMPETITIVE_BRIEF.PAYLOAD_INVALID, "competitive.brief.v1 requires object payload")
        );
      }

      // Belt + suspenders: deny any crawl/spider/discovery fields even if schema disallows them.
      const forbiddenKeys = [
        "crawl",
        "spider",
        "sitemap",
        "followLinks",
        "follow_links",
        "discoverLinks",
        "discover",
        "explore",
        "autoDiscover",
        "auto_discover",
        "seedUrls",
        "seed_urls",
        "linkDepth",
        "link_depth",
        "maxDepth",
        "max_depth",
        "harvest",
        "recursion",
      ];
      for (const k of forbiddenKeys) {
        if (Object.prototype.hasOwnProperty.call(payload, k)) {
          return withMeta(deny(CODES_COMPETITIVE_BRIEF.NO_CRAWL_FIELDS_ALLOWED, `field not allowed: ${k}`));
        }
      }

      const targetsRaw = (payload as any).targets;
      const targets: string[] = Array.isArray(targetsRaw) ? targetsRaw.map((t: any) => String(t)) : [];
      if (!targets.length) {
        return withMeta(deny(CODES_COMPETITIVE_BRIEF.TARGETS_REQUIRED, "targets must be a non-empty array"));
      }

      const wideResearch = isPlainObject((payload as any).wideResearch) ? ((payload as any).wideResearch as any) : null;
      if (wideResearch && wideResearch.enabled === true) {
        const destination = `${url.hostname}${url.pathname}`;
        return withMeta(
          requireApproval({
            code: CODES_COMPETITIVE_BRIEF.WIDE_RESEARCH_REQUIRES_APPROVAL,
            reason: "wideResearch.enabled=true requires explicit approval",
            action,
            destination,
            summary: "CompetitiveBrief Wide Research escalation",
          })
        );
      }

      const allowTargets = 3;
      if (targets.length > allowTargets) {
        const destination = `${url.hostname}${url.pathname}`;
        return withMeta(
          requireApproval({
            code: CODES_COMPETITIVE_BRIEF.TOO_MANY_TARGETS,
            reason: `targets=${targets.length} exceeds allow threshold (${allowTargets})`,
            action,
            destination,
            summary: `CompetitiveBrief targets=${targets.length}`,
          })
        );
      }

      const screenshot = isPlainObject((payload as any).screenshot) ? ((payload as any).screenshot as any) : null;
      if (screenshot && screenshot.enabled === true) {
        const mode = screenshot.mode ?? "strict";
        if (mode !== "same_origin" && mode !== "strict") {
          return withMeta(deny(CODES_COMPETITIVE_BRIEF.SCREENSHOT_MODE_NOT_ALLOWED, `mode=${String(mode)}`));
        }

        const maxRequestsRaw = env.BROWSER_L0_MAX_REQUESTS;
        const envMaxRequests =
          maxRequestsRaw && Number.isFinite(Number(maxRequestsRaw))
            ? Math.max(1, Math.floor(Number(maxRequestsRaw)))
            : mode === "strict"
              ? 25
              : 120;

        if (screenshot.maxRequests !== undefined && screenshot.maxRequests !== null) {
          const mr = Number(screenshot.maxRequests);
          if (!Number.isFinite(mr) || mr < 1) {
            return withMeta(
              deny(
                CODES_COMPETITIVE_BRIEF.SCREENSHOT_MAX_REQUESTS_INVALID,
                `maxRequests=${String(screenshot.maxRequests)}`
              )
            );
          }
          if (Math.floor(mr) > envMaxRequests) {
            return withMeta(
              deny(
                CODES_COMPETITIVE_BRIEF.SCREENSHOT_MAX_REQUESTS_TOO_HIGH,
                `maxRequests=${String(screenshot.maxRequests)} exceeds env max (${envMaxRequests})`
              )
            );
          }
        }
      }

      // Enforce Browser L0 SSRF/allowlist guards for each target.
      const allowData = String(env.BROWSER_L0_ALLOW_DATA ?? "1").trim() !== "0";
      const allowHttp = String(env.BROWSER_L0_ALLOW_HTTP ?? "0").trim() === "1";
      const allowedSchemes = allowData
        ? allowHttp
          ? ["https:", "http:", "data:"]
          : ["https:", "data:"]
        : allowHttp
          ? ["https:", "http:"]
          : ["https:"];
      const allowedHosts = parseCsv(env.BROWSER_L0_ALLOWED_HOSTS);

      for (const targetUrl of targets) {
        try {
          assertUrlSafeForL0(targetUrl, { allowedSchemes, allowedHosts });
        } catch (err: any) {
          if (err instanceof BrowserL0GuardError) {
            if (err.code === CODES_URL_GUARD.SCHEME_NOT_ALLOWED) {
              return withMeta(deny(CODES_URL_GUARD.SCHEME_NOT_ALLOWED, err.message));
            }
            if (err.code === CODES_URL_GUARD.HOST_NOT_ALLOWED) {
              return withMeta(deny(CODES_URL_GUARD.HOST_NOT_ALLOWED, err.message));
            }
            if (err.code === CODES_URL_GUARD.SSRF_GUARD_BLOCKED) {
              return withMeta(deny(CODES_URL_GUARD.SSRF_GUARD_BLOCKED, err.message));
            }
            return withMeta(deny(CODES_COMPETITIVE_BRIEF.BAD_TARGET, err.message));
          }
          return withMeta(deny(CODES_COMPETITIVE_BRIEF.BAD_TARGET, String(err?.message ?? err)));
        }
      }

      // This action is local; no additional URL protocol checks apply beyond target validation.
      continue;
    }

    // skills.learn.v1: write-only by contract (emits patch.diff + plan.json under runs/**).
    if (action === "skills.learn.v1") {
      const method = String(step.method || "GET").toUpperCase();
      const readOnlyFlag = (step as any).read_only;

      if (readOnlyFlag !== true) {
        return withMeta(deny(CODES_SKILLS_LEARN.REQUIRES_READ_ONLY, "skills.learn.v1 requires read_only=true"));
      }

      if (method !== "GET" && method !== "HEAD") {
        return withMeta(deny(CODES_SKILLS_LEARN.METHOD_NOT_ALLOWED, "skills.learn.v1 only allows GET/HEAD"));
      }

      if (!hasRequiredCapability(plan as any, "skills:learn")) {
        return withMeta(deny(CODES_COMMON.CAPABILITY_MISSING, "skills.learn.v1 requires capability skills:learn"));
      }

      const payload = (step as any).payload;
      if (!isPlainObject(payload)) {
        return withMeta(deny(CODES_SKILLS_LEARN.PAYLOAD_INVALID, "skills.learn.v1 requires object payload"));
      }

      const mode = (payload as any).mode;
      if (mode !== undefined && mode !== "patch_only") {
        return withMeta(deny(CODES_SKILLS_LEARN.MODE_NOT_ALLOWED, `mode=${String(mode)}`));
      }

      const req = (payload as any).request;
      if (typeof req !== "string" || !String(req).trim()) {
        return withMeta(deny(CODES_SKILLS_LEARN.REQUEST_REQUIRED, "skills.learn.v1 requires request"));
      }

      // Defense-in-depth: deny apply-ish intent flags if present.
      const applyishKeys = [
        "apply",
        "execute",
        "run",
        "deploy",
        "publish",
        "merge",
        "push",
        "commit",
        "writeFiles",
        "fileWrites",
        "shell",
        "commands",
      ];

      const forbidden = new Set(applyishKeys.map((k) => String(k).toLowerCase()));
      const found = findForbiddenKeyDeep(payload, forbidden, { maxDepth: 10 });
      if (found) {
        return withMeta(deny(CODES_SKILLS_LEARN.APPLY_INTENT_NOT_ALLOWED, `field not allowed: ${found}`));
      }
    }

    // skills.apply.v1: the only door to repo mutation (approval gated).
    if (action === "skills.apply.v1") {
      // POLICY_TIER: approval_only
      const method = String(step.method || "POST").toUpperCase();
      const readOnlyFlag = (step as any).read_only;

      if (readOnlyFlag === true) {
        return withMeta(deny(CODES_SKILLS_APPLY.REQUIRES_WRITE_STEP, "skills.apply.v1 must not be read_only"));
      }

      if (method !== "POST") {
        return withMeta(deny(CODES_SKILLS_APPLY.METHOD_NOT_ALLOWED, "skills.apply.v1 only allows POST"));
      }

      if (!hasRequiredCapability(plan as any, "skills:apply")) {
        return withMeta(deny(CODES_COMMON.CAPABILITY_MISSING, "skills.apply.v1 requires capability skills:apply"));
      }

      const payload = (step as any).payload;
      if (!isPlainObject(payload)) {
        return withMeta(deny(CODES_SKILLS_APPLY.PAYLOAD_INVALID, "skills.apply.v1 requires object payload"));
      }

      const patchPath = typeof (payload as any).patch_path === "string" ? String((payload as any).patch_path) : "";
      if (!patchPath.trim()) {
        return withMeta(deny(CODES_SKILLS_APPLY.PATCH_PATH_MISSING, "skills.apply.v1 requires patch_path"));
      }
      if (!isUnderRuns(patchPath)) {
        return withMeta(deny(CODES_SKILLS_APPLY.PATCH_PATH_NOT_ALLOWED, "patch_path must be under runs/**"));
      }

      const patchSha = typeof (payload as any).patch_sha256 === "string" ? String((payload as any).patch_sha256) : "";
      if (!/^[a-f0-9]{64}$/i.test(patchSha)) {
        return withMeta(
          deny(CODES_SKILLS_APPLY.PATCH_SHA256_INVALID, `patch_sha256=${patchSha || "(missing)"}`)
        );
      }

      if (!approved) {
        const destination = `${url.hostname}${url.pathname}`;
        return withMeta(
          requireApproval({
            code: CODES_SKILLS_APPLY.REQUIRES_APPROVAL,
            reason: "skills.apply.v1 is approval-gated",
            action,
            destination,
            summary: `Apply patch ${patchPath}`,
          })
        );
      }
    }

    // Tier-PR-A: integrations.webhook.ingest.v1 (pure ingest, no outbound).
    if (action === "integrations.webhook.ingest.v1") {
      if (!hasRequiredCapability(plan as any, "integrations:webhook")) {
        return withMeta(
          deny(
            CODES_COMMON.CAPABILITY_MISSING,
            "integrations.webhook.ingest.v1 requires capability integrations:webhook"
          )
        );
      }

      const readOnlyFlag = (step as any).read_only;
      if (readOnlyFlag !== true) {
        return withMeta(
          deny(CODES_WEBHOOK_INGEST.REQUIRES_READ_ONLY, "integrations.webhook.ingest.v1 requires read_only=true")
        );
      }

      const method = String(step.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        return withMeta(
          deny(CODES_WEBHOOK_INGEST.METHOD_NOT_ALLOWED, "integrations.webhook.ingest.v1 only allows GET/HEAD")
        );
      }

      // Compatibility shim: accept payload from step.payload (canonical) or common vendor shapes
      // like step.args/body/event/input. This does NOT change decision codes; it only normalizes
      // where the JSON object is read from.
      const rawPayload =
        (step as any).payload ?? (step as any).args ?? (step as any).body ?? (step as any).event ?? (step as any).input;

      if (!isPlainObject(rawPayload)) {
        return withMeta(
          deny(CODES_WEBHOOK_INGEST.PAYLOAD_INVALID, "integrations.webhook.ingest.v1 requires object payload")
        );
      }

      const payloadCandidate =
        isPlainObject((rawPayload as any).payload)
          ? ((rawPayload as any).payload as any)
          : isPlainObject((rawPayload as any).data)
            ? ((rawPayload as any).data as any)
            : (rawPayload as any);

      const payload = payloadCandidate;

      const maxBytes = asInt(env.INTEGRATIONS_WEBHOOK_MAX_BYTES, 64 * 1024);
      const bytes = jsonBytes(payload);
      if (!Number.isFinite(bytes) || bytes > maxBytes) {
        return withMeta(
          deny(
            CODES_WEBHOOK_INGEST.PAYLOAD_TOO_LARGE,
            `payload_bytes=${Number.isFinite(bytes) ? bytes : "(unserializable)"} exceeds max ${maxBytes}`
          )
        );
      }

      // Deny outbound intent keys at any depth.
      const outboundKeys = new Set(
        [
          "fetch",
          "request",
          "http",
          "url",
          "urls",
          "browser",
          "navigate",
          "screenshot",
          "domExtract",
          "openUrl",
          "download",
          "upload",
          "send",
          "post",
          "webhookCall",
        ].map((k) => k.toLowerCase())
      );
      const foundOutbound = findForbiddenKeyDeep(payload, outboundKeys, { maxDepth: 12 });
      if (foundOutbound) {
        return withMeta(deny(CODES_WEBHOOK_INGEST.OUTBOUND_NOT_ALLOWED, `field not allowed: ${foundOutbound}`));
      }

      // Deny secret-ish keys at any depth.
      const secretKeys = new Set(
        [
          "authorization",
          "apiKey",
          "token",
          "access_token",
          "refresh_token",
          "client_secret",
          "private_key",
          "cookie",
          "set-cookie",
        ].map((k) => k.toLowerCase())
      );
      const foundSecret = findForbiddenKeyDeep(payload, secretKeys, { maxDepth: 12 });
      if (foundSecret) {
        return withMeta(deny(CODES_WEBHOOK_INGEST.SECRETS_NOT_ALLOWED, `field not allowed: ${foundSecret}`));
      }
    }

    // Tier-PR-B: meeting ingest adapters (read-only ingest only; no outbound fetch).
    if (action === "meetings.fireflies.ingest.v1" || action === "meetings.fathom.ingest.v1") {
      const requiredCap = action.includes("fireflies") ? "meetings:fireflies" : "meetings:fathom";
      if (!hasRequiredCapability(plan as any, requiredCap)) {
        return withMeta(deny(CODES_COMMON.CAPABILITY_MISSING, `${action} requires capability ${requiredCap}`));
      }

      const readOnlyFlag = (step as any).read_only;
      if (readOnlyFlag !== true) {
        return withMeta(deny(CODES_MEETINGS_INGEST.REQUIRES_READ_ONLY, `${action} requires read_only=true`));
      }

      const method = String(step.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        return withMeta(deny(CODES_MEETINGS_INGEST.METHOD_NOT_ALLOWED, `${action} only allows GET/HEAD`));
      }

      const payload = (step as any).payload;
      if (!isPlainObject(payload)) {
        return withMeta(deny(CODES_MEETINGS_INGEST.PAYLOAD_INVALID, `${action} requires object payload`));
      }

      // Deny any outbound-ish keys.
      const outboundKeys = new Set(["meeting_url", "download_url", "fetch", "api"].map((k) => k.toLowerCase()));
      const foundOutbound = findForbiddenKeyDeep(payload, outboundKeys, { maxDepth: 10 });
      if (foundOutbound) {
        return withMeta(deny(CODES_MEETINGS_INGEST.OUTBOUND_NOT_ALLOWED, `field not allowed: ${foundOutbound}`));
      }

      // Deny secret-ish keys.
      const secretKeys = new Set(
        [
          "authorization",
          "apiKey",
          "token",
          "access_token",
          "refresh_token",
          "client_secret",
          "private_key",
          "cookie",
          "set-cookie",
        ].map((k) => k.toLowerCase())
      );
      const foundSecret = findForbiddenKeyDeep(payload, secretKeys, { maxDepth: 10 });
      if (foundSecret) {
        return withMeta(deny(CODES_MEETINGS_INGEST.SECRETS_NOT_ALLOWED, `field not allowed: ${foundSecret}`));
      }

      const maxBytes = asInt(env.MEETINGS_INGEST_MAX_BYTES, 2 * 1024 * 1024);

      // Allowed payload shapes:
      // - transcript_text: string
      // - export_json: object
      // - file_path: under runs/**
      const transcript = (payload as any).transcript_text;
      const exportJson = (payload as any).export_json;
      const filePath = typeof (payload as any).file_path === "string" ? String((payload as any).file_path) : "";

      let bytes = 0;
      if (typeof transcript === "string") {
        bytes = utf8Bytes(transcript);
      } else if (isPlainObject(exportJson)) {
        bytes = jsonBytes(exportJson);
      } else if (filePath) {
        if (!isUnderRuns(filePath)) {
          return withMeta(deny(CODES_MEETINGS_INGEST.PATH_NOT_ALLOWED, "file_path must be under runs/**"));
        }
        try {
          const st = fs.statSync(filePath);
          bytes = Number(st.size);
        } catch {
          return withMeta(deny(CODES_MEETINGS_INGEST.PAYLOAD_INVALID, `file_path not readable: ${filePath}`));
        }
      } else {
        return withMeta(
          deny(CODES_MEETINGS_INGEST.PAYLOAD_INVALID, "must include transcript_text, export_json, or file_path")
        );
      }

      if (!Number.isFinite(bytes) || bytes > maxBytes) {
        return withMeta(
          deny(CODES_MEETINGS_INGEST.TOO_LARGE, `bytes=${Number.isFinite(bytes) ? bytes : "(unknown)"} exceeds max ${maxBytes}`)
        );
      }
    }

    // Tier-PR-B: research.perplexity.fetch.v1 (budgeted, scope-locked).
    if (action === "research.perplexity.fetch.v1") {
      if (!hasRequiredCapability(plan as any, "research:perplexity")) {
        return withMeta(
          deny(
            CODES_COMMON.CAPABILITY_MISSING,
            "research.perplexity.fetch.v1 requires capability research:perplexity"
          )
        );
      }

      const readOnlyFlag = (step as any).read_only;
      if (readOnlyFlag !== true) {
        return withMeta(
          deny(CODES_RESEARCH_PERPLEXITY.REQUIRES_READ_ONLY, "research.perplexity.fetch.v1 requires read_only=true")
        );
      }

      const method = String(step.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        return withMeta(
          deny(CODES_RESEARCH_PERPLEXITY.METHOD_NOT_ALLOWED, "research.perplexity.fetch.v1 only allows GET/HEAD")
        );
      }

      const payload = (step as any).payload;
      if (!isPlainObject(payload)) {
        return withMeta(
          deny(CODES_RESEARCH_PERPLEXITY.PAYLOAD_INVALID, "research.perplexity.fetch.v1 requires object payload")
        );
      }

      // No crawl-ish fields, belt + suspenders.
      const crawlKeys = new Set(["crawl", "spider", "sitemap", "discover", "auto_expand", "browse_more"].map((k) => k.toLowerCase()));
      const foundCrawl = findForbiddenKeyDeep(payload, crawlKeys, { maxDepth: 10 });
      if (foundCrawl) {
        return withMeta(
          deny(CODES_RESEARCH_PERPLEXITY.NO_CRAWL_FIELDS_ALLOWED, `field not allowed: ${foundCrawl}`)
        );
      }

      const mode = typeof (payload as any).mode === "string" ? String((payload as any).mode) : "";
      if (mode !== "provided_urls_only") {
        return withMeta(
          deny(
            CODES_RESEARCH_PERPLEXITY.PAYLOAD_INVALID,
            `mode must be provided_urls_only (got ${mode || "(missing)"})`
          )
        );
      }

      const urlsRaw = (payload as any).urls;
      const urls: string[] = Array.isArray(urlsRaw) ? urlsRaw.map((u: any) => String(u)) : [];
      const allowedRaw = (payload as any).allowed_urls;
      const allowedUrls: string[] = Array.isArray(allowedRaw) ? allowedRaw.map((u: any) => String(u)) : [];
      if (!urls.length || !allowedUrls.length) {
        return withMeta(
          deny(CODES_RESEARCH_PERPLEXITY.PAYLOAD_INVALID, "urls and allowed_urls must be non-empty arrays")
        );
      }

      for (const u of urls) {
        if (!allowedUrls.includes(u)) {
          return withMeta(deny(CODES_RESEARCH_PERPLEXITY.URL_NOT_ALLOWED, `url not allowlisted: ${u}`));
        }
      }

      const searchWeb = (payload as any).search_web === true;
      const followLinks = (payload as any).follow_links === true;
      const includeRelated = (payload as any).include_related === true;

      const maxUsd = typeof (payload as any).max_usd === "number" ? (payload as any).max_usd : null;
      const maxTokens = typeof (payload as any).max_tokens === "number" ? (payload as any).max_tokens : null;
      if (maxUsd === null || maxTokens === null) {
        return withMeta(
          deny(CODES_RESEARCH_PERPLEXITY.PAYLOAD_INVALID, "max_usd and max_tokens are required numbers")
        );
      }

      const allowUsd = parseNumberEnv(env.RESEARCH_PERPLEXITY_MAX_USD_ALLOW) ?? 0;
      const allowTokens = parseNumberEnv(env.RESEARCH_PERPLEXITY_MAX_TOKENS_ALLOW) ?? 0;
      const hardUsd = parseNumberEnv(env.RESEARCH_PERPLEXITY_MAX_USD_HARD) ?? allowUsd;
      const hardTokens = parseNumberEnv(env.RESEARCH_PERPLEXITY_MAX_TOKENS_HARD) ?? allowTokens;

      if (maxUsd > hardUsd || maxTokens > hardTokens) {
        return withMeta(
          denyBudget(env, CODES_RESEARCH_PERPLEXITY.BUDGET_EXCEEDED, `budget exceeds hard caps`)
        );
      }

      const needsApproval =
        searchWeb ||
        followLinks ||
        includeRelated ||
        urls.length > 3 ||
        maxUsd > allowUsd ||
        maxTokens > allowTokens;

      if (needsApproval) {
        const destination = `${url.hostname}${url.pathname}`;
        return withMeta(
          requireApproval({
            code: CODES_RESEARCH_PERPLEXITY.SCOPE_EXPANDED,
            reason: "Perplexity scope expanded beyond Tier-1 allow caps",
            action,
            destination,
            summary: `Perplexity fetch urls=${urls.length} search_web=${searchWeb} follow_links=${followLinks} include_related=${includeRelated}`,
          })
        );
      }

      // Tier-1 tight allow: no web search/follow, <=3 urls, budgets within allow caps.
    }

    // Tier-PR-C: Serena dev bridge (dev-only, read-only, allowlisted actions).
    if (action.startsWith("dev.serena.")) {
      if (!hasRequiredCapability(plan as any, "dev:serena")) {
        return withMeta(deny(CODES_COMMON.CAPABILITY_MISSING, "dev.serena.* requires capability dev:serena"));
      }

      const declaredMode = String(env.SINTRAPRIME_MODE ?? "").trim();
      if (declaredMode !== "dev") {
        return withMeta(
          deny(CODES_DEV_SERENA.DEV_ONLY_TOOL, "Serena dev bridge is only allowed when SINTRAPRIME_MODE=dev")
        );
      }

      const readOnlyFlag = (step as any).read_only;
      if (readOnlyFlag !== true) {
        return withMeta(deny(CODES_DEV_SERENA.WRITE_NOT_ALLOWED, "Serena dev bridge requires read_only=true"));
      }

      const method = String(step.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        return withMeta(deny(CODES_DEV_SERENA.WRITE_NOT_ALLOWED, "Serena dev bridge only allows GET/HEAD"));
      }

      const allow = new Set([
        "dev.serena.find_symbol.v1",
        "dev.serena.find_referencing_symbols.v1",
        "dev.serena.get_symbols_overview.v1",
        "dev.serena.type_hierarchy.v1",
      ]);
      if (!allow.has(action)) {
        return withMeta(deny(CODES_DEV_SERENA.WRITE_NOT_ALLOWED, `action not allowlisted: ${action}`));
      }

      const payload = (step as any).payload;
      if (payload !== undefined && payload !== null) {
        const forbidden = new Set(["edit", "write", "apply", "patch", "commit", "exec", "shell"].map((k) => k.toLowerCase()));
        const found = findForbiddenKeyDeep(payload, forbidden, { maxDepth: 10 });
        if (found) {
          return withMeta(deny(CODES_DEV_SERENA.WRITE_NOT_ALLOWED, `field not allowed: ${found}`));
        }
      }
    }

    // Eden capture lane (dedicated capability; mirrors docs capture allowlist-only).
    if (action === "docs.eden.capture.v1") {
      if (!hasRequiredCapability(plan as any, "docs:eden")) {
        return withMeta(deny(CODES_COMMON.CAPABILITY_MISSING, "docs.eden.capture.v1 requires capability docs:eden"));
      }

      const method = String(step.method || "GET").toUpperCase();
      const readOnlyFlag = (step as any).read_only;

      if (readOnlyFlag !== true) {
        return withMeta(deny(CODES_DOCS_CAPTURE.REQUIRES_READ_ONLY, "docs.eden.capture.v1 requires read_only=true"));
      }

      if (method !== "GET" && method !== "HEAD") {
        return withMeta(deny(CODES_DOCS_CAPTURE.METHOD_NOT_ALLOWED, "docs.eden.capture.v1 only allows GET/HEAD"));
      }

      const allowedHosts = parseCsv(env.DOCS_CAPTURE_ALLOWED_HOSTS);
      if (!allowedHosts.length) {
        return withMeta(
          deny(
            CODES_DOCS_CAPTURE.HOST_NOT_ALLOWED,
            "DOCS_CAPTURE_ALLOWED_HOSTS is not set (deny-by-default for docs capture)"
          )
        );
      }

      if (!allowedHosts.includes(url.hostname)) {
        return withMeta(
          deny(CODES_DOCS_CAPTURE.HOST_NOT_ALLOWED, `host ${url.hostname} not allowlisted for docs capture`)
        );
      }
    }

    // Motion scheduling (side effects): always approval required.
    if (
      action === "schedule.motion.create_task.v1" ||
      action === "schedule.motion.update_task.v1" ||
      action === "schedule.motion.delete_task.v1"
    ) {
      // POLICY_TIER: approval_only
      if (!hasRequiredCapability(plan as any, "schedule:motion")) {
        return withMeta(
          deny(CODES_COMMON.CAPABILITY_MISSING, `schedule.motion.* requires capability schedule:motion`)
        );
      }

      const payload = (step as any).payload;
      if (payload !== undefined && payload !== null && !isPlainObject(payload)) {
        return withMeta(deny(CODES_SCHEDULE_MOTION.PAYLOAD_INVALID, "schedule.motion.* requires object payload"));
      }

      // Bulk guard (deny beyond cap) if an array of tasks/items is present.
      const maxBulk = asInt(env.SCHEDULE_MOTION_MAX_BULK, 20);
      const tasks = Array.isArray((payload as any)?.tasks) ? (payload as any).tasks : null;
      const items = Array.isArray((payload as any)?.items) ? (payload as any).items : null;
      const count = (tasks ? tasks.length : 0) + (items ? items.length : 0);
      if (count > maxBulk) {
        return withMeta(deny(CODES_SCHEDULE_MOTION.BULK_NOT_ALLOWED, `bulk count ${count} exceeds max ${maxBulk}`));
      }

      const destination = `${url.hostname}${url.pathname}`;
      return withMeta(
        requireApproval({
          code: CODES_SCHEDULE_MOTION.APPROVAL_REQUIRED,
          reason: "Motion scheduling is side-effectful and requires explicit approval",
          action,
          destination,
          summary: `Motion ${action}`,
        })
      );
    }

    // ElevenLabs TTS (paid external call): approval required by default.
    if (action === "voice.elevenlabs.tts.v1") {
      // POLICY_TIER: approval_only
      if (!hasRequiredCapability(plan as any, "voice:elevenlabs")) {
        return withMeta(
          deny(CODES_COMMON.CAPABILITY_MISSING, "voice.elevenlabs.tts.v1 requires capability voice:elevenlabs")
        );
      }

      const payload = (step as any).payload;
      if (!isPlainObject(payload)) {
        return withMeta(deny(CODES_VOICE_ELEVENLABS.PAYLOAD_INVALID, "voice.elevenlabs.tts.v1 requires object payload"));
      }

      const text = typeof (payload as any).text === "string" ? String((payload as any).text) : "";
      if (!text.trim()) {
        return withMeta(deny(CODES_VOICE_ELEVENLABS.PAYLOAD_INVALID, "text is required"));
      }

      const maxChars = asInt(env.VOICE_ELEVENLABS_MAX_TEXT_CHARS, 5000);
      if (text.length > maxChars) {
        return withMeta(
          deny(CODES_VOICE_ELEVENLABS.TEXT_TOO_LARGE, `text chars=${text.length} exceeds max ${maxChars}`)
        );
      }

      const voiceId =
        typeof (payload as any).voice_id === "string"
          ? String((payload as any).voice_id)
          : typeof (payload as any).voiceId === "string"
            ? String((payload as any).voiceId)
            : "";
      if (voiceId) {
        const allowed = parseCsv(env.VOICE_ELEVENLABS_ALLOWED_VOICE_IDS);
        if (allowed.length && !allowed.includes(voiceId)) {
          return withMeta(
            deny(CODES_VOICE_ELEVENLABS.VOICE_NOT_ALLOWED, `voice_id not allowlisted: ${voiceId}`)
          );
        }
      }

      const destination = `${url.hostname}${url.pathname}`;
      const allowUnapproved = String(env.VOICE_ELEVENLABS_ALLOW_UNAPPROVED ?? "").trim() === "1";
      if (!allowUnapproved) {
        return withMeta(
          requireApproval({
            code: CODES_VOICE_ELEVENLABS.APPROVAL_REQUIRED,
            reason: "ElevenLabs TTS is an external paid call and requires explicit approval by default",
            action,
            destination,
            summary: `ElevenLabs TTS chars=${text.length} voice=${voiceId || "(default)"}`,
          })
        );
      }
    }

    // Tier-PR-D: writing.grammarly.ingest.v1 (export/import only; read-only ingest only).
    if (action === "writing.grammarly.ingest.v1") {
      if (!hasRequiredCapability(plan as any, "writing:grammarly")) {
        return withMeta(
          deny(CODES_COMMON.CAPABILITY_MISSING, "writing.grammarly.ingest.v1 requires capability writing:grammarly")
        );
      }

      const readOnlyFlag = (step as any).read_only;
      if (readOnlyFlag !== true) {
        return withMeta(
          deny(CODES_WRITING_GRAMMARLY.REQUIRES_READ_ONLY, "writing.grammarly.ingest.v1 requires read_only=true")
        );
      }

      const method = String(step.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        return withMeta(
          deny(CODES_WRITING_GRAMMARLY.METHOD_NOT_ALLOWED, "writing.grammarly.ingest.v1 only allows GET/HEAD")
        );
      }

      const payload = (step as any).payload;
      if (!isPlainObject(payload)) {
        return withMeta(
          deny(CODES_WRITING_GRAMMARLY.PAYLOAD_INVALID, "writing.grammarly.ingest.v1 requires object payload")
        );
      }

      // Deny outbound intent and secret-ish keys.
      const outboundKeys = new Set(["url", "urls", "fetch", "request", "download", "upload", "webhook", "endpoint"].map((k) => k.toLowerCase()));
      const foundOutbound = findForbiddenKeyDeep(payload, outboundKeys, { maxDepth: 10 });
      if (foundOutbound) {
        return withMeta(
          deny(CODES_WRITING_GRAMMARLY.OUTBOUND_NOT_ALLOWED, `field not allowed: ${foundOutbound}`)
        );
      }

      const secretKeys = new Set(
        ["authorization", "apiKey", "token", "access_token", "refresh_token", "client_secret", "private_key", "cookie", "set-cookie"].map((k) =>
          k.toLowerCase()
        )
      );
      const foundSecret = findForbiddenKeyDeep(payload, secretKeys, { maxDepth: 10 });
      if (foundSecret) {
        return withMeta(
          deny(CODES_WRITING_GRAMMARLY.SECRETS_NOT_ALLOWED, `field not allowed: ${foundSecret}`)
        );
      }

      // Allowed: suggestions_json (object) OR file_path under runs/**.
      const suggestionsJson = (payload as any).suggestions_json;
      const filePath = typeof (payload as any).file_path === "string" ? String((payload as any).file_path) : "";
      const hasJson = isPlainObject(suggestionsJson);
      const hasFile = !!filePath;
      if ((hasJson ? 1 : 0) + (hasFile ? 1 : 0) !== 1) {
        return withMeta(
          deny(
            CODES_WRITING_GRAMMARLY.PAYLOAD_INVALID,
            "must include exactly one of suggestions_json or file_path"
          )
        );
      }

      const maxBytes = asInt(env.WRITING_GRAMMARLY_INGEST_MAX_BYTES, 2 * 1024 * 1024);
      if (hasJson) {
        const bytes = jsonBytes(suggestionsJson);
        if (!Number.isFinite(bytes) || bytes > maxBytes) {
          return withMeta(
            deny(
              CODES_WRITING_GRAMMARLY.TOO_LARGE,
              `bytes=${Number.isFinite(bytes) ? bytes : "(unserializable)"} exceeds max ${maxBytes}`
            )
          );
        }
      }
      if (hasFile) {
        if (!isUnderRuns(filePath)) {
          return withMeta(deny(CODES_WRITING_GRAMMARLY.PATH_NOT_ALLOWED, "file_path must be under runs/**"));
        }
        try {
          const st = fs.statSync(filePath);
          if (Number(st.size) > maxBytes) {
            return withMeta(
              deny(CODES_WRITING_GRAMMARLY.TOO_LARGE, `bytes=${Number(st.size)} exceeds max ${maxBytes}`)
            );
          }
        } catch {
          return withMeta(deny(CODES_WRITING_GRAMMARLY.PAYLOAD_INVALID, `file_path not readable: ${filePath}`));
        }
      }
    }

    // Tier-PR-D: voice.wisprflow.ingest.v1 (export/import only; read-only ingest only).
    if (action === "voice.wisprflow.ingest.v1") {
      if (!hasRequiredCapability(plan as any, "voice:wisprflow")) {
        return withMeta(
          deny(CODES_COMMON.CAPABILITY_MISSING, "voice.wisprflow.ingest.v1 requires capability voice:wisprflow")
        );
      }

      const readOnlyFlag = (step as any).read_only;
      if (readOnlyFlag !== true) {
        return withMeta(
          deny(CODES_VOICE_WISPRFLOW.REQUIRES_READ_ONLY, "voice.wisprflow.ingest.v1 requires read_only=true")
        );
      }

      const method = String(step.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        return withMeta(
          deny(CODES_VOICE_WISPRFLOW.METHOD_NOT_ALLOWED, "voice.wisprflow.ingest.v1 only allows GET/HEAD")
        );
      }

      const payload = (step as any).payload;
      if (!isPlainObject(payload)) {
        return withMeta(
          deny(CODES_VOICE_WISPRFLOW.PAYLOAD_INVALID, "voice.wisprflow.ingest.v1 requires object payload")
        );
      }

      const outboundKeys = new Set(["url", "urls", "fetch", "request", "download", "upload", "webhook", "endpoint"].map((k) => k.toLowerCase()));
      const foundOutbound = findForbiddenKeyDeep(payload, outboundKeys, { maxDepth: 10 });
      if (foundOutbound) {
        return withMeta(deny(CODES_VOICE_WISPRFLOW.OUTBOUND_NOT_ALLOWED, `field not allowed: ${foundOutbound}`));
      }

      const secretKeys = new Set(
        ["authorization", "apiKey", "token", "access_token", "refresh_token", "client_secret", "private_key", "cookie", "set-cookie"].map((k) =>
          k.toLowerCase()
        )
      );
      const foundSecret = findForbiddenKeyDeep(payload, secretKeys, { maxDepth: 10 });
      if (foundSecret) {
        return withMeta(deny(CODES_VOICE_WISPRFLOW.SECRETS_NOT_ALLOWED, `field not allowed: ${foundSecret}`));
      }

      const transcript = (payload as any).transcript_text;
      const filePath = typeof (payload as any).file_path === "string" ? String((payload as any).file_path) : "";
      const hasTranscript = typeof transcript === "string";
      const hasFile = !!filePath;
      if ((hasTranscript ? 1 : 0) + (hasFile ? 1 : 0) !== 1) {
        return withMeta(
          deny(CODES_VOICE_WISPRFLOW.PAYLOAD_INVALID, "must include exactly one of transcript_text or file_path")
        );
      }

      const maxBytes = asInt(env.VOICE_WISPRFLOW_INGEST_MAX_BYTES, 2 * 1024 * 1024);
      if (hasTranscript) {
        const bytes = utf8Bytes(transcript);
        if (!Number.isFinite(bytes) || bytes > maxBytes) {
          return withMeta(
            deny(
              CODES_VOICE_WISPRFLOW.TOO_LARGE,
              `bytes=${Number.isFinite(bytes) ? bytes : "(unknown)"} exceeds max ${maxBytes}`
            )
          );
        }
      }
      if (hasFile) {
        if (!isUnderRuns(filePath)) {
          return withMeta(deny(CODES_VOICE_WISPRFLOW.PATH_NOT_ALLOWED, "file_path must be under runs/**"));
        }
        try {
          const st = fs.statSync(filePath);
          if (Number(st.size) > maxBytes) {
            return withMeta(deny(CODES_VOICE_WISPRFLOW.TOO_LARGE, `bytes=${Number(st.size)} exceeds max ${maxBytes}`));
          }
        } catch {
          return withMeta(deny(CODES_VOICE_WISPRFLOW.PAYLOAD_INVALID, `file_path not readable: ${filePath}`));
        }
      }
    }

    // Tier-PR-D: media.descript.ingest.v1 (import/export only; read-only ingest only).
    if (action === "media.descript.ingest.v1") {
      if (!hasRequiredCapability(plan as any, "media:descript")) {
        return withMeta(deny(CODES_COMMON.CAPABILITY_MISSING, "media.descript.ingest.v1 requires capability media:descript"));
      }

      const readOnlyFlag = (step as any).read_only;
      if (readOnlyFlag !== true) {
        return withMeta(deny(CODES_MEDIA_DESCRIPT.INGEST_REQUIRES_READ_ONLY, "media.descript.ingest.v1 requires read_only=true"));
      }

      const method = String(step.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        return withMeta(
          deny(CODES_MEDIA_DESCRIPT.INGEST_METHOD_NOT_ALLOWED, "media.descript.ingest.v1 only allows GET/HEAD")
        );
      }

      const payload = (step as any).payload;
      if (!isPlainObject(payload)) {
        return withMeta(
          deny(CODES_MEDIA_DESCRIPT.INGEST_PAYLOAD_INVALID, "media.descript.ingest.v1 requires object payload")
        );
      }

      const outboundKeys = new Set(["url", "urls", "fetch", "request", "download", "upload", "webhook", "endpoint"].map((k) => k.toLowerCase()));
      const foundOutbound = findForbiddenKeyDeep(payload, outboundKeys, { maxDepth: 10 });
      if (foundOutbound) {
        return withMeta(
          deny(CODES_MEDIA_DESCRIPT.INGEST_OUTBOUND_NOT_ALLOWED, `field not allowed: ${foundOutbound}`)
        );
      }

      const secretKeys = new Set(
        ["authorization", "apiKey", "token", "access_token", "refresh_token", "client_secret", "private_key", "cookie", "set-cookie"].map((k) =>
          k.toLowerCase()
        )
      );
      const foundSecret = findForbiddenKeyDeep(payload, secretKeys, { maxDepth: 10 });
      if (foundSecret) {
        return withMeta(
          deny(CODES_MEDIA_DESCRIPT.INGEST_SECRETS_NOT_ALLOWED, `field not allowed: ${foundSecret}`)
        );
      }

      const filePath = typeof (payload as any).file_path === "string" ? String((payload as any).file_path) : "";
      if (!filePath) {
        return withMeta(deny(CODES_MEDIA_DESCRIPT.INGEST_PAYLOAD_INVALID, "file_path is required"));
      }
      if (!isUnderRuns(filePath)) {
        return withMeta(deny(CODES_MEDIA_DESCRIPT.INGEST_PATH_NOT_ALLOWED, "file_path must be under runs/**"));
      }

      const maxBytes = asInt(env.MEDIA_DESCRIPT_INGEST_MAX_BYTES, 50 * 1024 * 1024);
      try {
        const st = fs.statSync(filePath);
        if (Number(st.size) > maxBytes) {
          return withMeta(
            deny(CODES_MEDIA_DESCRIPT.INGEST_TOO_LARGE, `bytes=${Number(st.size)} exceeds max ${maxBytes}`)
          );
        }
      } catch {
        return withMeta(deny(CODES_MEDIA_DESCRIPT.INGEST_PAYLOAD_INVALID, `file_path not readable: ${filePath}`));
      }
    }

    // Tier-PR-D: media.descript.render.v1 (side effects): always approval required.
    if (action === "media.descript.render.v1") {
      if (!hasRequiredCapability(plan as any, "media:descript")) {
        return withMeta(deny(CODES_COMMON.CAPABILITY_MISSING, "media.descript.render.v1 requires capability media:descript"));
      }

      const payload = (step as any).payload;
      if (payload !== undefined && payload !== null && !isPlainObject(payload)) {
        return withMeta(
          deny(CODES_MEDIA_DESCRIPT.RENDER_PAYLOAD_INVALID, "media.descript.render.v1 requires object payload")
        );
      }

      const destination = `${url.hostname}${url.pathname}`;
      return withMeta(
        requireApproval({
          code: CODES_MEDIA_DESCRIPT.RENDER_APPROVAL_REQUIRED,
          reason: "Descript render/export is side-effectful and requires explicit approval",
          action,
          destination,
          summary: `Descript render`,
        })
      );
    }

    // Tier-PR-D: research.notebooklm.ingest.v1 (export/import only; read-only ingest only).
    if (action === "research.notebooklm.ingest.v1") {
      if (!hasRequiredCapability(plan as any, "research:notebooklm")) {
        return withMeta(
          deny(
            CODES_COMMON.CAPABILITY_MISSING,
            "research.notebooklm.ingest.v1 requires capability research:notebooklm"
          )
        );
      }

      const readOnlyFlag = (step as any).read_only;
      if (readOnlyFlag !== true) {
        return withMeta(
          deny(CODES_RESEARCH_NOTEBOOKLM.REQUIRES_READ_ONLY, "research.notebooklm.ingest.v1 requires read_only=true")
        );
      }

      const method = String(step.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        return withMeta(
          deny(CODES_RESEARCH_NOTEBOOKLM.METHOD_NOT_ALLOWED, "research.notebooklm.ingest.v1 only allows GET/HEAD")
        );
      }

      const payload = (step as any).payload;
      if (!isPlainObject(payload)) {
        return withMeta(
          deny(CODES_RESEARCH_NOTEBOOKLM.PAYLOAD_INVALID, "research.notebooklm.ingest.v1 requires object payload")
        );
      }

      const outboundKeys = new Set(["url", "urls", "fetch", "request", "download", "upload", "webhook", "endpoint"].map((k) => k.toLowerCase()));
      const foundOutbound = findForbiddenKeyDeep(payload, outboundKeys, { maxDepth: 10 });
      if (foundOutbound) {
        return withMeta(
          deny(CODES_RESEARCH_NOTEBOOKLM.OUTBOUND_NOT_ALLOWED, `field not allowed: ${foundOutbound}`)
        );
      }

      const secretKeys = new Set(
        ["authorization", "apiKey", "token", "access_token", "refresh_token", "client_secret", "private_key", "cookie", "set-cookie"].map((k) =>
          k.toLowerCase()
        )
      );
      const foundSecret = findForbiddenKeyDeep(payload, secretKeys, { maxDepth: 10 });
      if (foundSecret) {
        return withMeta(
          deny(CODES_RESEARCH_NOTEBOOKLM.SECRETS_NOT_ALLOWED, `field not allowed: ${foundSecret}`)
        );
      }

      const text = (payload as any).text;
      const exportJson = (payload as any).export_json;
      const filePath = typeof (payload as any).file_path === "string" ? String((payload as any).file_path) : "";

      const hasText = typeof text === "string";
      const hasExport = isPlainObject(exportJson);
      const hasFile = !!filePath;
      if ((hasText ? 1 : 0) + (hasExport ? 1 : 0) + (hasFile ? 1 : 0) !== 1) {
        return withMeta(
          deny(
            CODES_RESEARCH_NOTEBOOKLM.PAYLOAD_INVALID,
            "must include exactly one of text, export_json, or file_path"
          )
        );
      }

      const maxBytes = asInt(env.RESEARCH_NOTEBOOKLM_INGEST_MAX_BYTES, 5 * 1024 * 1024);
      let bytes = 0;
      if (hasText) {
        bytes = utf8Bytes(text);
      } else if (hasExport) {
        bytes = jsonBytes(exportJson);
      } else {
        if (!isUnderRuns(filePath)) {
          return withMeta(deny(CODES_RESEARCH_NOTEBOOKLM.PATH_NOT_ALLOWED, "file_path must be under runs/**"));
        }
        try {
          const st = fs.statSync(filePath);
          bytes = Number(st.size);
        } catch {
          return withMeta(deny(CODES_RESEARCH_NOTEBOOKLM.PAYLOAD_INVALID, `file_path not readable: ${filePath}`));
        }
      }

      if (!Number.isFinite(bytes) || bytes > maxBytes) {
        return withMeta(
          deny(CODES_RESEARCH_NOTEBOOKLM.TOO_LARGE, `bytes=${Number.isFinite(bytes) ? bytes : "(unknown)"} exceeds max ${maxBytes}`)
        );
      }
    }

    // Tier-PR-D: audio.udio.generate.v1 (paid external call): approval required.
    if (action === "audio.udio.generate.v1") {
      if (!hasRequiredCapability(plan as any, "audio:udio")) {
        return withMeta(deny(CODES_COMMON.CAPABILITY_MISSING, "audio.udio.generate.v1 requires capability audio:udio"));
      }

      const payload = (step as any).payload;
      if (payload !== undefined && payload !== null && !isPlainObject(payload)) {
        return withMeta(deny(CODES_AUDIO_UDIO.PAYLOAD_INVALID, "audio.udio.generate.v1 requires object payload"));
      }

      const destination = `${url.hostname}${url.pathname}`;
      return withMeta(
        requireApproval({
          code: CODES_AUDIO_UDIO.APPROVAL_REQUIRED,
          reason: "Udio generation is an external paid call and requires explicit approval",
          action,
          destination,
          summary: "Udio generate",
        })
      );
    }

    // Tier-PR-D: llm.anthropic.chat.v1 (external LLM call): approval required.
    if (action === "llm.anthropic.chat.v1") {
      if (!hasRequiredCapability(plan as any, "llm:anthropic")) {
        return withMeta(deny(CODES_COMMON.CAPABILITY_MISSING, "llm.anthropic.chat.v1 requires capability llm:anthropic"));
      }

      const payload = (step as any).payload;
      if (payload !== undefined && payload !== null && !isPlainObject(payload)) {
        return withMeta(deny(CODES_LLM_ANTHROPIC.PAYLOAD_INVALID, "llm.anthropic.chat.v1 requires object payload"));
      }

      const destination = `${url.hostname}${url.pathname}`;
      return withMeta(
        requireApproval({
          code: CODES_LLM_ANTHROPIC.APPROVAL_REQUIRED,
          reason: "Anthropic LLM calls are external and require explicit approval",
          action,
          destination,
          summary: "Anthropic chat",
        })
      );
    }

    // Tier-PR-D: llm.google_ai_studio.generate.v1 (external LLM call): approval required.
    if (action === "llm.google_ai_studio.generate.v1") {
      if (!hasRequiredCapability(plan as any, "llm:google_ai_studio")) {
        return withMeta(
          deny(
            CODES_COMMON.CAPABILITY_MISSING,
            "llm.google_ai_studio.generate.v1 requires capability llm:google_ai_studio"
          )
        );
      }

      const payload = (step as any).payload;
      if (payload !== undefined && payload !== null && !isPlainObject(payload)) {
        return withMeta(
          deny(CODES_LLM_GOOGLE_AI_STUDIO.PAYLOAD_INVALID, "llm.google_ai_studio.generate.v1 requires object payload")
        );
      }

      const destination = `${url.hostname}${url.pathname}`;
      return withMeta(
        requireApproval({
          code: CODES_LLM_GOOGLE_AI_STUDIO.APPROVAL_REQUIRED,
          reason: "Google AI Studio calls are external and require explicit approval",
          action,
          destination,
          summary: "Google AI Studio generate",
        })
      );
    }

    // Tier-PR-D: Dev vendor bridges (deny unless SINTRAPRIME_MODE=dev).
    if (
      action === "dev.cursor.bridge.v1" ||
      action === "dev.lovable.bridge.v1" ||
      action === "dev.gamma.bridge.v1" ||
      action === "dev.icon.bridge.v1"
    ) {
      const requiredCap =
        action === "dev.cursor.bridge.v1"
          ? "dev:cursor"
          : action === "dev.lovable.bridge.v1"
            ? "dev:lovable"
            : action === "dev.gamma.bridge.v1"
              ? "dev:gamma"
              : "dev:icon";

      if (!hasRequiredCapability(plan as any, requiredCap)) {
        return withMeta(deny(CODES_COMMON.CAPABILITY_MISSING, `${action} requires capability ${requiredCap}`));
      }

      const declaredMode = String(env.SINTRAPRIME_MODE ?? "").trim();
      if (declaredMode !== "dev") {
        return withMeta(deny(CODES_DEV_BRIDGE.DEV_ONLY_TOOL, `${action} is only allowed when SINTRAPRIME_MODE=dev`));
      }

      const readOnlyFlag = (step as any).read_only;
      if (readOnlyFlag !== true) {
        return withMeta(deny(CODES_DEV_BRIDGE.REQUIRES_READ_ONLY, `${action} requires read_only=true`));
      }

      const method = String(step.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        return withMeta(deny(CODES_DEV_BRIDGE.METHOD_NOT_ALLOWED, `${action} only allows GET/HEAD`));
      }

      const payload = (step as any).payload;
      if (payload !== undefined && payload !== null && !isPlainObject(payload)) {
        return withMeta(deny(CODES_DEV_BRIDGE.PAYLOAD_INVALID, `${action} requires object payload`));
      }

      // Deny outbound intent + secret-ish keys in dev bridges (defense-in-depth).
      if (payload !== undefined && payload !== null) {
        const outboundKeys = new Set(
          ["url", "urls", "endpoint", "webhook", "callback", "fetch", "crawl", "search", "http", "https", "request", "download", "upload"].map(
            (k) => k.toLowerCase()
          )
        );
        const foundOutbound = findForbiddenKeyDeep(payload, outboundKeys, { maxDepth: 10 });
        if (foundOutbound) {
          return withMeta(deny(CODES_DEV_BRIDGE.OUTBOUND_NOT_ALLOWED, `field not allowed: ${foundOutbound}`));
        }

        const secretKeys = new Set(
          ["authorization", "apiKey", "token", "access_token", "refresh_token", "client_secret", "private_key", "cookie", "set-cookie"].map((k) =>
            k.toLowerCase()
          )
        );
        const foundSecret = findForbiddenKeyDeep(payload, secretKeys, { maxDepth: 10 });
        if (foundSecret) {
          return withMeta(deny(CODES_DEV_BRIDGE.SECRETS_NOT_ALLOWED, `field not allowed: ${foundSecret}`));
        }
      }
    }

    // Tier 6.x: Notion has explicit read vs write lanes.
    // - Read is deny-only (Tier 6.0 contract)
    // - Write is approval-scoped (Tier 6.1), never auto-exec
    const isNotionPath = url.pathname.includes("/notion/");
    if (isNotionPath) {
      if (action.startsWith("notion.read.")) {
        if (!methodIsReadOnly(step.method)) {
          return withMeta(
            deny(CODES_NOTION.METHOD_NOT_ALLOWED, `Notion read method ${step.method} is not allowed (GET/HEAD only)`)
          );
        }
        const readOnlyFlag = (step as any).read_only;
        if (readOnlyFlag !== true) {
          return withMeta(deny(CODES_NOTION.READ_ONLY_REQUIRED, "Notion read steps must set read_only=true"));
        }
      } else if (action === "notion.write.page_property" || action === "notion.write.page_title") {
        // Validate the write shape first (deny, no approval loophole).
        if (step.method !== "PATCH") {
          return withMeta(
            deny(CODES_NOTION.METHOD_NOT_ALLOWED, `Notion write method ${step.method} is not allowed (PATCH only)`)
          );
        }

        // Tier 6.1/6.2: tight endpoint allowlist (no silent drift).
        const p = url.pathname;
        const pagePrefix = "/notion/page/";
        if (!p.startsWith(pagePrefix)) {
          return withMeta(
            deny(CODES_NOTION.ENDPOINT_FORBIDDEN, "Notion write steps must target /notion/page/:id endpoints only")
          );
        }

        const remainder = p.slice(pagePrefix.length); // <id> or <id>/title
        const hasSlash = remainder.includes("/");
        const isTitleEndpoint = hasSlash && remainder.endsWith("/title") && remainder.split("/").length === 2;
        const isPageEndpoint = !hasSlash && remainder.length > 0;

        if (action === "notion.write.page_property") {
          if (!isPageEndpoint) {
            return withMeta(
              deny(CODES_NOTION.ENDPOINT_FORBIDDEN, "notion.write.page_property is restricted to /notion/page/:id")
            );
          }
        }
        if (action === "notion.write.page_title") {
          if (!isTitleEndpoint) {
            return withMeta(
              deny(CODES_NOTION.ENDPOINT_FORBIDDEN, "notion.write.page_title is restricted to /notion/page/:id/title")
            );
          }
        }

        const readOnlyFlag = (step as any).read_only;
        if (readOnlyFlag !== false) {
          return withMeta(deny(CODES_NOTION.READ_ONLY_REQUIRED, "Notion write steps must set read_only=false"));
        }

        // Tier 6.1: Notion writes are approval-scoped by default.
        // Exception (Tier-19/20): in APPROVAL_GATED_AUTONOMY, a promoted fingerprint or an
        // active delegated class may satisfy the approval gate (still subject to all deny checks).
        if (!approved) {
          const canSkipNotionApproval =
            autonomyMode === "APPROVAL_GATED_AUTONOMY" &&
            (promotionMaySkipApprovalGate ||
              (delegationDecision && delegationDecision.active === true && delegationDecision.reason === "OK"));

          if (canSkipNotionApproval) {
            continue;
          }

          const destination = `${url.hostname}${url.pathname}`;
          const isTitleWrite = action === "notion.write.page_title";
          const isOrchestratedWritePhase =
            action === "notion.write.page_property" && meta?.phase_id === "write" && (meta?.phases_count ?? 0) > 0;
          return withMeta(
            requireApproval({
            code: isTitleWrite
              ? CODES_NOTION_WRITE.REQUIRES_APPROVAL
              : isOrchestratedWritePhase
                ? CODES_NOTION_WRITE.ORCHESTRATED_WRITE_REQUIRES_APPROVAL
                : CODES_NOTION_WRITE.APPROVAL_REQUIRED,
            reason: isTitleWrite
              ? "Notion title updates require human approval"
              : isOrchestratedWritePhase
                ? "Tier-7 write phase requires approval"
                : "Notion writes require explicit approval (Tier 6.1)",
            action,
            destination,
            summary: `PATCH ${url.pathname}`,
            })
          );
        }
      } else {
        return withMeta(
          deny(
          CODES_NOTION.ACTION_FORBIDDEN,
          "Only notion.read.* and notion.write.page_property/notion.write.page_title actions may access /notion/ endpoints"
          )
        );
      }
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return withMeta(deny(CODES_POLICY_ENGINE.URL_PROTOCOL_BLOCK, `protocol not allowed: ${url.protocol}`));
    }
  }

  // 2) Domain allowlist
  const allowedDomains = parseCsv(env.ALLOWED_DOMAINS);
  if (allowedDomains.length) {
    for (const step of plan.steps) {
      const u = new URL(step.url);
      if (u.protocol === "data:") continue;
      const host = u.hostname;
      if (!allowedDomains.includes(host)) {
        return withMeta(deny(CODES_POLICY_ENGINE.DOMAIN_NOT_ALLOWED, `host ${host} not allowlisted`));
      }
    }
  }

  // Optional method allowlist
  const allowedMethods = parseCsv(env.ALLOWED_METHODS).map((m) => m.toUpperCase());
  if (allowedMethods.length) {
    for (const step of plan.steps) {
      if (!allowedMethods.includes(step.method)) {
        return withMeta(deny(CODES_POLICY_ENGINE.METHOD_BLOCK, `method ${step.method} not allowlisted`));
      }
    }
  }

  // 3) Time limits (cheap, deterministic)
  const maxSteps = parseNumberEnv(env.POLICY_MAX_STEPS);
  if (maxSteps !== null && plan.steps.length > maxSteps) {
    return withMeta(deny(CODES_POLICY_BUDGET.MAX_STEPS_EXCEEDED, `plan has ${plan.steps.length} steps; max ${maxSteps}`));
  }

  const maxStepTimeoutMs = parseNumberEnv(env.POLICY_MAX_STEP_TIMEOUT_MS);
  const defaultStepTimeoutMs = parseNumberEnv(env.DEFAULT_STEP_TIMEOUT_MS);
  if (maxStepTimeoutMs !== null && defaultStepTimeoutMs !== null && defaultStepTimeoutMs > maxStepTimeoutMs) {
    return withMeta(
      deny(
      CODES_POLICY_ENGINE.STEP_TIMEOUT_CAP,
      `DEFAULT_STEP_TIMEOUT_MS (${defaultStepTimeoutMs}) exceeds cap (${maxStepTimeoutMs})`
      )
    );
  }

  const noExecAfter = parseUtcHm(env.POLICY_NO_EXEC_AFTER_UTC);
  if (noExecAfter) {
    const h = clock.getUTCHours();
    const m = clock.getUTCMinutes();
    const cur = h * 60 + m;
    const cutoff = noExecAfter.hour * 60 + noExecAfter.minute;
    if (cur >= cutoff) {
      return withMeta(deny(CODES_POLICY_ENGINE.TIME_WINDOW, `execution blocked after ${env.POLICY_NO_EXEC_AFTER_UTC} UTC`));
    }
  }

  // 4) Tier 5.3 approval gate: writes in production require explicit human approval.
  if (isProd(env)) {
    const hasWrites = plan.steps.some((s) => methodIsWrite(s.method));
    if (hasWrites) {
      // If we're resuming via /approve, allow the write to proceed.
      const approved =
        meta?.execution_id && meta?.approved_execution_id && meta.execution_id === meta.approved_execution_id;
      if (!approved) {
        const hosts = uniqueHostsFromSteps(plan.steps);
        const destination = hosts.length ? `Hosts:${hosts.join(",")}` : "External";
        const writeCount = plan.steps.filter((s) => methodIsWrite(s.method)).length;
        return withMeta(
          requireApproval({
          code: CODES_PROD_APPROVAL.WRITE_OPERATION,
          reason: "write operation in production requires explicit approval",
          action: "external.write",
          destination,
          summary: `Execute ${writeCount} write step(s)`,
          })
        );
      }
    }
  }

  // STRICT mode requires proving ALLOW is reached via real checkPolicy() execution.
  // Since checkPolicy() returns a plan-level decision, we emit ALLOW hits for each
  // action present in the plan when the plan is allowed.
  {
    const actions = new Set<string>();
    for (const step of plan.steps) {
      const action = typeof (step as any).action === "string" ? String((step as any).action) : "";
      if (action) actions.add(action);
    }
    for (const action of actions) {
      recordPolicyHit({ action, decision: "ALLOW", code: CODES_COVERAGE.ALLOW });
    }
  }

  return withMeta({ allowed: true });
}

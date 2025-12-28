import type { ExecutionPlan, ExecutionStep } from "../schemas/ExecutionPlan.schema.js";
import type { PolicyExplainTrace } from "./policyExplain.js";
import { recordCheck } from "./policyExplain.js";
import { computePromotionFingerprint } from "../autonomy/promotionFingerprint.js";
import { isDemoted, readPromotion } from "../autonomy/promotionStore.js";
import { evaluateDelegationForPlan } from "../delegated/delegationEngine.js";
import type { DelegationDecision } from "../delegated/delegatedTypes.js";
import { readDomainOverlay } from "../domains/domainRegistry.js";
import { deriveFingerprint } from "../governor/runGovernor.js";
import { readRequalificationState } from "../requalification/requalification.js";
import { getEffectiveConfidence } from "../confidence/confidenceStore.js";
import { getBrowserAllowOverrides, loadPolicyOverridesSync } from "./policyOverrides.js";
import fs from "node:fs";
import path from "node:path";

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
  preview: { destination: string; summary: string };
};

export type PolicyMeta = {
  phase_id?: string;
  execution_id?: string;
  approved_execution_id?: string;
  simulation?: boolean;
  command?: string;
  original_command?: string;
  domain_id?: string | null;
  confidence_override?: number;
  phases_count?: number;
  total_steps_planned?: number;
};

export type PolicyResult =
  | { allowed: true }
  | { allowed: false; denied: PolicyDenied }
  | { allowed: false; requireApproval: true; approval: ApprovalRequired };

type PolicyResultMeta = {
  promotion_fingerprint: string | null;
  delegation: DelegationDecision | null;
};

function isShellExecutionStep(step: unknown): step is { adapter: "ShellAdapter" } {
  return !!step && typeof step === "object" && (step as any).adapter === "ShellAdapter";
}

export type PolicyResultWithMeta = PolicyResult & PolicyResultMeta;

function getAutonomyMode(env: NodeJS.ProcessEnv): string {
  return env.AUTONOMY_MODE || "OFF";
}

function asInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function deny(code: string, reason: string): PolicyResult {
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

function methodIsWrite(method: unknown) {
  const m = String(method ?? "").toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

function methodIsReadOnly(method: unknown) {
  const m = String(method ?? "").toUpperCase();
  return m === "GET" || m === "HEAD";
}

function uniqueHostsFromSteps(steps: ExecutionStep[]): string[] {
  const hosts = new Set<string>();
  for (const step of steps) {
    if (isShellExecutionStep(step)) continue;
    try {
      hosts.add(new URL(String((step as any).url)).hostname);
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

let cachedBrowserAllow: Set<string> | null = null;

function getBrowserAllowlistHosts(clock: Date): Set<string> {
  if (cachedBrowserAllow) return cachedBrowserAllow;
  try {
    const p = path.join(process.cwd(), "browser.allowlist.json");
    const raw = fs.readFileSync(p, "utf8");
    const obj = JSON.parse(raw) as any;
    const allow = Array.isArray(obj?.allow) ? obj.allow.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : [];
    const overrides = loadPolicyOverridesSync({ cwd: process.cwd(), now: clock });
    const extra = getBrowserAllowOverrides(overrides).map((s) => String(s).trim().toLowerCase()).filter(Boolean);
    cachedBrowserAllow = new Set([...allow, ...extra]);
    return cachedBrowserAllow;
  } catch {
    cachedBrowserAllow = new Set();
    return cachedBrowserAllow;
  }
}

export function checkPlanPolicy(plan: any, env: NodeJS.ProcessEnv = process.env) {
  const maxSteps = asInt(env.POLICY_MAX_STEPS, 10);
  const maxRuntimeMs = asInt(env.POLICY_MAX_RUNTIME_MS, 30000);

  const steps = plan?.steps || plan?.phases?.flatMap((p: any) => p.steps) || [];

  if (steps.length > maxSteps) {
    return {
      kind: 'PolicyDenied',
      code: String(env.POLICY_BUDGET_DENY_CODE ?? '').trim() || 'BUDGET_MAX_STEPS_EXCEEDED',
      reason: `Plan has ${steps.length} steps; max is ${maxSteps}`
    };
  }

  // Cap per-step timeout (if present)
  for (const s of steps) {
    const t = s?.timeout_ms;
    if (typeof t === 'number' && t > maxRuntimeMs) {
      return {
        kind: 'PolicyDenied',
        code: String(env.POLICY_BUDGET_DENY_CODE ?? '').trim() || 'BUDGET_MAX_RUNTIME_EXCEEDED',
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
        code: 'AUTONOMY_READ_ONLY_VIOLATION',
        reason: 'READ_ONLY_AUTONOMY forbids any step with read_only=false'
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
  meta: PolicyMeta | undefined,
  opts?: { explain?: PolicyExplainTrace }
): PolicyResultWithMeta {
  const autonomyMode = getAutonomyMode(env);
  const isSimulation = meta?.simulation === true;

  // Tier-16: confidence regression enforcement (pre-execution).
  // If confidence is too low, only allow fully read-only plans.
  {
    const command = typeof meta?.command === "string" ? meta.command : "";
    if (command) {
      const fp = deriveFingerprint({ command, domain_id: meta?.domain_id ?? null });
      const override = typeof meta?.confidence_override === "number" ? meta.confidence_override : null;
      const runsDir = typeof env.RUNS_DIR === "string" && env.RUNS_DIR.trim() ? env.RUNS_DIR.trim() : "runs";
      const confidence = override !== null ? override : getEffectiveConfidence(runsDir, fp).decayed_confidence;
      if (confidence <= 0.4) {
        const hasWrite = plan.steps.some((s: any) => s?.read_only === false || methodIsWrite(s?.method));
        if (hasWrite) {
          return {
            allowed: false,
            denied: {
              kind: "PolicyDenied",
              code: "CONFIDENCE_TOO_LOW",
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
    if (isSimulation) {
      // Tier-14 simulation: do not enforce requalification state.
    } else {
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
                code: "PROBATION_READ_ONLY_ENFORCED",
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
              denied: { kind: "PolicyDenied", code: "REQUALIFICATION_BLOCKED", reason },
              promotion_fingerprint: null,
              delegation: null,
            };
          }
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
            code: "DOMAIN_OVERLAY_DENY_WRITE",
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
          code: "AUTONOMY_APPROVAL_REQUIRED",
          reason: `${autonomyMode} forbids execution of write-capable steps (approval required)` ,
          action: typeof (step as any).action === "string" ? String((step as any).action) : "unknown",
          destination: (() => {
            try {
              if (isShellExecutionStep(step)) return "local-shell";
              const u = new URL(String((step as any).url));
              return `${u.hostname}${u.pathname}`;
            } catch {
              return isShellExecutionStep(step) ? "local-shell" : String((step as any).url || "unknown");
            }
          })(),
          summary: isShellExecutionStep(step)
            ? "ShellAdapter command execution"
            : `${String((step as any).method || "GET").toUpperCase()} ${String((step as any).url || "")}`,
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
          "AUTONOMY_READ_ONLY_VIOLATION",
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
      "POLICY_MAX_PHASES",
      `plan has ${meta.phases_count} phases; max ${maxPhases}`
      )
    );
  }

  const maxTotalSteps = parseNumberEnv(env.POLICY_MAX_TOTAL_STEPS);
  if (maxTotalSteps !== null && meta?.total_steps_planned !== undefined && meta.total_steps_planned > maxTotalSteps) {
    return withMeta(
      denyBudget(
      env,
      "POLICY_MAX_TOTAL_STEPS",
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
        return withMeta(deny("POLICY_CAPABILITY_INVALID", "required_capabilities must be string[]"));
      }
      if (!allowedCaps.includes(cap)) {
        return withMeta(deny("POLICY_CAPABILITY_NOT_ALLOWED", `capability ${cap} not allowlisted`));
      }
    }
  }

  // 1) Protocol guard (basic safety)

  for (const step of plan.steps) {
    // Local shell execution steps do not have URLs and must be explicitly approved.
    if (isShellExecutionStep(step)) {
      const cmd = typeof (step as any)?.command === "string" ? String((step as any).command) : "";
      if (!cmd.trim()) {
        return withMeta(deny("SHELL_COMMAND_MISSING", "ShellAdapter steps require a non-empty command"));
      }

      if (!approved) {
        return withMeta(
          requireApproval({
            code: "SHELL_EXEC_APPROVAL_REQUIRED",
            reason: "Shell execution requires explicit approval",
            action: typeof (step as any)?.action === "string" ? String((step as any).action) : "shell.run",
            destination: "local-shell",
            summary: "ShellAdapter command execution",
          })
        );
      }

      continue;
    }

    let url: URL;
    try {
      url = new URL(String((step as any).url));
    } catch {
      return withMeta(deny("POLICY_URL_INVALID", `invalid url: ${String((step as any).url)}`));
    }

    // BrowserAgent must be host-allowlisted (secure default).
    if (String((step as any).adapter) === "BrowserAgent") {
      const allow = getBrowserAllowlistHosts(clock);
      const host = String(url.hostname ?? "").toLowerCase();
      if (!allow.has(host)) {
        return withMeta(
          deny(
            "BROWSER_DOMAIN_NOT_ALLOWLISTED",
            `BrowserAgent blocked: ${host} not in browser.allowlist.json`
          )
        );
      }
    }

    // Tier-10.x: Live Notion safety rails (read-only by default; writes approval-scoped)
    const action = typeof (step as any).action === "string" ? ((step as any).action as string) : "";
    const isNotionLiveEndpoint = url.hostname === "api.notion.com" && url.pathname.startsWith("/v1/");
    const isNotionLiveAction = action.startsWith("notion.live.");
    if (isNotionLiveEndpoint || isNotionLiveAction) {
      const method = String((step as any).method || "GET").toUpperCase();
      const readOnlyFlag = (step as any).read_only;

      // 1) If it's not explicitly read_only, it MUST be approval_scoped and have prestate.
      if (readOnlyFlag !== true) {
        const approvalScoped = (step as any).approval_scoped;
        if (approvalScoped !== true) {
          if (opts?.explain) recordCheck(opts.explain, { check_id: "NOTION_LIVE_READ_ONLY", input: { action }, result: "FAIL", reason: "Live Notion requires read_only=true unless approval_scoped=true" });
          return withMeta(
            deny(
            "NOTION_LIVE_REQUIRES_READ_ONLY",
            "Live Notion requires read_only=true unless approval_scoped=true"
            )
          );
        }

        const hasPrestate = !!(step as any).prestate;
        const hasFingerprint = typeof (step as any).prestate_fingerprint === "string" && String((step as any).prestate_fingerprint).trim();
        if (!hasPrestate || !hasFingerprint) {
          if (opts?.explain) recordCheck(opts.explain, { check_id: "NOTION_LIVE_WRITE_PRESTATE", input: { action }, result: "FAIL", reason: "Approval-scoped live writes require prestate + prestate_fingerprint" });
          return withMeta(
            deny(
            "NOTION_LIVE_WRITE_REQUIRES_PRESTATE",
            "Approval-scoped live writes require prestate + prestate_fingerprint"
            )
          );
        }

        // Live Notion writes are PATCH-only, except for the governed insert lane (POST /v1/pages).
        const isInsert = action === "notion.live.insert";
        const insertOk = isInsert && method === "POST" && url.hostname === "api.notion.com" && url.pathname === "/v1/pages";
        const patchOk = method === "PATCH";
        if (!patchOk && !insertOk) {
          if (opts?.explain) recordCheck(opts.explain, { check_id: "NOTION_LIVE_WRITE_METHOD", input: { action, method }, result: "FAIL", reason: "Only PATCH allowed for approval-scoped live notion writes (or POST /v1/pages for notion.live.insert)" });
          return withMeta(
            deny(
            "NOTION_LIVE_WRITE_METHOD_NOT_ALLOWED",
            "Only PATCH allowed for approval-scoped live notion writes (or POST /v1/pages for notion.live.insert)"
            )
          );
        }

        // Live writes must be explicitly approved (Tier 10.2) using the same approval token mechanism.
        if (!approved) {
          const destination = `${url.hostname}${url.pathname}`;
          if (opts?.explain) recordCheck(opts.explain, { check_id: "NOTION_LIVE_WRITE_APPROVAL", input: { action }, result: "FAIL", reason: "Live Notion writes require explicit approval (Tier 10.2)" });
          return withMeta(
            requireApproval({
            code: "NOTION_LIVE_WRITE_APPROVAL_REQUIRED",
            reason: "Live Notion writes require explicit approval (Tier 10.2)",
            action,
            destination,
            summary: `${method} ${url.pathname}`,
            })
          );
        }
      }

      // 2) Read-only method constraints
      if (readOnlyFlag === true) {
        if (method !== "GET" && method !== "HEAD") {
          if (opts?.explain) recordCheck(opts.explain, { check_id: "NOTION_LIVE_METHOD", input: { action, method }, result: "FAIL", reason: "Only GET/HEAD allowed for notion.live.read" });
          return withMeta(
            deny(
            "NOTION_LIVE_METHOD_NOT_ALLOWED",
            "Only GET/HEAD allowed for notion.live.read"
            )
          );
        }
        if (opts?.explain) recordCheck(opts.explain, { check_id: "NOTION_LIVE_METHOD", input: { action, method }, result: "PASS" });
      }
      if (opts?.explain && readOnlyFlag === true) recordCheck(opts.explain, { check_id: "NOTION_LIVE_READ_ONLY", input: { action }, result: "PASS" });
    }
    // Tier 6.x: Notion has explicit read vs write lanes.
    // - Read is deny-only (Tier 6.0 contract)
    // - Write is approval-scoped (Tier 6.1), never auto-exec
    const isNotionPath = url.pathname.includes("/notion/");
    if (isNotionPath) {
      if (action.startsWith("notion.read.")) {
        if (!methodIsReadOnly((step as any).method)) {
          return withMeta(deny("METHOD_NOT_ALLOWED", `Notion read method ${String((step as any).method)} is not allowed (GET/HEAD only)`));
        }
        const readOnlyFlag = (step as any).read_only;
        if (readOnlyFlag !== true) {
          return withMeta(deny("READ_ONLY_REQUIRED", "Notion read steps must set read_only=true"));
        }
      } else if (action === "notion.write.page_property" || action === "notion.write.page_title") {
        // Validate the write shape first (deny, no approval loophole).
        if (String((step as any).method) !== "PATCH") {
          return withMeta(deny("METHOD_NOT_ALLOWED", `Notion write method ${String((step as any).method)} is not allowed (PATCH only)`));
        }

        // Tier 6.1/6.2: tight endpoint allowlist (no silent drift).
        const p = url.pathname;
        const pagePrefix = "/notion/page/";
        if (!p.startsWith(pagePrefix)) {
          return withMeta(
            deny("NOTION_ENDPOINT_FORBIDDEN", "Notion write steps must target /notion/page/:id endpoints only")
          );
        }

        const remainder = p.slice(pagePrefix.length); // <id> or <id>/title
        const hasSlash = remainder.includes("/");
        const isTitleEndpoint = hasSlash && remainder.endsWith("/title") && remainder.split("/").length === 2;
        const isPageEndpoint = !hasSlash && remainder.length > 0;

        if (action === "notion.write.page_property") {
          if (!isPageEndpoint) {
            return withMeta(
              deny("NOTION_ENDPOINT_FORBIDDEN", "notion.write.page_property is restricted to /notion/page/:id")
            );
          }
        }
        if (action === "notion.write.page_title") {
          if (!isTitleEndpoint) {
            return withMeta(
              deny("NOTION_ENDPOINT_FORBIDDEN", "notion.write.page_title is restricted to /notion/page/:id/title")
            );
          }
        }

        const readOnlyFlag = (step as any).read_only;
        if (readOnlyFlag !== false) {
          return withMeta(deny("READ_ONLY_REQUIRED", "Notion write steps must set read_only=false"));
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
              ? "NOTION_WRITE_REQUIRES_APPROVAL"
              : isOrchestratedWritePhase
                ? "ORCHESTRATED_WRITE_REQUIRES_APPROVAL"
                : "NOTION_WRITE_APPROVAL_REQUIRED",
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
          "NOTION_ACTION_FORBIDDEN",
          "Only notion.read.* and notion.write.page_property/notion.write.page_title actions may access /notion/ endpoints"
          )
        );
      }
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return withMeta(deny("POLICY_URL_PROTOCOL_BLOCK", `protocol not allowed: ${url.protocol}`));
    }
  }

  // 2) Domain allowlist
  const allowedDomains = parseCsv(env.ALLOWED_DOMAINS);
  if (allowedDomains.length) {
    for (const step of plan.steps) {
      if (isShellExecutionStep(step)) continue;
      const host = new URL(String((step as any).url)).hostname;
      if (!allowedDomains.includes(host)) {
        if (opts?.explain) recordCheck(opts.explain, { check_id: "DOMAIN_ALLOWLIST", input: { host }, result: "FAIL", reason: "host not allowlisted" });
        return withMeta(deny("DOMAIN_NOT_ALLOWED", `host ${host} not allowlisted`));
      }
      if (opts?.explain) recordCheck(opts.explain, { check_id: "DOMAIN_ALLOWLIST", input: { host }, result: "PASS" });
    }
  }

  // Optional method allowlist
  const allowedMethods = parseCsv(env.ALLOWED_METHODS).map((m) => m.toUpperCase());
  if (allowedMethods.length) {
    for (const step of plan.steps) {
      if (isShellExecutionStep(step)) continue;
      const m = String((step as any).method).toUpperCase();
      if (!allowedMethods.includes(m)) {
        return withMeta(deny("POLICY_METHOD_BLOCK", `method ${m} not allowlisted`));
      }
    }
  }

  // 3) Time limits (cheap, deterministic)
  const maxSteps = parseNumberEnv(env.POLICY_MAX_STEPS);
  if (maxSteps !== null && plan.steps.length > maxSteps) {
    return withMeta(deny("BUDGET_MAX_STEPS_EXCEEDED", `plan has ${plan.steps.length} steps; max ${maxSteps}`));
  }

  const maxStepTimeoutMs = parseNumberEnv(env.POLICY_MAX_STEP_TIMEOUT_MS);
  const defaultStepTimeoutMs = parseNumberEnv(env.DEFAULT_STEP_TIMEOUT_MS);
  if (maxStepTimeoutMs !== null && defaultStepTimeoutMs !== null && defaultStepTimeoutMs > maxStepTimeoutMs) {
    return withMeta(
      deny(
      "POLICY_STEP_TIMEOUT_CAP",
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
      return withMeta(deny("POLICY_TIME_WINDOW", `execution blocked after ${env.POLICY_NO_EXEC_AFTER_UTC} UTC`));
    }
  }

  // 4) Tier 5.3 approval gate: writes in production require explicit human approval.
  if (isProd(env)) {
    const hasWrites = plan.steps.some((s) => isShellExecutionStep(s) || methodIsWrite((s as any).method));
    if (hasWrites) {
      // If we're resuming via /approve, allow the write to proceed.
      const approved =
        meta?.execution_id && meta?.approved_execution_id && meta.execution_id === meta.approved_execution_id;
      if (!approved) {
        const hosts = uniqueHostsFromSteps(plan.steps);
        const destination = hosts.length ? `Hosts:${hosts.join(",")}` : "External";
        const writeCount = plan.steps.filter((s) => !isShellExecutionStep(s) && methodIsWrite((s as any).method)).length;
        return withMeta(
          requireApproval({
          code: "WRITE_OPERATION",
          reason: "write operation in production requires explicit approval",
          action: "external.write",
          destination,
          summary: `Execute ${writeCount} write step(s)`,
          })
        );
      }
    }
  }

  return withMeta({ allowed: true });

}


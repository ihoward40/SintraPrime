import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { executePlan, type ExecutionRunLog } from "../executor/executePlan.js";
import { persistRun } from "../persist/persistRun.js";
import type { ExecutionPlan } from "../schemas/ExecutionPlan.schema.js";
import { computePlanHash } from "../utils/planHash.js";
import { checkPlanPolicy, checkPolicyWithMeta } from "../policy/checkPolicy.js";

import { getOperatorId, operatorHasRole, type DomainRole } from "../domains/domainRoles.js";

import { substituteTemplatesDeep } from "./templateSubstitute.js";
import { redactSecretsDeep } from "../utils/redactSecrets.js";
import { hasWriteLikeScopes, buildWriteApprovalRequirement, type AdapterUseDeclaration } from "../adapters/governedAdapter.js";
import { stableStringify } from "../law/stableJson.js";
import { sha256HexFromUtf8 } from "../law/sha256.js";
import { notionLiveGet } from "../adapters/notionLiveRead.js";

import {
  WorkflowDefinitionSchema,
  type WorkflowDefinition,
  type WorkflowNode,
} from "./WorkflowDefinition.schema.js";

type WorkflowNodeRun = {
  node_id: string;
  attempt: number;
  status: "success" | "failed" | "skipped";
  started_at: string;
  finished_at: string;
  duration_ms: number;
  plan_hash?: string;
  receipt_hash?: string;
  http_status?: number | null;
  exit_code?: number | null;
  stdout?: string;
  stderr?: string;
  response?: unknown;
  error?: string;
};

export type WorkflowRunReceipt = {
  kind: "WorkflowRunReceipt";
  workflow_id: string;
  threadId: string;
  execution_id: string;
  run_id: string;
  status: "running" | "success" | "failed" | "denied" | "awaiting_approval";
  started_at: string;
  finished_at?: string;
  plan_hash?: string;
  receipt_hash?: string;
  policy_denied?: { code: string; reason: string };
  approval_required?: unknown;
  uses?: unknown;
  nodes: WorkflowNodeRun[];
  artifacts?: Record<string, unknown>;
};

export type WorkflowPlan = {
  kind: "WorkflowPlan";
  created_at: string;
  workflow_id: string;
  threadId: string;
  execution_id: string;
  run_id: string;
  plan_hash: string;
  // Fully resolved spec (templates substituted) so `workflow.run --plan` is deterministic.
  workflow: WorkflowDefinition;
  // Flattened execution plan used for policy evaluation.
  execution_plan: ExecutionPlan;
};

export type WorkflowPolicyVerdict = {
  kind: "WorkflowPolicyVerdict";
  evaluated_at: string;
  execution_id: string;
  workflow_id: string;
  plan_hash: string;
  decision: "ALLOWED" | "DENIED" | "APPROVAL_REQUIRED";
  policy: unknown;
  plan_policy_denied?: { code: string; reason: string } | null;
};

export type WorkflowRequirements = {
  kind: "WorkflowRequirements";
  evaluated_at: string;
  execution_id: string;
  workflow_id: string;
  plan_hash: string;
  required_secrets: string[];
  approvals_required: boolean;
  approvals: unknown[];
  uses: unknown;
};

function requiredSecretNames(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const s of input) {
    if (typeof s === "string" && s.trim()) out.push(s.trim());
    else if (s && typeof s === "object" && typeof (s as any).name === "string" && String((s as any).name).trim()) {
      out.push(String((s as any).name).trim());
    }
  }
  return out;
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function safeFileStem(input: string) {
  // Windows forbids characters like ':' in filenames; keep it portable.
  return String(input).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function computeReceiptHash(payload: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function ensureIdempotencyKeyForStep(step: any, plan_hash: string, threadId: string) {
  if (typeof step?.idempotency_key === "string" && step.idempotency_key.trim()) return;
  const payload = `${String(step?.action ?? "")}|${plan_hash}|${String(step?.step_id ?? "")}|${String(threadId ?? "")}`;
  step.idempotency_key = crypto.createHash("sha256").update(payload).digest("hex");
}

async function populateNotionWritePrestate(step: any) {
  const isNotionLive = typeof step?.action === "string" && String(step.action).startsWith("notion.live.");
  if (!isNotionLive) return;
  if (step?.read_only === true) return;
  if (step?.approval_scoped !== true) return;

  const path = typeof step?.notion_path_prestate === "string" && step.notion_path_prestate.trim()
    ? String(step.notion_path_prestate)
    : (typeof step?.notion_path === "string" && step.notion_path.trim() ? String(step.notion_path) : null);

  if (!step.prestate && path) {
    const pre = await notionLiveGet(path);
    step.prestate = pre.redacted;
  }
  if (!step.prestate_fingerprint && step.prestate) {
    step.prestate_fingerprint = sha256HexFromUtf8(stableStringify(step.prestate));
  }
}

function getByPath(root: unknown, pathExpr: string): unknown {
  if (!pathExpr) return undefined;
  const normalized = pathExpr.startsWith("$") ? pathExpr.replace(/^\$\.?/, "") : pathExpr;
  const tokens: Array<string | number> = [];

  for (const part of normalized.split(".")) {
    if (!part) continue;
    const re = /([^\[\]]+)|(\[(\d+)\])/g;
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

function sleep(ms: number) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function indexNodes(def: WorkflowDefinition) {
  const byId = new Map<string, WorkflowNode>();
  for (const n of def.nodes) {
    if (byId.has(n.id)) {
      throw new Error(`Duplicate node id: ${n.id}`);
    }
    byId.set(n.id, n);
  }
  return byId;
}

function getNextNodeId(def: WorkflowDefinition, node: WorkflowNode, status: "success" | "failed" | "skipped", idx: number): string | null {
  if (node.next) return node.next;
  if (status === "success" && node.on_success) return node.on_success;
  if (status === "failed" && node.on_failure) return node.on_failure;
  const next = def.nodes[idx + 1];
  return next ? next.id : null;
}

function shouldRunNode(node: WorkflowNode, state: Record<string, { response: unknown }>): boolean {
  if (!node.when) return true;
  const ref = state[node.when.ref];
  if (!ref) return false;
  const actual = getByPath(ref.response, node.when.path);
  return JSON.stringify(actual) === JSON.stringify(node.when.equals);
}

function toExecutionStep(node: WorkflowNode) {
  const step: any = node.step as any;

  // Workflow-level convenience: NotionAdapter insert compiles to governed notion.live.insert.
  if (step?.adapter === "NotionAdapter" && step?.method === "insert") {
    const dbId = String(step?.database_id ?? "").trim();
    const content = step?.content && typeof step.content === "object" ? step.content : {};

    const properties: Record<string, any> = {};
    for (const [k, v] of Object.entries(content)) {
      const key = String(k);
      const text = v === null || v === undefined ? "" : String(v);
      if (key.toLowerCase() === "title") {
        properties[key] = { title: [{ text: { content: text } }] };
      } else {
        properties[key] = { rich_text: [{ text: { content: text } }] };
      }
    }

    return {
      step_id: node.id,
      action: "notion.live.insert",
      adapter: "NotionAdapter",
      method: "POST",
      read_only: false,
      approval_scoped: true,
      // Create page
      url: "https://api.notion.com/v1/pages",
      notion_path: "/v1/pages",
      // Prestate: capture the database schema as the write prestate.
      notion_path_prestate: dbId ? `/v1/databases/${dbId}` : undefined,
      properties,
      payload: {
        parent: { database_id: dbId },
        properties,
      },
      expects: { http_status: [200] },
    } as any;
  }

  // ShellAdapter steps flow through as-is (executor understands them).
  if (step?.adapter === "ShellAdapter") {
    return {
      step_id: node.id,
      adapter: "ShellAdapter",
      action: typeof step.action === "string" && step.action.trim() ? step.action : "shell.run",
      command: String(step.command ?? ""),
      shell: (step.shell ?? "bash"),
      cwd: step.cwd,
      env: step.env,
      timeout_ms: step.timeout_ms,
      expects: step.expects,
    } as any;
  }

  // BrowserAgent steps flow through, but ensure action default is present.
  if (step?.adapter === "BrowserAgent") {
    const method = String((step as any)?.method ?? "goto").trim() as any;
    const defaultAction = method === "pause_for_confirmation"
      ? "browser.pause_for_confirmation"
      : method === "run_script"
        ? "browser.run_script"
        : "browser.goto";

    return {
      step_id: node.id,
      adapter: "BrowserAgent",
      action: typeof step.action === "string" && step.action.trim() ? step.action : defaultAction,
      method,
      url: typeof (step as any).url === "string" ? String((step as any).url) : undefined,
      timeout_ms: (step as any).timeout_ms,
      message: typeof (step as any).message === "string" ? String((step as any).message) : undefined,
      script: typeof (step as any).script === "string" ? String((step as any).script) : undefined,
      headed: typeof (step as any).headed === "boolean" ? (step as any).headed : undefined,
      expects: (step as any).expects,
    } as any;
  }

  // SnapshotAdapter steps flow through, but ensure action default is present.
  if (step?.adapter === "SnapshotAdapter" && step?.method === "capture") {
    return {
      step_id: node.id,
      adapter: "SnapshotAdapter",
      action: typeof step.action === "string" && step.action.trim() ? step.action : "snapshot.capture",
      method: "capture",
      vendor: String((step as any).vendor ?? ""),
      url: String((step as any).url ?? ""),
      mode: (step as any).mode,
      robots: (step as any).robots,
      labels: (step as any).labels,
      notes: (step as any).notes,
      expects: (step as any).expects,
    } as any;
  }

  return {
    step_id: node.id,
    ...step,
  };
}

function buildBudgetPlan(def: WorkflowDefinition, execution_id: string): ExecutionPlan {
  const plan: ExecutionPlan = {
    kind: "ExecutionPlan",
    execution_id,
    threadId: def.threadId,
    dry_run: def.dry_run,
    goal: def.goal,
    agent_versions: def.agent_versions,
    assumptions: def.assumptions,
    required_secrets: def.required_secrets,
    steps: def.nodes.map((n) => toExecutionStep(n)),
  };
  return plan;
}

export async function runWorkflowFromJson(input: unknown): Promise<WorkflowRunReceipt> {
  const def = WorkflowDefinitionSchema.parse(input);
  return runWorkflow(def);
}

export type WorkflowRunOptions = {
  template_vars?: Record<string, string>;
  redact_secrets?: string[];
  operator_id?: string;
};

function stableJson(value: unknown) {
  // Keep artifact JSON stable and readable.
  return JSON.stringify(value, null, 2) + "\n";
}

function computeWorkflowApprovalToken(params: { execution_id: string; plan_hash: string; scope: string }) {
  const payload = `workflow.approval|${params.execution_id}|${params.plan_hash}|${params.scope}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function workflowRunDir(execution_id: string) {
  const base = process.env.SINTRAPRIME_RUNS_DIR || path.resolve(process.cwd(), "runs");
  return path.join(base, safeFileStem(execution_id));
}

export async function writeWorkflowPlanArtifacts(params: {
  outPlanPath: string;
  plan: WorkflowPlan;
  policyVerdict: WorkflowPolicyVerdict;
  requirements: WorkflowRequirements;
}) {
  ensureDir(path.dirname(params.outPlanPath));
  fs.writeFileSync(params.outPlanPath, stableJson(params.plan), "utf8");

  const baseDir = path.dirname(params.outPlanPath);
  const policyPath = path.join(baseDir, "policy.verdict.json");
  const reqPath = path.join(baseDir, "requirements.json");
  fs.writeFileSync(policyPath, stableJson(params.policyVerdict), "utf8");
  fs.writeFileSync(reqPath, stableJson(params.requirements), "utf8");

  return { policyPath, requirementsPath: reqPath };
}

export async function createWorkflowPlan(params: {
  def: WorkflowDefinition;
  opts?: WorkflowRunOptions;
  execution_id?: string;
  run_id?: string;
}) {
  const runId = typeof params.run_id === "string" && params.run_id.trim() ? params.run_id.trim() : crypto.randomBytes(10).toString("hex");
  const execution_id = typeof params.execution_id === "string" && params.execution_id.trim()
    ? params.execution_id.trim()
    : `workflow:${params.def.workflow_id}:${runId}`;

  const uses: AdapterUseDeclaration[] = Array.isArray((params.def as any).uses) ? ((params.def as any).uses as AdapterUseDeclaration[]) : [];

  const baseVars: Record<string, string> = {
    ...Object.fromEntries(Object.entries(process.env).map(([k, v]) => [k, String(v ?? "")])),
    ...(params.def.vars ?? {}),
    ...(params.opts?.template_vars ?? {}),
  };

  const resolvedNodes: WorkflowNode[] = params.def.nodes.map((node) => {
    const nodeVars: Record<string, string> = {
      ...baseVars,
      ...((node as any).vars ?? {}),
      ...((node as any).env ?? {}),
    };

    const rendered = substituteTemplatesDeep(toExecutionStep(node), nodeVars);
    return {
      ...(node as any),
      step: rendered,
    } as any;
  });

  const resolvedWorkflow: WorkflowDefinition = {
    ...(params.def as any),
    nodes: resolvedNodes,
  };

  const budgetPlan: ExecutionPlan = {
    kind: "ExecutionPlan",
    execution_id,
    threadId: resolvedWorkflow.threadId,
    dry_run: resolvedWorkflow.dry_run,
    goal: resolvedWorkflow.goal,
    agent_versions: resolvedWorkflow.agent_versions,
    assumptions: resolvedWorkflow.assumptions,
    required_secrets: resolvedWorkflow.required_secrets,
    steps: resolvedNodes.map((n) => n.step as any),
  };

  const plan_hash = computePlanHash(budgetPlan);

  for (const s of (budgetPlan as any).steps ?? []) {
    if (typeof (s as any)?.action === "string" && String((s as any).action).startsWith("notion.live.")) {
      try {
        await populateNotionWritePrestate(s);
      } catch {
        // Best-effort: planning should still complete even if prestate cannot be fetched.
      }
      ensureIdempotencyKeyForStep(s, plan_hash, resolvedWorkflow.threadId);
    }
  }

  const planDenied = checkPlanPolicy(budgetPlan);
  if (planDenied) {
    const policyVerdict: WorkflowPolicyVerdict = {
      kind: "WorkflowPolicyVerdict",
      evaluated_at: nowIso(),
      execution_id,
      workflow_id: resolvedWorkflow.workflow_id,
      plan_hash,
      decision: "DENIED",
      policy: { allowed: false, denied: planDenied },
      plan_policy_denied: { code: planDenied.code, reason: planDenied.reason },
    };
    const requirements: WorkflowRequirements = {
      kind: "WorkflowRequirements",
      evaluated_at: policyVerdict.evaluated_at,
      execution_id,
      workflow_id: resolvedWorkflow.workflow_id,
      plan_hash,
      required_secrets: requiredSecretNames((resolvedWorkflow as any).required_secrets),
      approvals_required: false,
      approvals: [],
      uses,
    };

    const plan: WorkflowPlan = {
      kind: "WorkflowPlan",
      created_at: nowIso(),
      workflow_id: resolvedWorkflow.workflow_id,
      threadId: resolvedWorkflow.threadId,
      execution_id,
      run_id: runId,
      plan_hash,
      workflow: resolvedWorkflow,
      execution_plan: budgetPlan,
    };

    return { plan, policyVerdict, requirements };
  }

  // Policy precheck (approval required is a first-class state).
  const policy = checkPolicyWithMeta(budgetPlan, process.env, new Date(), {
    command: `workflow.run ${resolvedWorkflow.workflow_id}`,
    execution_id,
    total_steps_planned: resolvedWorkflow.nodes.length,
  });

  const decision: WorkflowPolicyVerdict["decision"] =
    (policy as any)?.allowed === true
      ? "ALLOWED"
      : (policy as any)?.requireApproval
        ? "APPROVAL_REQUIRED"
        : "DENIED";

  const approvals: unknown[] = [];
  if (!resolvedWorkflow.dry_run && hasWriteLikeScopes(uses)) {
    approvals.push(
      buildWriteApprovalRequirement({
        execution_id,
        workflow_id: resolvedWorkflow.workflow_id,
        uses,
      })
    );
  }
  if ((policy as any)?.requireApproval && (policy as any)?.approval) {
    approvals.push((policy as any).approval);
  }

  const policyVerdict: WorkflowPolicyVerdict = {
    kind: "WorkflowPolicyVerdict",
    evaluated_at: nowIso(),
    execution_id,
    workflow_id: resolvedWorkflow.workflow_id,
    plan_hash,
    decision,
    policy,
    plan_policy_denied: null,
  };

  const requirements: WorkflowRequirements = {
    kind: "WorkflowRequirements",
    evaluated_at: policyVerdict.evaluated_at,
    execution_id,
    workflow_id: resolvedWorkflow.workflow_id,
    plan_hash,
    required_secrets: requiredSecretNames((resolvedWorkflow as any).required_secrets),
    approvals_required: approvals.length > 0 && !resolvedWorkflow.dry_run,
    approvals,
    uses,
  };

  const plan: WorkflowPlan = {
    kind: "WorkflowPlan",
    created_at: nowIso(),
    workflow_id: resolvedWorkflow.workflow_id,
    threadId: resolvedWorkflow.threadId,
    execution_id,
    run_id: runId,
    plan_hash,
    workflow: resolvedWorkflow,
    execution_plan: budgetPlan,
  };

  return { plan, policyVerdict, requirements };
}

export function isWorkflowApprovalTokenValid(params: {
  execution_id: string;
  plan_hash: string;
  scope: string;
  token: string;
}) {
  const expected = computeWorkflowApprovalToken({ execution_id: params.execution_id, plan_hash: params.plan_hash, scope: params.scope });
  return expected === params.token;
}

export function computeWorkflowApprovalTokenForPlan(params: { plan: WorkflowPlan; scope: string }) {
  return computeWorkflowApprovalToken({ execution_id: params.plan.execution_id, plan_hash: params.plan.plan_hash, scope: params.scope });
}

export function loadWorkflowPlanFromPath(planPath: string): WorkflowPlan {
  const raw = fs.readFileSync(planPath, "utf8");
  const obj = JSON.parse(raw);
  if (!obj || typeof obj !== "object" || (obj as any).kind !== "WorkflowPlan") {
    throw new Error(`Not a WorkflowPlan: ${planPath}`);
  }
  return obj as WorkflowPlan;
}

export async function runWorkflowFromPlan(params: {
  plan: WorkflowPlan;
  opts?: WorkflowRunOptions;
  approval?: { scope: string; token: string } | null;
}) {
  const def = params.plan.workflow;
  const execution_id = params.plan.execution_id;
  const runId = params.plan.run_id;

  const uses: AdapterUseDeclaration[] = Array.isArray((def as any).uses) ? ((def as any).uses as AdapterUseDeclaration[]) : [];

  const started_at = nowIso();
  const receipt: WorkflowRunReceipt = {
    kind: "WorkflowRunReceipt",
    workflow_id: def.workflow_id,
    threadId: def.threadId,
    execution_id,
    run_id: runId,
    status: "running",
    started_at,
    uses,
    nodes: [],
    plan_hash: params.plan.plan_hash,
  };

  const approved = params.approval && isWorkflowApprovalTokenValid({
    execution_id,
    plan_hash: params.plan.plan_hash,
    scope: params.approval.scope,
    token: params.approval.token,
  });

  // Policy precheck.
  {
    if (!def.dry_run && hasWriteLikeScopes(uses) && !approved) {
      receipt.status = "awaiting_approval";
      receipt.approval_required = buildWriteApprovalRequirement({ execution_id, workflow_id: def.workflow_id, uses });
      receipt.finished_at = nowIso();
      receipt.receipt_hash = computeReceiptHash(receipt);
      await persistRun(receipt as any);
      return receipt;
    }

    const budgetPlan: ExecutionPlan = params.plan.execution_plan;
    const planDenied = checkPlanPolicy(budgetPlan);
    if (planDenied) {
      receipt.status = "denied";
      receipt.policy_denied = { code: planDenied.code, reason: planDenied.reason };
      receipt.finished_at = nowIso();
      receipt.receipt_hash = computeReceiptHash(receipt);
      await persistRun(receipt as any);
      return receipt;
    }

    const policy = checkPolicyWithMeta(budgetPlan, process.env, new Date(), {
      command: `workflow.run ${def.workflow_id}`,
      execution_id,
      approved_execution_id: approved ? execution_id : undefined,
      total_steps_planned: def.nodes.length,
    });

    if (!policy.allowed) {
      if ((policy as any).requireApproval) {
        receipt.status = "awaiting_approval";
        receipt.approval_required = (policy as any).approval;
      } else {
        receipt.status = "denied";
        receipt.policy_denied = {
          code: (policy as any).denied?.code ?? "POLICY_DENIED",
          reason: (policy as any).denied?.reason ?? "policy denied",
        };
      }
      receipt.finished_at = nowIso();
      receipt.receipt_hash = computeReceiptHash(receipt);
      await persistRun(receipt as any);
      return receipt;
    }
  }

  // ClickOps Visualize mode (flight-plan preview):
  // - Prints resolved steps + DSL
  // - Opens the first allowlisted URL (goto)
  // - Takes ONE screenshot
  // - Performs no input actions and returns early
  const isVisualize = String(process.env.SINTRAPRIME_CLICKOPS_VISUALIZE ?? "") === "1";
  if (isVisualize) {
    const safeRunDirPart = (input: string) => String(input ?? "").replace(/[\\/<>:\"|?*\x00-\x1F]/g, "_").slice(0, 160);
    const runDir = path.join(process.cwd(), "runs", safeRunDirPart(execution_id));
    ensureDir(runDir);

    const planPath = path.join(runDir, "visualize.plan.txt");
    const dslPath = path.join(runDir, "visualize.dsl.txt");
    const screenshotPath = path.join(runDir, "visualize.initial.png");

    const lines: string[] = [];
    const dsl: string[] = [];
    lines.push(`# ClickOps Visualize`);
    lines.push(`execution_id: ${execution_id}`);
    lines.push(`workflow_id: ${def.workflow_id}`);
    lines.push(`threadId: ${def.threadId}`);
    lines.push(`goal: ${def.goal}`);
    lines.push(`steps: ${params.plan.execution_plan.steps.length}`);
    lines.push("");

    let firstGotoUrl: string | null = null;
    for (const [i, s] of params.plan.execution_plan.steps.entries()) {
      const method = String((s as any)?.method ?? "").trim();
      const url = typeof (s as any)?.url === "string" ? String((s as any).url).trim() : "";
      lines.push(`- step_${String(i + 1).padStart(2, "0")}: ${String((s as any)?.step_id ?? "")}  method=${method}${url ? `  url=${url}` : ""}`);

      if (!firstGotoUrl && method === "goto" && url) firstGotoUrl = url;

      if (method === "pause_for_confirmation") {
        const msg = String((s as any)?.message ?? "").trim();
        if (msg) {
          lines.push("  prompt:");
          for (const l of msg.split(/\r?\n/)) lines.push(`    ${l}`);
        }
      }

      if (method === "run_script") {
        const script = String((s as any)?.script ?? "");
        dsl.push(`# step_${String(i + 1).padStart(2, "0")}: ${String((s as any)?.step_id ?? "")}`);
        dsl.push(script.trimEnd());
        dsl.push("");
      }
    }

    fs.writeFileSync(planPath, lines.join("\n") + "\n", "utf8");
    fs.writeFileSync(dslPath, dsl.join("\n") + "\n", "utf8");
    process.stderr.write(`[clickops.visualize] wrote ${planPath}\n`);

    // Open only the first goto URL and capture one screenshot.
    if (firstGotoUrl) {
      try {
        const { loadBrowserAllowlist } = await import("../adapters/browser-agent.js");
        const baseAllow: any = await loadBrowserAllowlist({ cwd: process.cwd() });
        const allow = new Set(Array.from(baseAllow ?? []).map((h: any) => String(h).toLowerCase()));

        const u = new URL(firstGotoUrl);
        const host = String(u.hostname ?? "").toLowerCase();
        if (!allow.has(host)) {
          throw new Error(`BrowserAgent blocked by allowlist: ${host} (see browser.allowlist.json)`);
        }

        const { chromium } = await import("playwright");
        const browser = await chromium.launch({ headless: true });
        try {
          const context = await browser.newContext();
          const page = await context.newPage();

          await page.route("**/*", async (route) => {
            const reqUrl = route.request().url();
            try {
              const ru = new URL(reqUrl);
              if (ru.protocol === "http:" || ru.protocol === "https:") {
                const rh = String(ru.hostname ?? "").toLowerCase();
                if (!allow.has(rh)) {
                  await route.abort();
                  return;
                }
              }
            } catch {
              await route.abort();
              return;
            }
            await route.continue();
          });

          await page.goto(firstGotoUrl, { waitUntil: "load", timeout: 30_000 });
          await page.screenshot({ path: screenshotPath, fullPage: true });
          await context.close();
        } finally {
          await browser.close();
        }
      } catch (e: any) {
        process.stderr.write(`[clickops.visualize] screenshot failed: ${String(e?.message ?? e)}\n`);
      }
    }

    receipt.status = "success";
    receipt.finished_at = nowIso();
    receipt.artifacts = {
      ...(receipt.artifacts ?? {}),
      clickops_visualize: {
        plan_path: planPath,
        dsl_path: dslPath,
        initial_screenshot: firstGotoUrl ? screenshotPath : null,
      },
    };
    receipt.receipt_hash = computeReceiptHash(receipt);
    await persistRun(receipt as any);
    return receipt;
  }

  // From a saved plan: steps are already template-resolved; reuse the existing runner loop by
  // delegating to the normal function with the fixed execution id.
  // We do this by calling runWorkflow with a patched random id, but preserving semantics.
  // NOTE: `runWorkflow` generates its own execution_id, so we re-implement the minimal loop here.

  const nodeIndex = indexNodes(def);
  const state: Record<string, { response: unknown }> = {};

  const operator_id = typeof params.opts?.operator_id === "string" && params.opts.operator_id.trim()
    ? params.opts.operator_id.trim()
    : getOperatorId(process.env);

  const redact = (v: unknown) => {
    const secrets = Array.isArray(params.opts?.redact_secrets) ? params.opts!.redact_secrets! : [];
    if (!secrets.length) return v;
    return redactSecretsDeep(v, secrets);
  };

  let currentNodeId: string | null = def.nodes[0]?.id ?? null;
  let safetyCounter = 0;

  while (currentNodeId) {
    safetyCounter += 1;
    if (safetyCounter > def.nodes.length + 50) {
      receipt.status = "failed";
      receipt.finished_at = nowIso();
      receipt.receipt_hash = computeReceiptHash(receipt);
      throw new Error("Workflow routing appears to be looping indefinitely");
    }

    const node = nodeIndex.get(currentNodeId);
    if (!node) {
      receipt.status = "failed";
      receipt.finished_at = nowIso();
      receipt.receipt_hash = computeReceiptHash(receipt);
      throw new Error(`Unknown node id referenced by routing: ${currentNodeId}`);
    }

    const idx = def.nodes.findIndex((n) => n.id === node.id);

    if (!shouldRunNode(node, state)) {
      const t0 = Date.now();
      const started = nowIso();
      const finished = nowIso();
      receipt.nodes.push({
        node_id: node.id,
        attempt: 0,
        status: "skipped",
        started_at: started,
        finished_at: finished,
        duration_ms: Date.now() - t0,
      });

      currentNodeId = getNextNodeId(def, node, "skipped", idx);
      continue;
    }

    // Minimal policy gate: hours + role.
    {
      const policy = (node as any).policy as { hoursAllowed?: number[]; requiredRole?: DomainRole } | undefined;
      if (policy?.hoursAllowed && Array.isArray(policy.hoursAllowed) && policy.hoursAllowed.length) {
        const hour = new Date().getHours();
        if (!policy.hoursAllowed.includes(hour)) {
          const started = nowIso();
          const finished = nowIso();
          receipt.nodes.push({
            node_id: node.id,
            attempt: 0,
            status: "failed",
            started_at: started,
            finished_at: finished,
            duration_ms: 0,
            error: `Policy denied: node '${node.id}' not allowed at hour ${hour}`,
          });
          receipt.status = "denied";
          receipt.policy_denied = { code: "WORKFLOW_POLICY_HOUR_DENY", reason: `node '${node.id}' not allowed at hour ${hour}` };
          receipt.finished_at = nowIso();
          receipt.receipt_hash = computeReceiptHash(receipt);
          await persistRun(receipt as any);
          return receipt;
        }
      }

      if (policy?.requiredRole) {
        const domain_id = typeof def.domain_id === "string" ? def.domain_id.trim() : "";
        if (!domain_id) {
          const started = nowIso();
          const finished = nowIso();
          receipt.nodes.push({
            node_id: node.id,
            attempt: 0,
            status: "failed",
            started_at: started,
            finished_at: finished,
            duration_ms: 0,
            error: `Policy denied: requiredRole set but workflow.domain_id is missing`,
          });
          receipt.status = "denied";
          receipt.policy_denied = { code: "WORKFLOW_POLICY_DOMAIN_MISSING", reason: "requiredRole requires workflow.domain_id" };
          receipt.finished_at = nowIso();
          receipt.receipt_hash = computeReceiptHash(receipt);
          await persistRun(receipt as any);
          return receipt;
        }

        const ok = operatorHasRole({ operator_id, domain_id, role: policy.requiredRole });
        if (!ok) {
          const started = nowIso();
          const finished = nowIso();
          receipt.nodes.push({
            node_id: node.id,
            attempt: 0,
            status: "failed",
            started_at: started,
            finished_at: finished,
            duration_ms: 0,
            error: `Policy denied: operator '${operator_id}' lacks role '${policy.requiredRole}' for domain '${domain_id}'`,
          });
          receipt.status = "denied";
          receipt.policy_denied = { code: "WORKFLOW_POLICY_ROLE_DENY", reason: `missing role ${policy.requiredRole} for domain ${domain_id}` };
          receipt.finished_at = nowIso();
          receipt.receipt_hash = computeReceiptHash(receipt);
          await persistRun(receipt as any);
          return receipt;
        }
      }
    }

    const retry = node.retry ?? { max_attempts: 1, backoff_ms: 0 };
    let finalStatus: "success" | "failed" = "failed";

    for (let attempt = 1; attempt <= retry.max_attempts; attempt++) {
      const t0 = Date.now();
      const started = nowIso();

      const renderedStep = toExecutionStep(node) as any;

      const singleStepPlan: ExecutionPlan = {
        kind: "ExecutionPlan",
        execution_id,
        threadId: def.threadId,
        dry_run: def.dry_run,
        goal: def.goal,
        agent_versions: def.agent_versions,
        assumptions: def.assumptions,
        required_secrets: def.required_secrets,
        steps: [renderedStep],
      };

      const nodeRun: WorkflowNodeRun = {
        node_id: node.id,
        attempt,
        status: "failed",
        started_at: started,
        finished_at: started,
        duration_ms: 0,
      };

      let stepReceipt: ExecutionRunLog | null = null;
      try {
        stepReceipt = await executePlan(singleStepPlan);

        nodeRun.plan_hash = (stepReceipt as any).plan_hash;
        nodeRun.receipt_hash = stepReceipt.receipt_hash;

        const firstStep = stepReceipt.steps?.[0];
        nodeRun.http_status = firstStep?.http_status ?? null;
        nodeRun.exit_code = (firstStep as any)?.exit_code ?? null;
        nodeRun.stdout = typeof (firstStep as any)?.stdout === "string" ? String((firstStep as any).stdout) : undefined;
        nodeRun.stderr = typeof (firstStep as any)?.stderr === "string" ? String((firstStep as any).stderr) : undefined;
        nodeRun.response = redact(firstStep?.response ?? null);

        if (stepReceipt.status === "success") {
          nodeRun.status = "success";
          finalStatus = "success";
          state[node.id] = { response: nodeRun.response ?? null };
        } else {
          nodeRun.status = "failed";
          nodeRun.error = String(redact(stepReceipt.error ?? firstStep?.error ?? "step failed"));
        }
      } catch (e: any) {
        nodeRun.status = "failed";
        nodeRun.error = String(redact(e?.message ?? String(e)));
      } finally {
        nodeRun.duration_ms = Date.now() - t0;
        nodeRun.finished_at = nowIso();
        receipt.nodes.push(nodeRun);
      }

      if (stepReceipt) {
        await persistRun(stepReceipt);
      }

      if (finalStatus === "success") break;
      if (attempt < retry.max_attempts) {
        await sleep(retry.backoff_ms);
      }
    }

    if (finalStatus === "failed") {
      const next = getNextNodeId(def, node, "failed", idx);
      if (!next) {
        receipt.status = "failed";
        receipt.finished_at = nowIso();
        receipt.receipt_hash = computeReceiptHash(receipt);
        break;
      }
      currentNodeId = next;
      continue;
    }

    currentNodeId = getNextNodeId(def, node, "success", idx);
  }

  if (receipt.status === "running") {
    receipt.status = "success";
    receipt.finished_at = nowIso();
    receipt.receipt_hash = computeReceiptHash(receipt);
  }

  {
    const base = process.env.SINTRAPRIME_RUNS_DIR || path.resolve(process.cwd(), "runs");
    const outDir = path.join(base, "workflow", safeFileStem(def.workflow_id));
    ensureDir(outDir);
    const ts = safeFileStem(new Date().toISOString());
    const outPath = path.join(outDir, `${ts}.json`);
    fs.writeFileSync(outPath, JSON.stringify(receipt, null, 2), "utf8");
    receipt.artifacts = { ...(receipt.artifacts ?? {}), workflow_receipt_path: outPath };
  }

  await persistRun(receipt as any);
  return receipt;
}

export async function runWorkflow(def: WorkflowDefinition, opts?: WorkflowRunOptions): Promise<WorkflowRunReceipt> {
  const runId = crypto.randomBytes(10).toString("hex");
  const execution_id = `workflow:${def.workflow_id}:${runId}`;

  const uses: AdapterUseDeclaration[] = Array.isArray((def as any).uses) ? ((def as any).uses as AdapterUseDeclaration[]) : [];

  const started_at = nowIso();
  const receipt: WorkflowRunReceipt = {
    kind: "WorkflowRunReceipt",
    workflow_id: def.workflow_id,
    threadId: def.threadId,
    execution_id,
    run_id: runId,
    status: "running",
    started_at,
    uses,
    nodes: [],
  };

  const nodeIndex = indexNodes(def);

  const baseVars: Record<string, string> = {
    ...Object.fromEntries(Object.entries(process.env).map(([k, v]) => [k, String(v ?? "")])),
    ...(def.vars ?? {}),
    ...(opts?.template_vars ?? {}),
  };

  const renderNodeStepForPolicy = (node: WorkflowNode) => {
    const nodeVars: Record<string, string> = {
      ...baseVars,
      ...((node as any).vars ?? {}),
      ...((node as any).env ?? {}),
    };

    return substituteTemplatesDeep(toExecutionStep(node), nodeVars);
  };

  // Policy precheck over the entire declared node list.
  {
    // Adapter write-scope guard: explicit approval required.
    // This is a workflow-level gate to keep adapter capability declarations honest.
    if (!def.dry_run && hasWriteLikeScopes(uses)) {
      receipt.status = "awaiting_approval";
      receipt.approval_required = buildWriteApprovalRequirement({
        execution_id,
        workflow_id: def.workflow_id,
        uses,
      });
      receipt.finished_at = nowIso();
      receipt.receipt_hash = computeReceiptHash(receipt);
      await persistRun(receipt as any);
      return receipt;
    }

    const budgetPlan: ExecutionPlan = {
      kind: "ExecutionPlan",
      execution_id,
      threadId: def.threadId,
      dry_run: def.dry_run,
      goal: def.goal,
      agent_versions: def.agent_versions,
      assumptions: def.assumptions,
      required_secrets: def.required_secrets,
      steps: def.nodes.map((n) => renderNodeStepForPolicy(n)),
    };
    const plan_hash = computePlanHash(budgetPlan);
    receipt.plan_hash = plan_hash;

    // Tier-10.x parity: ensure approval-scoped notion.live.* steps have prestate/fingerprint
    // before policy evaluation so approval requirements are deterministic.
    for (const s of (budgetPlan as any).steps ?? []) {
      if (typeof (s as any)?.action === "string" && String((s as any).action).startsWith("notion.live.")) {
        await populateNotionWritePrestate(s);
        ensureIdempotencyKeyForStep(s, plan_hash, def.threadId);
      }
    }

    const budgetDenied = checkPlanPolicy(budgetPlan);
    if (budgetDenied) {
      receipt.status = "denied";
      receipt.policy_denied = { code: budgetDenied.code, reason: budgetDenied.reason };
      receipt.finished_at = nowIso();
      receipt.receipt_hash = computeReceiptHash(receipt);
      await persistRun(receipt as any);
      return receipt;
    }

    const policy = checkPolicyWithMeta(budgetPlan, process.env, new Date(), {
      command: `workflow.run ${def.workflow_id}`,
      execution_id,
      total_steps_planned: def.nodes.length,
    });

    if (!policy.allowed) {
      if ((policy as any).requireApproval) {
        receipt.status = "awaiting_approval";
        receipt.approval_required = (policy as any).approval;
      } else {
        receipt.status = "denied";
        receipt.policy_denied = {
          code: (policy as any).denied?.code ?? "POLICY_DENIED",
          reason: (policy as any).denied?.reason ?? "policy denied",
        };
      }
      receipt.finished_at = nowIso();
      receipt.receipt_hash = computeReceiptHash(receipt);
      await persistRun(receipt as any);
      return receipt;
    }
  }

  const state: Record<string, { response: unknown }> = {};

  const operator_id = typeof opts?.operator_id === "string" && opts.operator_id.trim()
    ? opts.operator_id.trim()
    : getOperatorId(process.env);

  const redact = (v: unknown) => {
    const secrets = Array.isArray(opts?.redact_secrets) ? opts!.redact_secrets! : [];
    if (!secrets.length) return v;
    return redactSecretsDeep(v, secrets);
  };

  let currentNodeId: string | null = def.nodes[0]?.id ?? null;
  let safetyCounter = 0;

  while (currentNodeId) {
    safetyCounter += 1;
    if (safetyCounter > def.nodes.length + 50) {
      receipt.status = "failed";
      receipt.finished_at = nowIso();
      receipt.receipt_hash = computeReceiptHash(receipt);
      throw new Error("Workflow routing appears to be looping indefinitely");
    }

    const node = nodeIndex.get(currentNodeId);
    if (!node) {
      receipt.status = "failed";
      receipt.finished_at = nowIso();
      receipt.receipt_hash = computeReceiptHash(receipt);
      throw new Error(`Unknown node id referenced by routing: ${currentNodeId}`);
    }

    const idx = def.nodes.findIndex((n) => n.id === node.id);

    if (!shouldRunNode(node, state)) {
      const t0 = Date.now();
      const started = nowIso();
      const finished = nowIso();
      receipt.nodes.push({
        node_id: node.id,
        attempt: 0,
        status: "skipped",
        started_at: started,
        finished_at: finished,
        duration_ms: Date.now() - t0,
      });

      currentNodeId = getNextNodeId(def, node, "skipped", idx);
      continue;
    }

    // Minimal policy gate: hours + role.
    {
      const policy = (node as any).policy as { hoursAllowed?: number[]; requiredRole?: DomainRole } | undefined;
      if (policy?.hoursAllowed && Array.isArray(policy.hoursAllowed) && policy.hoursAllowed.length) {
        const hour = new Date().getHours();
        if (!policy.hoursAllowed.includes(hour)) {
          const started = nowIso();
          const finished = nowIso();
          receipt.nodes.push({
            node_id: node.id,
            attempt: 0,
            status: "failed",
            started_at: started,
            finished_at: finished,
            duration_ms: 0,
            error: `Policy denied: node '${node.id}' not allowed at hour ${hour}`,
          });
          receipt.status = "denied";
          receipt.policy_denied = { code: "WORKFLOW_POLICY_HOUR_DENY", reason: `node '${node.id}' not allowed at hour ${hour}` };
          receipt.finished_at = nowIso();
          receipt.receipt_hash = computeReceiptHash(receipt);
          await persistRun(receipt as any);
          return receipt;
        }
      }

      if (policy?.requiredRole) {
        const domain_id = typeof def.domain_id === "string" ? def.domain_id.trim() : "";
        if (!domain_id) {
          const started = nowIso();
          const finished = nowIso();
          receipt.nodes.push({
            node_id: node.id,
            attempt: 0,
            status: "failed",
            started_at: started,
            finished_at: finished,
            duration_ms: 0,
            error: `Policy denied: requiredRole set but workflow.domain_id is missing`,
          });
          receipt.status = "denied";
          receipt.policy_denied = { code: "WORKFLOW_POLICY_DOMAIN_MISSING", reason: "requiredRole requires workflow.domain_id" };
          receipt.finished_at = nowIso();
          receipt.receipt_hash = computeReceiptHash(receipt);
          await persistRun(receipt as any);
          return receipt;
        }

        const ok = operatorHasRole({ operator_id, domain_id, role: policy.requiredRole });
        if (!ok) {
          const started = nowIso();
          const finished = nowIso();
          receipt.nodes.push({
            node_id: node.id,
            attempt: 0,
            status: "failed",
            started_at: started,
            finished_at: finished,
            duration_ms: 0,
            error: `Policy denied: operator '${operator_id}' lacks role '${policy.requiredRole}' for domain '${domain_id}'`,
          });
          receipt.status = "denied";
          receipt.policy_denied = { code: "WORKFLOW_POLICY_ROLE_DENY", reason: `missing role ${policy.requiredRole} for domain ${domain_id}` };
          receipt.finished_at = nowIso();
          receipt.receipt_hash = computeReceiptHash(receipt);
          await persistRun(receipt as any);
          return receipt;
        }
      }
    }

    const retry = node.retry ?? { max_attempts: 1, backoff_ms: 0 };

    let finalStatus: "success" | "failed" = "failed";

    for (let attempt = 1; attempt <= retry.max_attempts; attempt++) {
      const t0 = Date.now();
      const started = nowIso();

      const nodeVars: Record<string, string> = {
        ...baseVars,
        ...((node as any).vars ?? {}),
        ...((node as any).env ?? {}),
      };

      const renderedStep = substituteTemplatesDeep(toExecutionStep(node), nodeVars);

      const singleStepPlan: ExecutionPlan = {
        kind: "ExecutionPlan",
        execution_id,
        threadId: def.threadId,
        dry_run: def.dry_run,
        goal: def.goal,
        agent_versions: def.agent_versions,
        assumptions: def.assumptions,
        required_secrets: def.required_secrets,
        steps: [renderedStep],
      };

      const nodeRun: WorkflowNodeRun = {
        node_id: node.id,
        attempt,
        status: "failed",
        started_at: started,
        finished_at: started,
        duration_ms: 0,
      };

      let stepReceipt: ExecutionRunLog | null = null;
      try {
        stepReceipt = await executePlan(singleStepPlan);

        nodeRun.plan_hash = (stepReceipt as any).plan_hash;
        nodeRun.receipt_hash = stepReceipt.receipt_hash;

        const firstStep = stepReceipt.steps?.[0];
        nodeRun.http_status = firstStep?.http_status ?? null;
        nodeRun.exit_code = (firstStep as any)?.exit_code ?? null;
        nodeRun.stdout = typeof (firstStep as any)?.stdout === "string" ? String((firstStep as any).stdout) : undefined;
        nodeRun.stderr = typeof (firstStep as any)?.stderr === "string" ? String((firstStep as any).stderr) : undefined;
        nodeRun.response = redact(firstStep?.response ?? null);

        if (stepReceipt.status === "success") {
          nodeRun.status = "success";
          finalStatus = "success";
          state[node.id] = { response: nodeRun.response ?? null };
        } else {
          nodeRun.status = "failed";
          nodeRun.error = String(redact(stepReceipt.error ?? firstStep?.error ?? "step failed"));
        }
      } catch (e: any) {
        nodeRun.status = "failed";
        nodeRun.error = String(redact(e?.message ?? String(e)));
      } finally {
        nodeRun.duration_ms = Date.now() - t0;
        nodeRun.finished_at = nowIso();
        receipt.nodes.push(nodeRun);
      }

      if (stepReceipt) {
        await persistRun(stepReceipt);
      }

      if (finalStatus === "success") break;
      if (attempt < retry.max_attempts) {
        await sleep(retry.backoff_ms);
      }
    }

    // Optional post-step emit: send webhook payload describing the node result.
    {
      const emit = (node as any).emit as { url: string; event_type: string; mode?: "always" | "success" | "failure" } | undefined;
      const mode = emit?.mode ?? "always";
      const shouldEmit =
        !!emit &&
        (mode === "always" || (mode === "success" && finalStatus === "success") || (mode === "failure" && finalStatus === "failed"));

      if (shouldEmit) {
        const emitVars: Record<string, string> = {
          ...baseVars,
          ...((node as any).vars ?? {}),
          ...((node as any).env ?? {}),
        };

        const emitUrl = substituteTemplatesDeep(emit!.url, emitVars);

        const payload = {
          event_type: emit!.event_type,
          workflow_id: def.workflow_id,
          execution_id,
          node_id: node.id,
          status: finalStatus,
          threadId: def.threadId,
          at: nowIso(),
        };

        const emitPlan: ExecutionPlan = {
          kind: "ExecutionPlan",
          execution_id,
          threadId: def.threadId,
          dry_run: def.dry_run,
          goal: def.goal,
          agent_versions: def.agent_versions,
          assumptions: def.assumptions,
          required_secrets: def.required_secrets,
          steps: [
            {
              step_id: `${node.id}:emit`,
              action: "webhook.emit",
              adapter: "WebhookAdapter",
              method: "POST",
              read_only: false,
              url: emitUrl,
              payload,
              expects: { http_status: [200, 201, 202, 204] },
            } as any,
          ],
        };

        try {
          const emitReceipt = await executePlan(emitPlan);
          await persistRun(emitReceipt);
        } catch {
          // Emitters must never break the originating workflow.
        }
      }
    }

    if (finalStatus === "failed") {
      // Routing on failure (if any), else stop.
      const next = getNextNodeId(def, node, "failed", idx);
      if (!next) {
        receipt.status = "failed";
        receipt.finished_at = nowIso();
        receipt.receipt_hash = computeReceiptHash(receipt);
        break;
      }
      currentNodeId = next;
      continue;
    }

    // Success routing.
    currentNodeId = getNextNodeId(def, node, "success", idx);
  }

  if (receipt.status === "running") {
    receipt.status = "success";
    receipt.finished_at = nowIso();
    receipt.receipt_hash = computeReceiptHash(receipt);
  }

  // Write a stable local artifact for debugging (independent of Notion webhook).
  {
    const base = process.env.SINTRAPRIME_RUNS_DIR || path.resolve(process.cwd(), "runs");
    const outDir = path.join(base, "workflow", safeFileStem(def.workflow_id));
    ensureDir(outDir);
    const ts = safeFileStem(new Date().toISOString());
    const outPath = path.join(outDir, `${ts}.json`);
    fs.writeFileSync(outPath, JSON.stringify(receipt, null, 2), "utf8");
    receipt.artifacts = { ...(receipt.artifacts ?? {}), workflow_receipt_path: outPath };
  }

  await persistRun(receipt as any);
  return receipt;
}

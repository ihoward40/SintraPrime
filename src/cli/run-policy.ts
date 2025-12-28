import fs from "node:fs";
import path from "node:path";

import { ExecutionPlanSchema } from "../schemas/ExecutionPlan.schema.js";
import { simulatePolicy } from "../policy/simulatePolicy.js";
import { extractScoreFeatures } from "../policy/extractScoreFeatures.js";
import { scorePolicy } from "../policy/scorePolicy.js";
import { findAgentsProvidingCapability, loadAgentRegistry } from "../agents/agentRegistry.js";
import { isRunGovernorEnabled, runGovernor } from "../governor/runGovernor.js";
import {
  computeConfidenceFingerprint,
  normalizeAutonomyMode,
  normalizeCapabilitySet,
  normalizePolicyVersion,
  normalizeCommand,
  readLatestBaseline,
  writeBaselineRecord,
  writeConfidenceAck,
  writeConfidenceCheck,
} from "../policy/confidenceBaselineStore.js";
import { compareConfidence } from "../policy/compareConfidence.js";
import type { ConfidenceScoreWithRegressionOutput } from "../policy/typesConfidenceRegression.js";
import { explainPolicyCode } from "./run-policy-explain.js";
import { speak } from "../speech/speak.js";
import { getAlertPolicy } from "../speech/alertPolicies.js";
import { evaluatePolicy } from "../policy/evaluatePolicy.js";
import { detectConfidenceRegression } from "../policy/detectConfidenceRegression.js";
import { renderConfidenceCurve } from "../operator/viz/renderConfidenceCurve.js";
import { suspendFingerprint } from "../requalification/suspendFingerprint.js";
import { isRequalificationEnabled } from "../requalification/requalification.js";
import { updateProbationCounter } from "../requalification/updateProbationCounter.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getArgCommand() {
  const raw = process.argv.slice(2).join(" ").trim();
  if (!raw) {
    throw new Error("Missing command argument");
  }
  return raw;
}

type TemplateRegistryEntry = {
  description?: string;
  plan: unknown;
};

type TemplateRegistry = {
  templates: Record<string, TemplateRegistryEntry>;
};

function loadTemplateRegistry(): TemplateRegistry {
  const registryPath = path.join(process.cwd(), "templates", "registry.json");
  if (!fs.existsSync(registryPath)) {
    throw new Error("Missing templates/registry.json");
  }
  const raw = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  if (!isRecord(raw) || !isRecord(raw.templates)) {
    throw new Error("templates/registry.json must be an object with a 'templates' object");
  }

  const templates: Record<string, TemplateRegistryEntry> = {};
  for (const [name, entry] of Object.entries(raw.templates)) {
    if (!name || typeof name !== "string") continue;
    if (!isRecord(entry)) {
      throw new Error(`templates/registry.json template '${name}' must be an object`);
    }
    if (!("plan" in entry)) {
      throw new Error(`templates/registry.json template '${name}' is missing 'plan'`);
    }
    templates[name] = {
      description: typeof (entry as any).description === "string" ? String((entry as any).description) : undefined,
      plan: (entry as any).plan,
    };
  }

  return { templates };
}

function substituteTemplateVars(value: unknown, vars: Record<string, string>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m, key) => {
      if (!(key in vars)) {
        throw new Error(`Missing template variable: ${key}`);
      }
      return vars[key]!;
    });
  }
  if (Array.isArray(value)) return value.map((v) => substituteTemplateVars(v, vars));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = substituteTemplateVars(v, vars);
    }
    return out;
  }
  return value;
}

function sanitizeExecutionIdPart(part: string) {
  return part.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
}

function deriveTemplateExecutionId(templateName: string, args: Record<string, unknown>) {
  const pageId = typeof args.page_id === "string" ? args.page_id.trim() : "";
  const suffix = pageId ? sanitizeExecutionIdPart(pageId) : "001";
  return `tier14-policy-sim-${sanitizeExecutionIdPart(templateName)}_${suffix}`;
}

function parsePolicySimulateCommand(command: string): {
  kind: "PolicySimulate";
  inner_command: string;
  at?: Date;
  autonomy_mode?: string;
  approval?: boolean;
} | null {
  const trimmed = String(command ?? "").trim();
  if (/^\/policy\s+simulate-variants\b/i.test(trimmed)) return null;
  if (!/^\/policy\s+(?:simulate|sim)\b/i.test(trimmed)) return null;

  const tokens = trimmed.split(/\s+/).slice(2);
  const cmdTokens: string[] = [];

  let at: Date | undefined;
  let autonomy_mode: string | undefined;
  let approval: boolean | undefined;

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;

    if (t === "--at") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /policy sim <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>]");
      const d = new Date(v);
      if (!Number.isFinite(d.getTime())) throw new Error("--at must be a valid ISO timestamp");
      at = d;
      i += 1;
      continue;
    }

    if (t === "--autonomy") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /policy sim <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>]");
      autonomy_mode = v;
      i += 1;
      continue;
    }

    if (t === "--approval") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /policy sim <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>]");
      if (v !== "true" && v !== "false") throw new Error("--approval must be true or false");
      approval = v === "true";
      i += 1;
      continue;
    }

    cmdTokens.push(t);
  }

  if (!cmdTokens.length) {
    throw new Error("Usage: /policy sim <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>]");
  }

  return {
    kind: "PolicySimulate",
    inner_command: cmdTokens.join(" ").trim(),
    at,
    autonomy_mode,
    approval,
  };
}

function parsePolicySimulateVariantsCommand(command: string): {
  kind: "PolicySimulateVariants";
  fingerprint: string;
  confidences: number[];
} | null {
  const trimmed = String(command ?? "").trim();
  if (!/^\/policy\s+simulate-variants\b/i.test(trimmed)) return null;

  const tokens = trimmed.split(/\s+/).slice(2);
  const fpTokens: string[] = [];
  let confRaw = "";

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;
    if (t === "--confidence") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /policy simulate-variants <fingerprint> --confidence <0.1,0.9,...>");
      confRaw = String(v);
      i += 1;
      continue;
    }
    fpTokens.push(t);
  }

  const fingerprint = fpTokens.join(" ").trim();
  if (!fingerprint) throw new Error("Usage: /policy simulate-variants <fingerprint> --confidence <0.1,0.9,...>");

  const confidences = String(confRaw)
    .split(",")
    .map((c) => Number(String(c).trim()))
    .filter((n) => Number.isFinite(n));

  return {
    kind: "PolicySimulateVariants",
    fingerprint,
    confidences,
  };
}

function parsePolicyExplainCommand(command: string): {
  kind: "PolicyExplain";
} | null {
  const trimmed = String(command ?? "").trim();
  if (!/^\/policy\s+explain\b/i.test(trimmed)) return null;
  return { kind: "PolicyExplain" };
}

function parsePolicyAlertSimCommand(command: string): {
  kind: "PolicyAlertSim";
  base: "billing_due" | "service_cutoff";
} | null {
  const trimmed = String(command ?? "").trim();
  if (!/^\/policy\s+alert-sim\b/i.test(trimmed)) return null;
  const tokens = trimmed.split(/\s+/).slice(2);
  const base = String(tokens[0] ?? "").trim();
  if (base !== "billing_due" && base !== "service_cutoff") {
    throw new Error("Usage: /policy alert-sim <billing_due|service_cutoff>");
  }
  return { kind: "PolicyAlertSim", base };
}

function parsePolicyScoreCommand(command: string): {
  kind: "PolicyScore";
  inner_command: string;
  at?: Date;
  autonomy_mode?: string;
  approval?: boolean;
  compare?: boolean;
  ack_regression?: boolean;
} | null {
  const trimmed = String(command ?? "").trim();
  if (!/^\/policy\s+score\b/i.test(trimmed)) return null;

  const tokens = trimmed.split(/\s+/).slice(2);
  const cmdTokens: string[] = [];

  let at: Date | undefined;
  let autonomy_mode: string | undefined;
  let approval: boolean | undefined;
  let compare: boolean | undefined;
  let ack_regression: boolean | undefined;

  const readFlag = (t: string) => {
    const m = t.match(/^(--[a-zA-Z0-9_-]+)=(.+)$/);
    if (!m) return null;
    return { flag: m[1]!, value: m[2]! };
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;

    const eq = readFlag(t);
    if (eq) {
      if (eq.flag === "--at") {
        const d = new Date(eq.value);
        if (!Number.isFinite(d.getTime())) throw new Error("--at must be a valid ISO timestamp");
        at = d;
        continue;
      }
      if (eq.flag === "--autonomy") {
        autonomy_mode = eq.value;
        continue;
      }
      if (eq.flag === "--approval") {
        if (eq.value !== "true" && eq.value !== "false") throw new Error("--approval must be true or false");
        approval = eq.value === "true";
        continue;
      }
      if (eq.flag === "--compare") {
        if (eq.value !== "true" && eq.value !== "false") throw new Error("--compare must be true or false");
        compare = eq.value === "true";
        continue;
      }
      if (eq.flag === "--ack-regression") {
        if (eq.value !== "true" && eq.value !== "false") throw new Error("--ack-regression must be true or false");
        ack_regression = eq.value === "true";
        continue;
      }
    }

    if (t === "--at") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /policy score <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>]");
      const d = new Date(v);
      if (!Number.isFinite(d.getTime())) throw new Error("--at must be a valid ISO timestamp");
      at = d;
      i += 1;
      continue;
    }

    if (t === "--autonomy") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /policy score <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>]");
      autonomy_mode = v;
      i += 1;
      continue;
    }

    if (t === "--approval") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /policy score <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>]");
      if (v !== "true" && v !== "false") throw new Error("--approval must be true or false");
      approval = v === "true";
      i += 1;
      continue;
    }

    if (t === "--compare") {
      compare = true;
      continue;
    }

    if (t === "--ack-regression") {
      ack_regression = true;
      continue;
    }

    cmdTokens.push(t);
  }

  if (!cmdTokens.length) {
    throw new Error("Usage: /policy score <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>]");
  }

  return {
    kind: "PolicyScore",
    inner_command: cmdTokens.join(" ").trim(),
    at,
    autonomy_mode,
    approval,
    compare,
    ack_regression,
  };
}

function parsePolicyBaselineCommand(command: string): {
  kind: "PolicyBaseline";
  inner_command: string;
  at?: Date;
  autonomy_mode?: string;
  approval?: boolean;
  override?: boolean;
} | null {
  const trimmed = String(command ?? "").trim();
  if (!/^\/policy\s+baseline\b/i.test(trimmed)) return null;

  const tokens = trimmed.split(/\s+/).slice(2);
  const cmdTokens: string[] = [];

  let at: Date | undefined;
  let autonomy_mode: string | undefined;
  let approval: boolean | undefined;
  let override: boolean | undefined;

  const readFlag = (t: string) => {
    const m = t.match(/^(--[a-zA-Z0-9_-]+)=(.+)$/);
    if (!m) return null;
    return { flag: m[1]!, value: m[2]! };
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;

    const eq = readFlag(t);
    if (eq) {
      if (eq.flag === "--at") {
        const d = new Date(eq.value);
        if (!Number.isFinite(d.getTime())) throw new Error("--at must be a valid ISO timestamp");
        at = d;
        continue;
      }
      if (eq.flag === "--autonomy") {
        autonomy_mode = eq.value;
        continue;
      }
      if (eq.flag === "--approval") {
        if (eq.value !== "true" && eq.value !== "false") throw new Error("--approval must be true or false");
        approval = eq.value === "true";
        continue;
      }
      if (eq.flag === "--override") {
        if (eq.value !== "true" && eq.value !== "false") throw new Error("--override must be true or false");
        override = eq.value === "true";
        continue;
      }
    }

    if (t === "--at") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /policy baseline <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>] [--override]");
      const d = new Date(v);
      if (!Number.isFinite(d.getTime())) throw new Error("--at must be a valid ISO timestamp");
      at = d;
      i += 1;
      continue;
    }

    if (t === "--autonomy") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /policy baseline <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>] [--override]");
      autonomy_mode = v;
      i += 1;
      continue;
    }

    if (t === "--approval") {
      const v = tokens[i + 1];
      if (!v) throw new Error("Usage: /policy baseline <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>] [--override]");
      if (v !== "true" && v !== "false") throw new Error("--approval must be true or false");
      approval = v === "true";
      i += 1;
      continue;
    }

    if (t === "--override") {
      override = true;
      continue;
    }

    cmdTokens.push(t);
  }

  if (!cmdTokens.length) {
    throw new Error("Usage: /policy baseline <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>] [--override]");
  }

  return {
    kind: "PolicyBaseline",
    inner_command: cmdTokens.join(" ").trim(),
    at,
    autonomy_mode,
    approval,
    override,
  };
}

function parseTemplateRunCommand(command: string): { name: string; argsText: string } | null {
  const trimmed = String(command ?? "").trim();
  const match = trimmed.match(/^\/template\s+run\s+([^\s]+)(?:\s+([\s\S]+))?$/i);
  if (!match) return null;
  const name = String(match[1] ?? "").trim();
  const argsText = typeof match[2] === "string" ? match[2].trim() : "{}";
  if (!name) throw new Error("Usage: /template run <name> <json_args>");
  if (!argsText) throw new Error("Usage: /template run <name> <json_args>");
  return { name, argsText };
}

function buildPlanFromTemplateRun(innerCommand: string, threadId: string) {
  const parsed = parseTemplateRunCommand(innerCommand);
  if (!parsed) {
    throw new Error("/policy simulate currently supports only: /template run <name> <json_args>");
  }

  const { name, argsText } = parsed;
  const registry = loadTemplateRegistry();
  const entry = registry.templates[name];
  if (!entry) throw new Error(`Unknown template '${name}'`);

  let args: Record<string, unknown>;
  try {
    const obj = JSON.parse(argsText);
    if (!isRecord(obj)) throw new Error("template args must be a JSON object");
    args = obj;
  } catch (e: any) {
    throw new Error(`Invalid template args JSON: ${e?.message ? String(e.message) : String(e)}`);
  }

  const execution_id =
    typeof args.execution_id === "string" && args.execution_id.trim()
      ? args.execution_id.trim()
      : deriveTemplateExecutionId(name, args);

  const vars: Record<string, string> = {
    execution_id,
    threadId,
  };

  for (const [k, v] of Object.entries(args)) {
    if (v === null || v === undefined) continue;
    vars[k] = typeof v === "string" ? v : JSON.stringify(v);
  }

  const substituted = substituteTemplateVars(entry.plan, vars);
  return ExecutionPlanSchema.parse(substituted);
}

function buildPlanFromNotionDb(innerCommand: string, threadId: string, baseUrl: string) {
  const m = innerCommand.match(/^\/notion\s+(?:db|database)\s+(\S+)\s*$/i);
  if (!m) return null;
  const dbId = String(m[1] ?? "").trim();
  if (!dbId) throw new Error("Usage: /notion db <db_id>");
  const plan = {
    kind: "ExecutionPlan",
    execution_id: "exec_mock_notion_db_001",
    threadId,
    dry_run: false,
    goal: `Read Notion database ${dbId}`,
    required_capabilities: ["notion.read.database"],
    agent_versions: { validator: "1.2.0", planner: "1.1.3" },
    assumptions: ["Generated by policy score planner"],
    required_secrets: [],
    steps: [
      {
        step_id: "read-database",
        action: "notion.read.database",
        adapter: "NotionAdapter",
        method: "GET",
        read_only: true,
        url: `${baseUrl}/notion/database/${encodeURIComponent(dbId)}`,
        headers: { "Cache-Control": "no-store" },
        expects: { http_status: [200], json_paths_present: ["properties", "id"] },
        idempotency_key: null,
      },
    ],
  };
  return ExecutionPlanSchema.parse(plan);
}

function buildPlanFromNotionSet(innerCommand: string, threadId: string, baseUrl: string) {
  const m = innerCommand.match(/^\/notion\s+set\s+(\S+)\s+([^=\s]+)=(.+)$/i);
  if (!m) return null;
  const pageId = String(m[1] ?? "").trim();
  const property = String(m[2] ?? "").trim();
  const value = String(m[3] ?? "").trim();
  if (!pageId || !property) throw new Error("Usage: /notion set <page_id> <property>=<value>");

  const plan = {
    kind: "ExecutionPlan",
    execution_id: "exec_mock_notion_write_001",
    threadId,
    dry_run: false,
    goal: `Set Notion page property ${property} on ${pageId}`,
    required_capabilities: ["notion.write.page_property"],
    agent_versions: { validator: "1.2.0", planner: "1.1.3" },
    assumptions: ["Generated by policy score planner"],
    required_secrets: [],
    steps: [
      {
        step_id: "write-page-property",
        action: "notion.write.page_property",
        adapter: "NotionAdapter",
        method: "PATCH",
        read_only: false,
        url: `${baseUrl}/notion/page/${encodeURIComponent(pageId)}`,
        headers: { "Cache-Control": "no-store" },
        payload: { properties: { [property]: value } },
        expects: { http_status: [200], json_paths_present: ["updated"] },
        idempotency_key: null,
      },
    ],
  };
  return ExecutionPlanSchema.parse(plan);
}

function buildPlanForPolicyCommands(innerCommand: string, threadId: string, baseUrl: string) {
  // Keep Tier-14 template support.
  const template = (() => {
    try {
      return buildPlanFromTemplateRun(innerCommand, threadId);
    } catch {
      return null;
    }
  })();
  if (template) return template;

  const db = buildPlanFromNotionDb(innerCommand, threadId, baseUrl);
  if (db) return db;

  const set = buildPlanFromNotionSet(innerCommand, threadId, baseUrl);
  if (set) return set;

  throw new Error("/policy score supports: /notion db <id> | /notion set <page> <prop>=<value> | /template run ...");
}

function mapSimulationDecision(simDecision: string): string {
  if (simDecision === "ALLOWED") return "ELIGIBLE";
  return simDecision;
}

function resolveCapabilityProviders(required: string[]) {
  const unresolved: string[] = [];
  if (!required.length) return { capabilities_resolved: true, unresolved };
  const registry = loadAgentRegistry();
  for (const cap of required) {
    const matches = findAgentsProvidingCapability(registry, cap);
    if (!matches.length) unresolved.push(cap);
  }
  return { capabilities_resolved: unresolved.length === 0, unresolved };
}

type PolicySimulationResult = {
  kind: "PolicySimulation";
  input_command: string;
  decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL" | "THROTTLE";
  denial_code: string | null;
  approval_required: boolean;
  governor: {
    decision: "ALLOW" | "DENY" | "DELAY";
    reason: "TOKEN_EXHAUSTED" | "CIRCUIT_OPEN" | "MAX_CONCURRENT" | null;
    retry_after: string | null;
  };
  would_execute_steps: number;
  notes: string[];
};

function countPlannedSteps(plan: any): number {
  if (Array.isArray(plan?.phases)) {
    return plan.phases.reduce((acc: number, p: any) => acc + (Array.isArray(p?.steps) ? p.steps.length : 0), 0);
  }
  return Array.isArray(plan?.steps) ? plan.steps.length : 0;
}

function inferApprovalRequiredFromPlan(plan: any): boolean {
  const steps = Array.isArray(plan?.phases)
    ? plan.phases.flatMap((p: any) => (Array.isArray(p?.steps) ? p.steps : []))
    : Array.isArray(plan?.steps)
      ? plan.steps
      : [];
  return steps.some((s: any) => s?.approval_scoped === true && s?.read_only === false);
}

function envEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.SPEECH_ENABLED;
  if (v == null || v === "") return true;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

function shouldSpeakPolicySim(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.SPEECH_POLICY_SIM_SPEAK;
  if (v == null || v === "") return true;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

(async () => {
  try {
    const raw = getArgCommand();
    const parsedExplain = parsePolicyExplainCommand(raw);
    const parsedAlertSim = parsePolicyAlertSimCommand(raw);
    const parsedVariants = parsePolicySimulateVariantsCommand(raw);
    const parsedSim = parsePolicySimulateCommand(raw);
    const parsedScore = parsePolicyScoreCommand(raw);
    const parsedBaseline = parsePolicyBaselineCommand(raw);
    const parsed = parsedExplain ?? parsedAlertSim ?? parsedVariants ?? parsedSim ?? parsedScore ?? parsedBaseline;
    if (!parsed) {
      throw new Error(
        "Usage: /policy explain <CODE> | /policy simulate <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>] | /policy score <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>] [--compare] [--ack-regression] | /policy baseline <command> [--at <timestamp>] [--autonomy <mode>] [--approval <true|false>] [--override]"
      );
    }

    if ((parsed as any).kind === "PolicyExplain") {
      const out = explainPolicyCode(raw);
      console.log(JSON.stringify(out, null, 2));
      process.exitCode = 0;
      return;
    }

    const threadId = (process.env.THREAD_ID || "local_test_001").trim();
    const at = (parsed as any).at ?? new Date(process.env.SMOKE_FIXED_NOW_ISO || new Date().toISOString());
    const autonomyMode = (parsed as any).autonomy_mode ?? (process.env.AUTONOMY_MODE || "OFF");
    const approval = (parsed as any).approval ?? false;

    if ((parsed as any).kind === "PolicyAlertSim") {
      const base = (parsed as any).base as "billing_due" | "service_cutoff";
      const kind = `${base}_sim`;
      const policy = getAlertPolicy(kind);
      const autoplayRequested = policy.autoplay === true;

      // Intentionally rely on sink-side gating (no simulation mode here).
      try {
        if (envEnabled(process.env) && shouldSpeakPolicySim(process.env)) {
          speak({
            text: base === "billing_due" ? "Billing due (simulation)." : "Service cutoff risk (simulation).",
            category: "policy-sim",
            threadId,
            meta: {
              autoplay_requested: autoplayRequested,
              source: "alert",
              alert_kind: kind,
              alert_priority: policy.priority,
            },
          });
        }
      } catch {
        // fail-open
      }

      console.log(JSON.stringify({ kind: "PolicyAlertSim", base, alert_kind: kind, autoplay_requested: autoplayRequested }, null, 2));
      process.exitCode = 0;
      return;
    }

    const policyVersion = normalizePolicyVersion(process.env.POLICY_VERSION);

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      AUTONOMY_MODE: autonomyMode,
    };

    if ((parsed as any).kind === "PolicySimulateVariants") {
      const fingerprint = String((parsed as any).fingerprint ?? "").trim();
      const confidences = Array.isArray((parsed as any).confidences) ? (parsed as any).confidences : [];

      if (!confidences.length) {
        console.log(
          JSON.stringify(
            {
              kind: "PolicySimulationVariants",
              error: "No confidence values provided",
            },
            null,
            2
          )
        );
        process.exitCode = 2;
        return;
      }

      const variants = confidences.map((confidence: number, idx: number) => {
        const r = evaluatePolicy({
          fingerprint,
          confidence,
          simulation: true,
          at,
          env,
        });

        // Tier-22.1: probation success counters accrue on every evaluation, including simulation.
        // This is governance (not policy logic) and is deterministic via SMOKE_FIXED_NOW_ISO.
        if (isRequalificationEnabled()) {
          const nowIso = new Date(at.getTime() + idx).toISOString();
          updateProbationCounter({
            fingerprint,
            runResult: {
              status: "success",
              now_iso: nowIso,
              confidence,
              governor_decision: r.decision === "ALLOW" ? "ALLOW" : "DENY",
              policy_denied: r.decision !== "ALLOW",
              throttled: false,
              rollback_recorded: false,
              approval_required: false,
              autonomy_mode: String(process.env.AUTONOMY_MODE || "OFF"),
              autonomy_mode_effective: String(process.env.AUTONOMY_MODE || "OFF"),
              steps: [],
            },
          });
        }

        return {
          confidence,
          decision: r.decision,
          code: r.code ?? null,
          explain: r.explain,
        };
      });

      const regression = detectConfidenceRegression(
        variants.map((v: any) => ({ confidence: v.confidence, decision: v.decision, code: v.code }))
      );

      const confidence_curve_ascii = renderConfidenceCurve(
        variants.map((v: any) => ({ confidence: v.confidence, decision: v.decision }))
      );

      const firstDecision = variants.length ? String(variants[0]?.decision ?? "") : "";
      const lastDecision = variants.length ? String(variants[variants.length - 1]?.decision ?? "") : "";
      const monotonicBrokenAt = regression ? (() => {
        const idx = variants.findIndex((v: any) => Number(v.confidence) === Number(regression.at_confidence));
        return idx >= 0 ? `t${idx}` : null;
      })() : null;

      // Tier-22: regressions immediately suspend the fingerprint (governance state).
      // This must happen before printing output, and must not depend on speech.
      if (regression) {
        await suspendFingerprint(fingerprint, "CONFIDENCE_REGRESSION", {
          at_confidence: regression.at_confidence,
          from: regression.from,
          to: regression.to,
        });
      }

      // One spoken alert only if a regression is detected.
      try {
        const speechEnabled = process.env.SPEECH_ENABLED === "1";
        const cats = String(process.env.SPEECH_CATEGORIES ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const catAllowed = cats.length ? cats.includes("policy") : false;

        const kind = "policy_regression";
        const alertPolicy = getAlertPolicy(kind);
        const autoplayRequested = alertPolicy.autoplay === true;

        if (speechEnabled && catAllowed && regression) {
            speak({
              text: `Policy regression detected at confidence ${regression.at_confidence}.`,
              category: "policy",
              threadId,
              meta: {
                confidence: regression.at_confidence,
                autoplay_requested: autoplayRequested,
                source: "alert",
                alert_kind: kind,
                alert_priority: alertPolicy.priority,
              },
            });
        }
      } catch {
        // fail-open
      }

      console.log(
        JSON.stringify(
          {
            kind: "PolicySimulationVariants",
            fingerprint,
            variants,
            regression,
            explain: {
              first_decision: firstDecision || null,
              last_decision: lastDecision || null,
              monotonic_broken_at: monotonicBrokenAt,
            },
            confidence_curve_ascii,
          },
          null,
          2
        )
      );
      process.exitCode = 0;
      return;
    }

    const baseUrl = String(process.env.NOTION_API_BASE || "http://localhost:8787").trim() || "http://localhost:8787";
    const inner = (parsed as any).inner_command;
    const plan = buildPlanForPolicyCommands(inner, threadId, baseUrl);

    const sim = simulatePolicy({
      plan,
      command: inner,
      env,
      at,
      autonomy_mode: autonomyMode,
      approval,
    });

    if ((parsed as any).kind === "PolicySimulate") {
      const denial_code =
        (sim.policy as any)?.denied?.code && typeof (sim.policy as any).denied.code === "string"
          ? String((sim.policy as any).denied.code)
          : (sim.policy as any)?.approval?.code && typeof (sim.policy as any).approval.code === "string"
            ? String((sim.policy as any).approval.code)
            : null;

      const approval_required =
        (sim.policy as any)?.requireApproval === true || inferApprovalRequiredFromPlan(plan);

      const governor = (() => {
        if (!isRunGovernorEnabled()) {
          return { decision: "ALLOW" as const, reason: null, retry_after: null };
        }

        const g = runGovernor({
          command: inner,
          domain_id: null,
          autonomy_mode: autonomyMode,
          now_iso: at.toISOString(),
          simulate: true,
        });
        return { decision: g.decision, reason: g.reason, retry_after: g.retry_after };
      })();

      const decision: PolicySimulationResult["decision"] =
        governor.decision !== "ALLOW"
          ? "THROTTLE"
          : sim.decision === "APPROVAL_REQUIRED"
            ? "REQUIRE_APPROVAL"
            : sim.decision === "DENIED"
              ? "DENY"
              : "ALLOW";

      const notes: string[] = [];
      if (decision === "REQUIRE_APPROVAL") notes.push("This command requires approval");
      if (decision === "THROTTLE") notes.push("Governor throttled this fingerprint");

      const result: PolicySimulationResult = {
        kind: "PolicySimulation",
        input_command: inner,
        decision,
        denial_code,
        approval_required,
        governor,
        would_execute_steps: countPlannedSteps(plan),
        notes,
      };

      // Optional spoken summary (fail-open). Does not affect JSON-only stdout.
      try {
        if (envEnabled(process.env) && shouldSpeakPolicySim(process.env)) {
          const autoplayRequested = false;

          const explain = denial_code ? explainPolicyCode(`/policy explain ${denial_code}`) : null;
          const spoken =
            decision === "ALLOW"
              ? "Policy simulation allowed."
              : decision === "REQUIRE_APPROVAL"
                ? "Policy simulation requires approval."
                : decision === "THROTTLE"
                  ? "Policy simulation throttled by governor."
                  : explain
                    ? `Policy simulation denied: ${explain.title}.`
                    : denial_code
                      ? `Policy simulation denied: ${denial_code}.`
                      : "Policy simulation denied.";

          speak({
            text: spoken,
            category: "policy-sim",
            threadId,
            meta: {
              autoplay_requested: autoplayRequested,
              source: "operator",
            },
            simulation: true,
          });
        }
      } catch {
        // fail-open
      }

      console.log(JSON.stringify(result, null, 2));
      process.exitCode = 0;
      return;
    }

    const requiredCaps = Array.isArray((plan as any).required_capabilities)
      ? (plan as any).required_capabilities.filter((c: any) => typeof c === "string")
      : [];
    const capResolution = resolveCapabilityProviders(requiredCaps);

    const features = extractScoreFeatures({
      plan,
      policy_simulation: sim,
      capabilities_resolved: capResolution.capabilities_resolved,
      unresolved_capabilities: capResolution.unresolved,
      policy_env: env,
    });

    const evaluated_at = at.toISOString();
    const scored = scorePolicy({
      target: inner,
      evaluated_at,
      policy_simulation: { would_run: sim.would_run, decision: mapSimulationDecision(sim.decision), reasons: (sim as any).reasons },
      features,
      obs: undefined,
    });

    const isBaseline = (parsed as any).kind === "PolicyBaseline";
    const compare = (parsed as any).kind === "PolicyScore" && Boolean((parsed as any).compare);
    const ackRegression = (parsed as any).kind === "PolicyScore" && Boolean((parsed as any).ack_regression);

    const normalizedCommand = normalizeCommand(inner);
    const capSet = normalizeCapabilitySet(requiredCaps);
    const fingerprint = computeConfidenceFingerprint({
      command: normalizedCommand,
      policy_version: policyVersion,
      autonomy_mode: normalizeAutonomyMode(autonomyMode),
      capability_set: capSet,
    });

    if (isBaseline) {
      const record = {
        fingerprint,
        command: normalizedCommand,
        policy_version: policyVersion,
        autonomy_mode: normalizeAutonomyMode(autonomyMode),
        capability_set: capSet,
        score: scored.confidence.score,
        band: scored.confidence.band,
        action: scored.confidence.action,
        captured_at: evaluated_at,
      };

      const { wrote } = writeBaselineRecord({ record, override: Boolean((parsed as any).override) });
      console.log(
        JSON.stringify(
          {
            kind: "ConfidenceBaseline",
            wrote,
            baseline: record,
          },
          null,
          2
        )
      );
      process.exitCode = wrote ? 0 : 2;
      return;
    }

    if (!compare) {
      console.log(JSON.stringify(scored, null, 2));
      process.exitCode = 0;
      return;
    }

    const previous = readLatestBaseline(fingerprint);
    const regression = compareConfidence({
      previous: previous
        ? { score: previous.score, band: previous.band, action: previous.action }
        : null,
      current: { score: scored.confidence.score, band: scored.confidence.band, action: scored.confidence.action },
      tolerance: 5,
    });

    let acknowledged = false;
    if (regression.regressed && ackRegression) {
      acknowledged = true;
      writeConfidenceAck({
        fingerprint,
        acknowledged_at: evaluated_at,
        payload: {
          kind: "ConfidenceRegressionAck",
          fingerprint,
          command: normalizedCommand,
          policy_version: policyVersion,
          autonomy_mode: normalizeAutonomyMode(autonomyMode),
          acknowledged_at: evaluated_at,
          previous: previous ? { score: previous.score, band: previous.band, action: previous.action } : null,
          current: { score: scored.confidence.score, band: scored.confidence.band, action: scored.confidence.action },
        },
      });
    }

    const executionId = typeof (plan as any).execution_id === "string" ? (plan as any).execution_id : "exec_unknown";
    writeConfidenceCheck({
      execution_id: executionId,
      payload: {
        kind: "ConfidenceRegressionCheck",
        fingerprint,
        baseline: previous,
        current: { score: scored.confidence.score, band: scored.confidence.band, action: scored.confidence.action },
        regression,
        evaluated_at,
      },
    });

    const out: ConfidenceScoreWithRegressionOutput = {
      kind: "ConfidenceScoreWithRegression",
      score: scored,
      regression: {
        ...regression,
        acknowledged,
      },
    };

    console.log(JSON.stringify(out, null, 2));

    // Enforcement (minimal, deterministic): fail CI / block strict autonomy on unacknowledged hard regression.
    if (regression.regressed && regression.requires_ack && !acknowledged) {
      if (String(process.env.CI ?? "") === "1" || String(process.env.CI ?? "").toLowerCase() === "true") {
        process.exitCode = 10;
      } else if (normalizeAutonomyMode(autonomyMode) === "READ_ONLY_AUTONOMY") {
        process.exitCode = 11;
      } else if (normalizeAutonomyMode(autonomyMode) === "APPROVAL_GATED_AUTONOMY") {
        process.exitCode = 12;
      } else {
        process.exitCode = 0;
      }
    } else {
      process.exitCode = 0;
    }
  } catch (err: any) {
    process.exitCode = 1;
    console.error(err?.message ? String(err.message) : String(err));
  }
})();

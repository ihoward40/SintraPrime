import { sendMessage } from "../agents/sendMessage.js";
import type { ArchSelection, ArchRefusal } from "../governance/arch.js";
import { ArchStrictError, parseArchFlag, parseStrictArchFlag, selectArchitecture } from "../governance/arch.js";
import type { ModeSelection } from "../governance/mode.js";
import { ModeStrictError, parseModeFlag, parseStrictModeFlag, selectModes } from "../governance/mode.js";
import { parseStrictAnyFlag } from "../governance/strict-any.js";
import { assembleSystemPrompt } from "../prompt/assembleSystemPrompt.js";
import { writeRefusalPack } from "../governance/refusal-pack.js";
import { parseStrictTurboSparseFlag, parseTurboSparseEnabled } from "../turbosparse/flags.js";
import { buildTurboSparseSystemPrompt } from "../turbosparse/prompt.js";
import { selectExperts } from "../turbosparse/select.js";
import { cacheKey, readCache, writeCache } from "../turbosparse/cache.js";
import { applyTokenBudget, type BudgetTrim } from "../turbosparse/budget.js";
import { GammaApiError } from "../integrations/gamma/client.js";
import { GammaStrictError } from "../integrations/gamma/refusals.js";
import { runGammaDeck } from "../integrations/gamma/router.js";
import { SlidesStrictError, runSlidesPipeline, type SlidesFormat } from "../slides/pipeline/run-slides.js";
import {
  parseStitchBackendFlag,
  parseStitchImportDirFlag,
  parseStrictStitchFlag,
  parseStitchRenderFlag,
} from "../ui/stitch/flags.js";
import { selectStitchBackend, isStitchAutomationEnabled } from "../ui/stitch/backend.js";
import { ingestStitchExport, stitchInventoryToMarkdown } from "../ui/stitch/ingest.js";
import { StitchStrictError, stitchRefusal } from "../ui/stitch/refusals.js";
import type { StitchBackendId } from "../ui/stitch/schema.js";
import { executePlan } from "../executor/executePlan.js";
import { persistRun } from "../persist/persistRun.js";
import {
  PlannerOutputSchema,
  NeedInputSchema,
  ValidatedCommandSchema,
  ValidatorOutputSchema,
} from "../schemas/ExecutionPlan.schema.js";
import { readApprovalState, writeApprovalState, approvalStatePath } from "../approval/approvalState.js";
import { computePlanHash } from "../utils/planHash.js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { normalizeCommand } from "../dsl/normalizeCommand.js";
import { writeIntakeArtifact } from "../artifacts/writeIntakeArtifact.js";
import { writeNotionReadArtifact } from "../artifacts/writeNotionReadArtifact.js";
import { writeNotionWriteArtifact } from "../artifacts/writeNotionWriteArtifact.js";
import { writeNotionLiveReadArtifact } from "../artifacts/writeNotionLiveReadArtifact.js";
import { loadAgentRegistry, findAgentsProvidingCapability } from "../agents/agentRegistry.js";
import { resolveCapabilities, resolvedCapabilitiesToReceiptMap } from "../agents/resolveCapabilities.js";
import { checkPolicy, checkPolicyWithMeta } from "../policy/checkPolicy.js";
import { checkPlanPolicy } from "../policy/checkPolicy.js";
import { enforceMaxRunsPerDay } from "../autonomy/budget.js";
import { autoSuspendDelegationsForCommand } from "../delegated/autoSuspend.js";
import { validatePhases } from "../phases/validatePhases.js";
import { materializePhaseSteps } from "../phases/materializePhaseSteps.js";
import { extractPhaseArtifacts } from "../phases/extractPhaseArtifacts.js";
import { writeAutonomySummary } from "../artifacts/writeAutonomySummary.js";
import { writePrestateArtifact } from "../artifacts/writePrestateArtifact.js";
import { writeRollbackArtifact } from "../artifacts/writeRollbackArtifact.js";
import { notionLiveGet } from "../adapters/notionLiveRead.js";
import { evaluateGuards } from "../guards/evaluateGuards.js";
import { getIdempotencyRecord } from "../idempotency/idempotencyLedger.js";
import { parseDomainPrefix } from "../domains/parseDomainPrefix.js";
import { getOperatorId, operatorHasRole } from "../domains/domainRoles.js";
import { runGovernor, isRunGovernorEnabled, deriveFingerprint, checkGovernor } from "../governor/runGovernor.js";
import { nowIso as fixedNowIso } from "../utils/clock.js";
import { updateProbationCounter } from "../requalification/updateProbationCounter.js";
import { shouldDecayConfidence } from "../confidence/evaluateConfidenceDecay.js";
import { readConfidence, updateConfidence } from "../confidence/updateConfidence.js";
import { writeConfidenceDecayEvent } from "../artifacts/writeConfidenceDecayEvent.js";
import { computeRankings } from "../operator/computeRankings.js";
import { writeRankingsArtifacts } from "../artifacts/writeRankingsArtifacts.js";
import { recommendPromotions } from "../autonomy/promotionRecommend.js";
import { writePromotionCandidatesArtifact } from "../artifacts/writePromotionCandidatesArtifact.js";
import { emitSpeechBundle } from "../speech/emitSpeechBundle.js";
import { speak, speakText } from "../speech/speak.js";
import { exportAuditCourtPacket } from "../audit/exportAuditCourtPacket.js";
import { exportAuditExecutionBundle } from "../audit/exportAuditExecutionBundle.js";
import { applySecretsToProcessEnv, loadControlConfig, loadSecretsEnv } from "../clean/config.js";
import { runCasesScanCommand } from "./casesScan.js";
import { runCasesDriftCommand } from "./casesDrift.js";
import { runCasesReceivedCommand } from "./casesReceived.js";
import { runLitigationPacketCommand } from "./litigationPacket.js";
import { runClaudeWorkerCommand } from "./claudeWorker.js";
import { runEgressSnapshotCommand } from "./egressSnapshot.js";
import { runDriveApplyTemplate, runDriveAuthTest, runDriveEnsurePath } from "./drive.js";
import { driveReceiptsTail, driveStatus } from "./driveOperator.js";
import {
  appendSilentHaltLedgerLine,
  maybeAppendModeTransitionLedger,
} from "../operator/governance/modeTransitionLedger.js";
import { captureWatchStepScreenshots, runWatchModeTour } from "../watch/watchMode.js";
import { appendRunLedgerLine, writeApplyJson, writePlanSummary } from "../watch/runArtifacts.js";
import { appendHashChainGroup, isRunHashChainEnabled, maybeAppendHashChainArtifact } from "../watch/hashChain.js";
import {
  applyRequalificationCooldownWatcher,
  effectiveAutonomyModeForState,
  isRequalificationEnabled,
  readRequalificationState,
  requalifyScan,
  writeRequalificationEvent,
  writeRequalificationState,
} from "../requalification/requalification.js";



function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stableFingerprint(obj: any) {
  const stable = (value: any): any => {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(stable);
    if (typeof value !== "object") return value;
    const keys = Object.keys(value).sort();
    const out: any = {};
    for (const k of keys) out[k] = stable(value[k]);
    return out;
  };

  const json = JSON.stringify(stable(obj));
  return crypto.createHash("sha256").update(json).digest("hex");
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

function ensureIdempotencyKey(step: any, plan_hash: string, threadId: string) {
  const existing = typeof step?.idempotency_key === "string" ? step.idempotency_key.trim() : "";
  if (existing) return existing;
  const action = typeof step?.action === "string" ? step.action : "";
  const step_id = typeof step?.step_id === "string" ? step.step_id : "";
  if (!action || !step_id || !plan_hash || !threadId) return null;
  const key = deriveIdempotencyKey({ action, plan_hash, step_id, threadId });
  step.idempotency_key = key;
  return key;
}

function collectApprovableSteps(plan: any) {
  const steps = Array.isArray(plan?.phases)
    ? plan.phases.flatMap((p: any) => (Array.isArray(p?.steps) ? p.steps : []))
    : Array.isArray(plan?.steps)
      ? plan.steps
      : [];
  return steps.filter((s: any) => s?.approval_scoped === true && s?.read_only === false);
}

function findStepInPlan(plan: any, stepId: string) {
  if (Array.isArray(plan?.steps)) {
    const s = plan.steps.find((x: any) => x?.step_id === stepId);
    if (s) return s;
  }
  if (Array.isArray(plan?.phases)) {
    for (const p of plan.phases) {
      if (Array.isArray(p?.steps)) {
        const s = p.steps.find((x: any) => x?.step_id === stepId);
        if (s) return s;
      }
    }
  }
  return null;
}

async function fetchLivePrestateForStep(step: any) {
  const p = step?.notion_path_prestate || step?.notion_path;
  if (typeof p !== "string" || !p.trim()) return null;
  const live = await notionLiveGet(p);
  return live.redacted;
}

const obsCounts = new Map<string, number>();

function obsBump(code: string) {
  obsCounts.set(code, (obsCounts.get(code) ?? 0) + 1);
}

function isStrictAgentOutputEnabled() {
  return process.env.STRICT_AGENT_OUTPUT === "1";
}

function obsWarn(code: string, message: string) {
  obsBump(code);
  console.warn(`[${code}] ${message}`);
}

function obsWarnOrThrow(code: string, message: string) {
  obsBump(code);
  const full = `[${code}] ${message}`;
  if (isStrictAgentOutputEnabled()) {
    throw new Error(full);
  }
  console.warn(full);
}

function getArgCommand() {
  const rawArgs = process.argv.slice(2);
  const args = [...rawArgs];

  // When running under certain TS runners (notably `node tsx/dist/cli.mjs` on Windows),
  // argv can include the entry script path as the first "argument".
  // Example: [node, tsx, <entry>, <command...>]
  // Strip the entry path so command parsing and fingerprinting remain stable.
  if (args.length >= 2) {
    const first = String(args[0] ?? "");
    const looksLikeCliEntry =
      /[\\/](src|dist)[\\/]cli[\\/].+\.(ts|js)$/i.test(first) ||
      /run-command\.(ts|js)$/i.test(first);
    if (looksLikeCliEntry) args.shift();
  }

  // Support optional CLI flags that should NOT become part of the command message.
  // Example: tsx src/cli/run-command.ts --arch synergy-7 "/build ..."
  const filtered: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = String(args[i] ?? "");
    if (a === "--arch") {
      i += 1; // skip value
      continue;
    }
    if (a.startsWith("--arch=")) {
      continue;
    }
    if (a === "--strict-arch") {
      // Optionally allow: --strict-arch true
      const next = String(args[i + 1] ?? "").trim().toLowerCase();
      if (next === "true" || next === "false" || next === "1" || next === "0" || next === "yes" || next === "no") {
        i += 1;
      }
      continue;
    }
    if (a.startsWith("--strict-arch=")) {
      continue;
    }

    if (a === "--mode") {
      i += 1; // skip value
      continue;
    }
    if (a.startsWith("--mode=")) {
      continue;
    }
    if (a === "--strict-mode") {
      // Optionally allow: --strict-mode true
      const next = String(args[i + 1] ?? "").trim().toLowerCase();
      if (next === "true" || next === "false" || next === "1" || next === "0" || next === "yes" || next === "no") {
        i += 1;
      }
      continue;
    }
    if (a.startsWith("--strict-mode=")) {
      continue;
    }

    if (a === "--strict-any") {
      // Optionally allow: --strict-any true
      const next = String(args[i + 1] ?? "").trim().toLowerCase();
      if (next === "true" || next === "false" || next === "1" || next === "0" || next === "yes" || next === "no") {
        i += 1;
      }
      continue;
    }
    if (a.startsWith("--strict-any=")) {
      continue;
    }

    if (a === "--strict-stitch") {
      // Optionally allow: --strict-stitch true
      const next = String(args[i + 1] ?? "").trim().toLowerCase();
      if (next === "true" || next === "false" || next === "1" || next === "0" || next === "yes" || next === "no") {
        i += 1;
      }
      continue;
    }
    if (a.startsWith("--strict-stitch=")) {
      continue;
    }

    if (a === "--stitch-import") {
      i += 1; // skip value
      continue;
    }
    if (a.startsWith("--stitch-import=")) {
      continue;
    }

    if (a === "--stitch-backend") {
      i += 1; // skip value
      continue;
    }
    if (a.startsWith("--stitch-backend=")) {
      continue;
    }

    if (a === "--stitch-render") {
      // Optionally allow: --stitch-render true
      const next = String(args[i + 1] ?? "").trim().toLowerCase();
      if (next === "true" || next === "false" || next === "1" || next === "0" || next === "yes" || next === "no") {
        i += 1;
      }
      continue;
    }
    if (a.startsWith("--stitch-render=")) {
      continue;
    }
    if (a === "--no-stitch-render") {
      continue;
    }

    if (a === "--turbosparse") {
      // Optionally allow: --turbosparse true
      const next = String(args[i + 1] ?? "").trim().toLowerCase();
      if (next === "true" || next === "false" || next === "1" || next === "0" || next === "yes" || next === "no") {
        i += 1;
      }
      continue;
    }
    if (a.startsWith("--turbosparse=")) {
      continue;
    }
    if (a === "--no-turbosparse") {
      continue;
    }
    if (a === "--strict-turbosparse") {
      // Optionally allow: --strict-turbosparse true
      const next = String(args[i + 1] ?? "").trim().toLowerCase();
      if (next === "true" || next === "false" || next === "1" || next === "0" || next === "yes" || next === "no") {
        i += 1;
      }
      continue;
    }
    if (a.startsWith("--strict-turbosparse=")) {
      continue;
    }
    filtered.push(a);
  }

  const raw = filtered.join(" ").trim();
  if (!raw) {
    throw new Error(
      "Missing command argument. Example: npm run dev -- \"/build validation-agent {\\\"dry_run\\\":false}\""
    );
  }
  return raw;
}

function parseApproveCommand(command: string): { execution_id: string } | null {
  const trimmed = command.trim();
  const match = trimmed.match(/^\/approve(?:\s+(\S+))?\s*$/i);
  if (!match) return null;

  const execution_id = match[1];
  if (!execution_id) {
    throw new Error("Usage: /approve <execution_id>");
  }
  return { execution_id };
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
      description: typeof entry.description === "string" ? entry.description : undefined,
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

function parseTemplateCommand(command: string):
  | { kind: "TemplateList" }
  | { kind: "TemplateShow"; name: string }
  | { kind: "TemplateRun"; name: string; argsText: string }
  | null {
  const trimmed = command.trim();
  const match = trimmed.match(/^\/template\s+(list|show|run)(?:\s+([\s\S]+))?$/i);
  if (!match) return null;

  const op = String(match[1] ?? "").toLowerCase();
  const rest = typeof match[2] === "string" ? match[2].trim() : "";

  if (op === "list") return { kind: "TemplateList" };
  if (op === "show") {
    if (!rest) throw new Error("Usage: /template show <name>");
    return { kind: "TemplateShow", name: rest };
  }
  if (op === "run") {
    if (!rest) throw new Error("Usage: /template run <name> <json_args>");
    const firstSpace = rest.indexOf(" ");
    const name = firstSpace === -1 ? rest : rest.slice(0, firstSpace);
    const argsText = firstSpace === -1 ? "{}" : rest.slice(firstSpace + 1).trim();
    if (!name) throw new Error("Usage: /template run <name> <json_args>");
    if (!argsText) throw new Error("Usage: /template run <name> <json_args>");
    return { kind: "TemplateRun", name, argsText };
  }

  return null;
}

function parseNotionLiveDbCommand(command: string): { database_id: string } | null {
  const trimmed = command.trim();
  if (!/^\/notion\s+live\s+db\b/i.test(trimmed)) return null;

  // Form 1: /notion live db <DATABASE_ID>
  const m = trimmed.match(/^\/notion\s+live\s+db\s+(\S+)\s*$/i);
  if (m?.[1]) return { database_id: String(m[1]) };

  // Form 2: /notion live db {"database_id":"..."}
  const payload = tryParseJsonArgTail(trimmed);
  const database_id = typeof payload?.database_id === "string" ? payload.database_id.trim() : "";
  if (database_id) return { database_id };

  return null;
}

function sanitizeExecutionIdPart(part: string) {
  return part.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
}

function safeFileIdPart(part: string) {
  return sanitizeExecutionIdPart(String(part ?? "") || "x");
}

async function maybeRecordProbationSuccessAndRecommend(input: {
  fingerprint: string;
  now_iso: string;
  threadId: string;
  autonomy_mode: string;
  autonomy_mode_effective: string;
  run_status: string;
  policy_denied: boolean;
  throttled: boolean;
  approval_required: boolean;
  steps: Array<{ read_only?: boolean }>;
}) {
  if (!isRequalificationEnabled()) return;

  const rqState = readRequalificationState(input.fingerprint);
  if (rqState?.state !== "PROBATION") return;

  const counter = updateProbationCounter({
    fingerprint: input.fingerprint,
    runResult: {
      status: input.run_status,
      now_iso: input.now_iso,
      governor_decision: "ALLOW",
      policy_denied: input.policy_denied,
      throttled: input.throttled,
      rollback_recorded: false,
      approval_required: input.approval_required,
      autonomy_mode: input.autonomy_mode,
      autonomy_mode_effective: input.autonomy_mode_effective,
      steps: input.steps,
    },
  });

  if (!counter) return;
  if (counter.success_count < counter.required_successes) return;

  // Tier-22.1: recommend ELIGIBLE (never auto-ACTIVE, never auto-activate).
  writeRequalificationState({
    fingerprint: input.fingerprint,
    state: "ELIGIBLE",
    cause: "PROBATION_SUCCESS_THRESHOLD",
    since: input.now_iso,
    cooldown_until: null,
  });

  // Locked recommendation event artifact shape.
  {
    const safeFilePart = (value: string) => {
      const s = String(value ?? "");
      const cleaned = s.replace(/[\\/<>:\"|?*\x00-\x1F]/g, "_");
      return cleaned.slice(0, 120);
    };
    const ensureDir = (dir: string) => {
      fs.mkdirSync(dir, { recursive: true });
    };

    const ts = new Date(input.now_iso).getTime();
    const safeTs = Number.isFinite(ts) ? ts : Date.now();
    const dir = path.join(process.cwd(), "runs", "requalification", "events");
    ensureDir(dir);
    const file = path.join(dir, `${safeFilePart(input.fingerprint)}.${safeTs}.json`);
    const confidence = readConfidence(input.fingerprint).confidence;
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          event: "RequalificationRecommended",
          fingerprint: input.fingerprint,
          confidence,
          success_count: counter.success_count,
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
  }

  await persistRun({
    kind: "RequalificationRecommended",
    execution_id: `requal_recommended_${safeFileIdPart(input.fingerprint)}_${Date.now()}`,
    threadId: input.threadId,
    goal: `Requalification recommended: ${input.fingerprint}`,
    dry_run: true,
    started_at: input.now_iso,
    finished_at: input.now_iso,
    status: "success",
    fingerprint: input.fingerprint,
    autonomy_mode: input.autonomy_mode,
    autonomy_mode_effective: input.autonomy_mode,
    steps: [],
    receipt: {
      kind: "RequalificationRecommended",
      fingerprint: input.fingerprint,
      recommendation: "ELIGIBLE",
      success_count: counter.success_count,
      required_successes: counter.required_successes,
    },
  } as any);
}

function deriveTemplateExecutionId(templateName: string, args: Record<string, unknown>) {
  const pageId = typeof args.page_id === "string" ? args.page_id.trim() : "";
  const suffix = pageId ? sanitizeExecutionIdPart(pageId) : "001";
  return `tier10_7-template-run-${sanitizeExecutionIdPart(templateName)}_${suffix}`;
}

function readLastReceiptForExecutionId(executionId: string): any | null {
  try {
    const receiptsPath = path.join(process.cwd(), "runs", "receipts.jsonl");
    if (!fs.existsSync(receiptsPath)) return null;
    const lines = fs.readFileSync(receiptsPath, "utf8").split(/\r?\n/).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i]!;
      try {
        const json = JSON.parse(line);
        if (json?.execution_id === executionId) return json;
      } catch {
        // ignore
      }
    }
    return null;
  } catch {
    return null;
  }
}

function readLastReceiptForFingerprint(fingerprint: string): any | null {
  try {
    const fp = String(fingerprint ?? "").trim();
    if (!fp) return null;
    const receiptsPath = path.join(process.cwd(), "runs", "receipts.jsonl");
    if (!fs.existsSync(receiptsPath)) return null;
    const lines = fs.readFileSync(receiptsPath, "utf8").split(/\r?\n/).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i]!;
      try {
        const json = JSON.parse(line);
        if (typeof json?.fingerprint === "string" && json.fingerprint === fp) return json;
      } catch {
        // ignore
      }
    }
    return null;
  } catch {
    return null;
  }
}

function loadPrestateForExecution(execution_id: string) {
  const dir = "runs/prestate";
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(execution_id + "."))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new Error(`Missing env var: ${name}`);
  return v;
}

function extractJsonFromText(text: string): any {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Empty agent response");

  // In strict mode, require a single JSON value with no wrappers.
  if (isStrictAgentOutputEnabled()) {
    return JSON.parse(trimmed);
  }

  // Fast path: pure JSON
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  // Fenced code blocks: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    const inside = fenceMatch[1].trim();
    try {
      return JSON.parse(inside);
    } catch {
      // continue
    }
  }

  // Heuristic: find first {...} or [...]
  const firstObj = trimmed.indexOf("{");
  const lastObj = trimmed.lastIndexOf("}");
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    const candidate = trimmed.slice(firstObj, lastObj + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }

  const firstArr = trimmed.indexOf("[");
  const lastArr = trimmed.lastIndexOf("]");
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
    const candidate = trimmed.slice(firstArr, lastArr + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }

  throw new Error(`Agent response was not parseable JSON. Got: ${trimmed.slice(0, 240)}`);
}

function parseJsonFromAgentResponse(agentResponse: any): any {
  // Expected webhook response shape: { response: string, threadId: string, error: any }
  const text = agentResponse?.response;
  if (typeof text !== "string") throw new Error("Agent did not return a string 'response' field");
  return extractJsonFromText(text);
}

function tryParseJsonArgTail(command: string): any | null {
  const i = command.indexOf("{");
  if (i === -1) return null;
  const tail = command.slice(i).trim();
  if (!tail) return null;
  try {
    return JSON.parse(tail);
  } catch {
    return null;
  }
}

function computeReceiptHashForLog(runLog: unknown) {
  const payload = JSON.stringify(runLog);
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function tokenBudgetFromEnv(): number {
  const raw = String(process.env.SINTRAPRIME_TOKEN_BUDGET ?? "0").trim();
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function cacheEnabledFromEnv(): boolean {
  const v = String(process.env.SINTRAPRIME_CACHE ?? "").trim().toLowerCase();
  // Governance default: OFF unless explicitly enabled.
  return v === "1" || v === "true" || v === "yes";
}

function runDirForCache(): string {
  return process.env.SINTRAPRIME_RUN_DIR || process.env.RUN_DIR || "runs/latest";
}

function splitCommandFirstMessage(message: string): { user: string; system: string } {
  const m = String(message ?? "");
  const i = m.indexOf("\n");
  if (i === -1) return { user: m.trim(), system: "" };
  const user = m.slice(0, i).trim();
  const system = m.slice(i + 1).replace(/^\s+/, "").trim();
  return { user, system };
}

function joinCommandFirstMessage(parts: { user: string; system: string }): string {
  const user = String(parts.user ?? "").trim();
  const system = String(parts.system ?? "").trim();
  if (!system) return user;
  // Keep the actual command as the first bytes of the message.
  return `${user}\n\n${system}`;
}

function pushTurboTrims(turbosparse: any, kind: string, trims: BudgetTrim[]) {
  if (!turbosparse || !Array.isArray(trims) || trims.length === 0) return;
  if (!Array.isArray(turbosparse.trims)) turbosparse.trims = [];
  for (const t of trims) {
    turbosparse.trims.push({ kind: `${kind}:${t.kind}`, detail: t.detail });
  }
}

function pushTurboCacheEvent(turbosparse: any, ev: { hit: boolean; key?: string }) {
  if (!turbosparse) return;
  if (!turbosparse.cache || typeof turbosparse.cache !== "object") turbosparse.cache = {};
  turbosparse.cache.enabled = cacheEnabledFromEnv();
  if (typeof turbosparse.cache.hit !== "boolean") turbosparse.cache.hit = ev.hit;
  if (ev.hit) turbosparse.cache.hit = true;
  if (typeof ev.key === "string" && ev.key.trim()) {
    turbosparse.cache.keyPrefix = ev.key.trim().slice(0, 12);
  }
}

async function sendMessageTurboCached(params: {
  webhookUrl: string;
  threadId: string;
  message: string;
  kind: "validator" | "planner" | "planner_retry";
  turbosparse?: any;
}) {
  const maxTokens = tokenBudgetFromEnv();
  let msg = String(params.message ?? "");

  if (maxTokens > 0) {
    const parts = splitCommandFirstMessage(msg);
    const b = applyTokenBudget({ system: parts.system, user: parts.user, maxTokens });
    msg = joinCommandFirstMessage({ user: b.user, system: b.system });
    pushTurboTrims(params.turbosparse, params.kind, b.trims);
  }

  const cacheEnabled = cacheEnabledFromEnv();
  if (cacheEnabled) {
    const runDir = runDirForCache();
    const parts = splitCommandFirstMessage(msg);
    const key = cacheKey({ system: parts.system, user: parts.user, toolSig: `${params.kind}:${params.webhookUrl}` });
    const hit = readCache(runDir, key);
    if (hit && typeof hit === "object" && "response" in (hit as any)) {
      pushTurboCacheEvent(params.turbosparse, { hit: true, key });
      return hit;
    }
    pushTurboCacheEvent(params.turbosparse, { hit: false, key });

    const out = await sendMessage({ webhookUrl: params.webhookUrl, threadId: params.threadId, message: msg });
    try {
      // Cache only successful-ish webhook responses.
      if (out && typeof out === "object" && (out as any).ok !== false && (out as any).response) {
        writeCache(runDir, key, out);
      }
    } catch {
      // ignore cache write
    }
    return out;
  }

  return sendMessage({ webhookUrl: params.webhookUrl, threadId: params.threadId, message: msg });
}

async function retryPlannerOnce(params: {
  plannerUrl: string;
  threadId: string;
  command: string;
  firstError: unknown;
  firstRawText: string;
  arch?: ArchSelection;
  modes?: ModeSelection;
  turbosparse?: {
    enabled: boolean;
    experts: string[];
    reason?: string[];
    systemPromptText?: string;
  };
}) {
  if (isStrictAgentOutputEnabled()) {
    throw new Error("Planner retry is disabled in strict mode");
  }

  const truncate = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max)}…`);
  const rawPreview = truncate(params.firstRawText ?? "", 1500);
  const errPreview = truncate(String((params.firstError as any)?.message ?? params.firstError), 500);

  // Still one message string, and it starts with the original command.
  const retryMsg =
    `${assembleSystemPrompt({
      arch: params.arch,
      modes: params.modes,
      turbosparse: params.turbosparse,
      command: params.command,
    })}\n\n` +
    `__PLANNER_RETRY_CONTEXT__\n` +
    `Previous planner output was invalid for the required schema.\n` +
    `- Reason: ${errPreview}\n\n` +
    `Raw output (truncated):\n<<<\n${rawPreview}\n>>>\n\n` +
    `Return ONLY a single valid JSON object (ExecutionPlan or NeedInput).`;

  const second = await sendMessageTurboCached({
    webhookUrl: params.plannerUrl,
    threadId: params.threadId,
    message: retryMsg,
    kind: "planner_retry",
    turbosparse: params.turbosparse,
  });

  const raw2 = parseJsonFromAgentResponse(second.response);
  return PlannerOutputSchema.parse(raw2);
}

async function run() {
  const strictAny = parseStrictAnyFlag(process.argv);
  const archId = parseArchFlag(process.argv);
  const strictArch = parseStrictArchFlag(process.argv) || strictAny;

  let arch: ArchSelection;
  try {
    arch = await selectArchitecture(archId, { strict: strictArch });
  } catch (e) {
    if (e instanceof ArchStrictError) {
      const refusal: ArchRefusal = e.refusal;
      // Minimal, audit-friendly behavior: emit refusal JSON and exit non-zero.
      // Caller can pipe this into existing SSAL/refusal pack handling.
      console.error(JSON.stringify(refusal, null, 2));
      process.exitCode = 2;

      const runDir =
        process.env.SINTRAPRIME_RUN_DIR ||
        process.env.RUN_DIR ||
        "runs/latest";

      try {
        await writeRefusalPack({
          runDir,
          refusal,
          exitCode: 2,
          arch: {
            archId: typeof archId === "string" ? archId : undefined,
            archVersion: "0.0.0",
          },
          ssal: { state: "REFUSE", code: refusal.code },
          note: "Strict architecture refusal",
        });
      } catch (packErr) {
        console.error(
          JSON.stringify(
            {
              level: "warn",
              msg: "Failed to write refusal pack",
              err: String((packErr as any)?.message ?? packErr),
            },
            null,
            2
          )
        );
      }
      return;
    }
    throw e;
  }

  const strictMode = parseStrictModeFlag(process.argv) || strictAny;
  const modeIds = parseModeFlag(process.argv);

  let modes: ModeSelection;
  try {
    modes = await selectModes(modeIds, { strict: strictMode });
  } catch (e) {
    if (e instanceof ModeStrictError) {
      const refusal = e.refusal;
      console.error(JSON.stringify(refusal, null, 2));
      process.exitCode = 2;

      const runDir = process.env.SINTRAPRIME_RUN_DIR || process.env.RUN_DIR || "runs/latest";

      try {
        await writeRefusalPack({
          runDir,
          refusal,
          exitCode: 2,
          arch: {
            archId: typeof archId === "string" ? archId : undefined,
            archVersion: "0.0.0",
          },
          ssal: { state: "REFUSE", code: refusal.code },
          note: "Strict mode refusal",
        });
      } catch (packErr) {
        console.error(
          JSON.stringify(
            {
              level: "warn",
              msg: "Failed to write refusal pack",
              err: String((packErr as any)?.message ?? packErr),
            },
            null,
            2
          )
        );
      }
      return;
    }
    throw e;
  }

  // Optional: load local secrets file (DO NOT COMMIT) to align with operator docs.
  // Only fills missing/empty env vars; never overwrites existing values.
  const controlConfig = loadControlConfig(process.cwd());

  const watchPhases: Set<string> | null = (() => {
    const raw = typeof process.env.WATCH_PHASES === "string" ? process.env.WATCH_PHASES : "";
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return new Set(
      trimmed
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
  })();

  const canonicalWatchPhaseOrder = ["preplan", "approval", "preapply", "apply", "postapply"] as const;

  const normalizedWatchPhases = () => {
    if (watchPhases === null) return ["approval", "postapply"] as const;
    const picked: string[] = [];
    for (const p of canonicalWatchPhaseOrder) {
      if (watchPhases.has(p)) picked.push(p);
    }
    return picked;
  };

  const shouldWatchPhase = (phase: string) => {
    const p = String(phase).trim().toLowerCase();
    if (watchPhases === null) {
      // Default remains unchanged.
      return p === "approval" || p === "postapply";
    }
    return watchPhases.has(p);
  };

  const maybeWatchTour = async (phase: string, execution_id: string, note: string) => {
    if (!shouldWatchPhase(phase)) return;
    await runWatchModeTour({ execution_id, config: controlConfig, note });
  };

  let hashCountApply = 0;
  let hashCountPostapply = 0;
  let hashHead: string | null = null;
  const hashEnabled = () => isRunHashChainEnabled(process.env);
  const hashArtifact = (execution_id: string, relpath: string, scope: "apply" | "postapply") => {
    const r = maybeAppendHashChainArtifact({ execution_id, artifact_relpath: relpath });
    if (!r) return;
    hashHead = r.head;
    if (scope === "apply") hashCountApply++;
    if (scope === "postapply") hashCountPostapply++;
  };
  try {
    const secrets = loadSecretsEnv(process.cwd());
    applySecretsToProcessEnv(secrets);
  } catch {
    // ignore
  }

  const threadId = process.env.THREAD_ID ?? "exec_live_001";
  const rawCommand = getArgCommand();
  const rawTrimmed = rawCommand.trim();
  const normalizedCommand = /^\/template\b/i.test(rawTrimmed) ? rawTrimmed : normalizeCommand(rawCommand);
  if (process.env.CLI_DSL_DEBUG === "1" && normalizedCommand !== rawCommand) {
    console.warn(`[CLI-DSL] ${rawCommand} → ${normalizedCommand}`);
  }

  const domainPrefix = parseDomainPrefix(normalizedCommand);
  const domain_id = domainPrefix?.domain_id ?? null;
  const original_command = domainPrefix?.original_command ?? normalizedCommand;
  const command = domainPrefix?.inner_command ?? normalizedCommand;

  // TurboSparse: sparse activation of prompt modules (“experts”).
  // Policy: enabled by default; disable with --no-turbosparse.
  const turboEnabled = parseTurboSparseEnabled(process.argv);
  const turboStrict = parseStrictTurboSparseFlag(process.argv) || strictAny;

  const turboDecision = turboEnabled
    ? selectExperts({
        text: command,
        modeId: (modes.modeIds ?? []).join(","),
        archId: arch.archId,
        maxExperts: 4,
      })
    : { enabled: false, experts: ["core"] as any, reason: ["TurboSparse disabled"] };

  if (turboEnabled && turboStrict && (modes.modeIds ?? []).length > 0 && (turboDecision.experts ?? []).length <= 1) {
    const refusal = {
      type: "REFUSE" as const,
      code: "TURBOSPARSE_EMPTY" as const,
      message: "TurboSparse strict mode: no suitable experts selected for the requested mode.",
      details: {
        archId: arch.archId,
        modeIds: modes.modeIds ?? [],
        experts: turboDecision.experts,
      },
    };

    console.error(JSON.stringify(refusal, null, 2));
    process.exitCode = 2;

    const runDir = process.env.SINTRAPRIME_RUN_DIR || process.env.RUN_DIR || "runs/latest";
    try {
      await writeRefusalPack({
        runDir,
        refusal,
        exitCode: 2,
        arch: { archId: arch.archId, archVersion: arch.archVersion },
        ssal: { state: "REFUSE", code: refusal.code },
        note: "Strict TurboSparse refusal",
      });
    } catch {
      // ignore
    }
    return;
  }

  const turboSystemPrompt = turboEnabled ? buildTurboSparseSystemPrompt(turboDecision.experts as any) : "";
  const turbosparseMeta = {
    enabled: !!turboEnabled,
    experts: (turboDecision.experts ?? []).map((e: any) => String(e)),
    reason: Array.isArray(turboDecision.reason) ? turboDecision.reason : [],
    systemPromptText: turboSystemPrompt,
  };

  // Gamma integration: dual-path
  // - If GAMMA_API_KEY is set: use Gamma API to create/poll generation.
  // - If missing and strict-any is enabled: refuse with exit code 2 + refusal pack.
  // - If missing and not strict: emit a Gamma Free import pack under runDir/gamma.
  const gammaMatch = command.trim().match(/^\/gamma(?:\s+(.+))?\s*$/i);
  if (gammaMatch) {
    const runDir = process.env.SINTRAPRIME_RUN_DIR || process.env.RUN_DIR || "runs/latest";

    const arg = String(gammaMatch[1] ?? "").trim();
    const requestedBackend = /(^|\s)--backend(?:=|\s+)gamma_api(\s|$)/i.test(arg)
      ? "gamma_api"
      : /(^|\s)--backend(?:=|\s+)gamma_free_pack(\s|$)/i.test(arg)
        ? "gamma_free_pack"
        : undefined;

    const cleaned = arg
      .replace(/(^|\s)--backend=\S+/gi, " ")
      .replace(/(^|\s)--backend\s+\S+/gi, " ")
      .trim();

    const title = cleaned || "Gamma deck";

    try {
      const result = await runGammaDeck({
        runDir,
        strictAny,
        env: { GAMMA_API_KEY: process.env.GAMMA_API_KEY },
        request: {
          title,
          sourceText: "",
          requestedBackend,
        },
      });

      process.stdout.write(
        JSON.stringify(
          {
            ok: true,
            backend: result.backend,
            artifactsDir: result.artifactsDir,
            ...(result.backend === "gamma_api"
              ? { generationId: result.generationId, fileUrls: result.fileUrls }
              : { files: result.files }),
          },
          null,
          2
        )
      );
      return;
    } catch (e) {
      if (e instanceof GammaStrictError) {
        console.error(JSON.stringify(e.refusal, null, 2));
        process.exitCode = 2;
        try {
          await writeRefusalPack({
            runDir,
            refusal: e.refusal,
            exitCode: 2,
            ssal: { state: "REFUSE", code: e.refusal.code },
            note: "Strict gamma refusal",
          });
        } catch {
          // best-effort
        }
        return;
      }

      const status = e instanceof GammaApiError ? e.status : undefined;
      if (strictAny) {
        const code =
          status === 401
            ? "GAMMA_API_UNAUTHORIZED"
            : status === 403
              ? "GAMMA_API_FORBIDDEN"
              : "GAMMA_GENERATION_FAILED";

        const refusal = {
          type: "REFUSE" as const,
          code,
          message: "Gamma generation failed under strict governance.",
          details: { status, error: String((e as any)?.message ?? e) },
        };

        console.error(JSON.stringify(refusal, null, 2));
        process.exitCode = 2;
        try {
          await writeRefusalPack({
            runDir,
            refusal,
            exitCode: 2,
            ssal: { state: "REFUSE", code: refusal.code },
            note: "Strict Gamma refusal",
          });
        } catch {
          // best-effort
        }
        return;
      }

      console.error(String((e as any)?.message ?? e));
      console.error("Tip: omit --backend=gamma_api (or unset GAMMA_API_KEY) to generate a Gamma Free import pack.");
      process.exitCode = 1;
      return;
    }
  }

  // SintraPrime Slides: compile -> optimize -> render (pptx/html/pdf) into runDir/slides
  // Usage:
  //   --strict-any --arch synergy-7 --mode technical /slides --title "..." --brand vault-guardian.black-gold --format pptx,html --in path/to.md
  const slidesMatch = command.trim().match(/^\/slides(?:\s+([\s\S]+))?\s*$/i);
  if (slidesMatch) {
    const runDir = process.env.SINTRAPRIME_RUN_DIR || process.env.RUN_DIR || "runs/latest";

    const argStr = String(slidesMatch[1] ?? "").trim();
    const tokens = splitArgs(argStr);
    const parsed = parseSlidesArgs(tokens);

    try {
      const sourceText = parsed.inPath ? fs.readFileSync(parsed.inPath, "utf8") : parsed.sourceText;

      const result = await runSlidesPipeline({
        runDir,
        strictAny,
        title: parsed.title,
        subtitle: parsed.subtitle,
        sourceText,
        brandIdOrPath: parsed.brand,
        formats: parsed.formats,
      });

      process.stdout.write(
        JSON.stringify(
          {
            ok: true,
            runDir,
            slides: result,
          },
          null,
          2
        )
      );
      return;
    } catch (e) {
      if (e instanceof SlidesStrictError) {
        console.error(JSON.stringify(e.refusal, null, 2));
        process.exitCode = 2;
        try {
          await writeRefusalPack({
            runDir,
            refusal: e.refusal,
            exitCode: 2,
            arch: { archId: typeof archId === "string" ? archId : undefined, archVersion: "0.0.0" },
            ssal: { state: "REFUSE", code: e.refusal.code },
            note: "Strict slides refusal",
          });
        } catch {
          // best-effort
        }
        return;
      }

      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  // StitchPack: governance-safe UI export ingest.
  // Command surface:
  //   /ui stitch ...   (preferred)
  //   /stitch ...      (alias)
  // Artifacts:
  //   <runDir>/stitch/import/*
  //   <runDir>/stitch/stitchpack.json
  // Receipt:
  //   <runDir>/receipt.json -> receipt.stitch
  const stitchMatch = command.trim().match(/^\/(?:(?:ui)\s+)?stitch(?:\s+([\s\S]+))?\s*$/i);
  if (stitchMatch) {
    const runDir = process.env.SINTRAPRIME_RUN_DIR || process.env.RUN_DIR || "runs/latest";
    const strictStitch = parseStrictStitchFlag(process.argv) || strictAny;
    const stitchRender = parseStitchRenderFlag(process.argv);

    const requestedBackendRaw =
      parseStitchBackendFlag(process.argv) ||
      (typeof process.env.SINTRAPRIME_STITCH_BACKEND === "string" ? process.env.SINTRAPRIME_STITCH_BACKEND : null);

    const isBackendId = (s: string): s is StitchBackendId => {
      return s === "stitch_web_ingest" || s === "stitch_auto_playwright";
    };

    const notes: string[] = [];

    let backend: StitchBackendId = selectStitchBackend(process.env);
    if (typeof requestedBackendRaw === "string" && requestedBackendRaw.trim()) {
      const trimmed = requestedBackendRaw.trim();
      if (!isBackendId(trimmed)) {
        const refusal = stitchRefusal(
          "STITCH_UNKNOWN_BACKEND",
          `Unknown Stitch backend: ${trimmed}`,
          { backend: trimmed, allowed: ["stitch_web_ingest", "stitch_auto_playwright"] }
        );
        if (strictStitch) throw new StitchStrictError(refusal);
        notes.push(`Unknown stitch backend '${trimmed}', falling back to stitch_web_ingest.`);
        backend = "stitch_web_ingest";
      } else {
        backend = trimmed;
      }
    }

    if (backend === "stitch_auto_playwright" && !isStitchAutomationEnabled(process.env)) {
      const refusal = stitchRefusal(
        "STITCH_AUTOMATION_BLOCKED",
        "Stitch automation is blocked by default (human-in-the-loop export ingest).",
        { tip: "Set SINTRAPRIME_STITCH_AUTOMATE=1 to allow automation." }
      );
      if (strictStitch) throw new StitchStrictError(refusal);
      notes.push("Stitch automation blocked; falling back to stitch_web_ingest.");
      backend = "stitch_web_ingest";
    }

    if (backend === "stitch_auto_playwright") {
      notes.push(
        "Automation backend selected; current implementation performs ingest only (expects export files under stitch/import)."
      );
    }

    const sourceImportDir =
      parseStitchImportDirFlag(process.argv) ||
      (typeof process.env.SINTRAPRIME_STITCH_IMPORT_DIR === "string" ? process.env.SINTRAPRIME_STITCH_IMPORT_DIR : null);

    const canRenderPdf = async (): Promise<boolean> => {
      try {
        await import("playwright");
        return true;
      } catch {
        return false;
      }
    };

    const writePitchMarkdown = (pack: any): { pitchRel: string; pitchAbs: string } => {
      const runDirAbs = path.resolve(process.cwd(), runDir);
      const stitchDirAbs = path.join(runDirAbs, "stitch");
      fs.mkdirSync(stitchDirAbs, { recursive: true });
      const pitchAbs = path.join(stitchDirAbs, "pitch.md");
      const pitchRel = path.relative(runDirAbs, pitchAbs);
      const md = stitchInventoryToMarkdown(pack);
      fs.writeFileSync(pitchAbs, md, "utf8");
      return { pitchRel, pitchAbs };
    };

    const renderDeckFromMarkdownFile = async (args: {
      markdownPathAbs: string;
      outSubdir: string;
      title: string;
      subtitle?: string;
      brandIdOrPath: string;
      strict: boolean;
      formats: SlidesFormat[];
    }) => {
      const sourceText = fs.readFileSync(args.markdownPathAbs, "utf8");
      return await runSlidesPipeline({
        runDir,
        outSubdir: args.outSubdir,
        strictAny: args.strict,
        title: args.title,
        subtitle: args.subtitle,
        sourceText,
        brandIdOrPath: args.brandIdOrPath,
        formats: args.formats,
      });
    };

    try {
      const { pack } = await ingestStitchExport({
        runDir,
        backend,
        promptText: command.trim(),
        strict: strictStitch,
        sourceImportDir,
        notes,
      });

      const pitch = writePitchMarkdown(pack);

      let deck: any = null;
      if (stitchRender) {
        const formats: SlidesFormat[] = ["pptx", "html"];
        if (await canRenderPdf()) formats.push("pdf");

        try {
          deck = await renderDeckFromMarkdownFile({
            markdownPathAbs: pitch.pitchAbs,
            outSubdir: "stitch/deck",
            title: `Stitch Deck (${pack.runId})`,
            subtitle: `backend: ${pack.backend}`,
            brandIdOrPath: "vault-guardian.black-gold",
            strict: strictAny || strictStitch,
            formats,
          });
        } catch (err) {
          if (err instanceof SlidesStrictError) throw err;

          if (strictAny || strictStitch) {
            throw new StitchStrictError(
              stitchRefusal(
                "STITCH_RENDER_FAILED",
                "Strict Stitch render failed when compiling pitch.md into deck outputs.",
                {
                  outDir: "stitch/deck",
                  markdownPath: "stitch/pitch.md",
                  error: String((err as any)?.message ?? err),
                }
              )
            );
          }
          throw err;
        }
      }

      // Minimal, stable receipt update
      try {
        const runDirAbs = path.resolve(process.cwd(), runDir);
        const receiptPath = path.join(runDirAbs, "receipt.json");
        const existing = fs.existsSync(receiptPath) ? JSON.parse(fs.readFileSync(receiptPath, "utf8")) : {};
        const next = {
          ...existing,
          stitch: {
            backend: pack.backend,
            import: {
              found: pack.import.found,
              files: pack.import.assets.length,
              hashesWritten: true,
            },
          },
        };
        fs.mkdirSync(runDirAbs, { recursive: true });
        fs.writeFileSync(receiptPath, JSON.stringify(next, null, 2) + "\n", "utf8");
      } catch {
        // best-effort
      }

      process.stdout.write(
        JSON.stringify(
          {
            ok: true,
            runDir,
            stitch: {
              backend: pack.backend,
              import: { found: pack.import.found, files: pack.import.assets.length, hashesWritten: true },
              stitchpack: "stitch/stitchpack.json",
              stable: {
                json: "stitch/stitchpack.stable.json",
                sha256: "stitch/stitchpack.stable.sha256",
              },
              pitch: "stitch/pitch.md",
              deck,
            },
          },
          null,
          2
        )
      );
      return;
    } catch (e) {
      if (e instanceof SlidesStrictError) {
        console.error(JSON.stringify(e.refusal, null, 2));
        process.exitCode = 2;
        try {
          await writeRefusalPack({
            runDir,
            refusal: e.refusal,
            exitCode: 2,
            arch: { archId: typeof archId === "string" ? archId : undefined, archVersion: "0.0.0" },
            ssal: { state: "REFUSE", code: e.refusal.code },
            note: "Strict stitch render refusal",
          });
        } catch {
          // best-effort
        }
        return;
      }

      if (e instanceof StitchStrictError) {
        console.error(JSON.stringify(e.refusal, null, 2));
        process.exitCode = 2;
        try {
          await writeRefusalPack({
            runDir,
            refusal: e.refusal,
            exitCode: 2,
            arch: { archId: typeof archId === "string" ? archId : undefined, archVersion: "0.0.0" },
            ssal: { state: "REFUSE", code: e.refusal.code },
            note: "Strict stitch refusal",
          });
        } catch {
          // best-effort
        }
        return;
      }

      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  // Cases: deadline scanner + deterministic mirror.
  // Usage:
  //   NOTION_CASES_DB_ID=... NOTION_TOKEN=... node --import tsx src/cli/run-command.ts /cases scan
  const casesScanMatch = command.trim().match(/^\/cases\s+scan(?:\s+([\s\S]+))?\s*$/i);
  if (casesScanMatch) {
    const argStr = String(casesScanMatch[1] ?? "").trim();
    const m = argStr.match(/--lock-minutes\s+(\d+)/i);
    const lockMinutes = m ? Number(m[1]) : 15;

    try {
      await runCasesScanCommand({ rootDir: process.cwd(), lockMinutes });
      process.stdout.write(JSON.stringify({ ok: true, command: "/cases scan", lockMinutes }, null, 2) + "\n");
      return;
    } catch (e) {
      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  // Cases drift detector: Notion stage advanced but local artifacts missing.
  const casesDriftMatch = command.trim().match(/^\/cases\s+drift\s*$/i);
  if (casesDriftMatch) {
    try {
      await runCasesDriftCommand({ rootDir: process.cwd() });
      return;
    } catch (e) {
      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  // Cases received trigger: Response Received checked -> generate exhibit packet + mark Packet Ready.
  // Usage:
  //   NOTION_CASES_DB_ID=... NOTION_TOKEN=... node --import tsx src/cli/run-command.ts /cases received
  const casesReceivedMatch = command.trim().match(/^\/cases\s+received(?:\s+([\s\S]+))?\s*$/i);
  if (casesReceivedMatch) {
    const argStr = String(casesReceivedMatch[1] ?? "").trim();
    const m = argStr.match(/--limit\s+(\d+)/i);
    const limit = m ? Number(m[1]) : 25;

    try {
      const result = await runCasesReceivedCommand({ rootDir: process.cwd(), limit });
      process.stdout.write(JSON.stringify({ ok: true, command: "/cases received", limit, result }, null, 2) + "\n");
      return;
    } catch (e) {
      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  // Litigation packet build (local artifacts) from a JSON payload.
  // Usage:
  //   node --import tsx src/cli/run-command.ts /litigation packet {"op":"LITIGATION_ENGINE_V1_BUILD_PACKET",...}
  const litPacketMatch = command.trim().match(/^\/litigation\s+packet(?:\s+([\s\S]+))?\s*$/i);
  if (litPacketMatch) {
    const argStr = String(litPacketMatch[1] ?? "").trim();
    if (!argStr.startsWith("{")) {
      process.stdout.write(
        JSON.stringify(
          {
            kind: "NeedInput",
            reason: "Expected JSON payload",
            example: {
              op: "LITIGATION_ENGINE_V1_BUILD_PACKET",
              case_id: "SELFTEST-NJ-ESSEX-0001",
              venue: "NJ-SUPERIOR",
              matter_type: "EMERGENCY",
              status: "Received",
              fields: {
                PLAINTIFF_NAME: "Isiah Tarik Howard",
                DEFENDANT_NAME: "Example Defendant",
                COUNTY: "Essex",
                STATE: "New Jersey",
                CASE_SUMMARY: "End-to-end verification payload",
                RELIEF_REQUESTED: "Emergency injunctive relief",
              },
            },
          },
          null,
          2,
        ) + "\n",
      );
      return;
    }

    try {
      const payload = JSON.parse(argStr);
      const result = await runLitigationPacketCommand({ rootDir: process.cwd(), payload });
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return;
    } catch (e) {
      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  // Operator helper: show last persisted egress policy snapshot.
  // Usage:
  //   /egress snapshot
  //   /egress snapshot <execution_id>
  //   /egress snapshot {"execution_id":"exec_123","receipts_path":"runs/receipts.jsonl"}
  const egressSnapshotMatch = command.trim().match(/^\/egress\s+snapshot(?:\s+([\s\S]+))?\s*$/i);
  if (egressSnapshotMatch) {
    const argStr = String(egressSnapshotMatch[1] ?? "").trim();

    let executionId: string | null = null;
    let receiptsPath: string | null = null;
    let runsDir: string | null = null;
    let caseId: string | null = null;
    let includeRefusals = false;

    if (argStr.startsWith("{")) {
      try {
        const payload = JSON.parse(argStr);
        if (typeof payload?.execution_id === "string") executionId = payload.execution_id;
        if (typeof payload?.receipts_path === "string") receiptsPath = payload.receipts_path;
        if (typeof payload?.file === "string") receiptsPath = payload.file;
        if (typeof payload?.runs_dir === "string") runsDir = payload.runs_dir;
        if (typeof payload?.case_id === "string") caseId = payload.case_id;
        if (payload?.include_refusals === true) includeRefusals = true;
      } catch {
        process.stdout.write(
          JSON.stringify(
            {
              kind: "NeedInput",
              reason: "Invalid JSON payload for /egress snapshot",
              expected: {
                execution_id: "string (optional)",
                receipts_path: "string (optional, defaults to runs/receipts.jsonl)",
                runs_dir: "string (optional, defaults to runs)",
                case_id: "string (optional, used with include_refusals)",
                include_refusals: "boolean (optional)",
              },
            },
            null,
            2
          ) + "\n"
        );
        return;
      }
    } else if (argStr) {
      const mExec = argStr.match(/--execution\s+(\S+)/i);
      const mFile = argStr.match(/--file\s+(\S+)/i);
      const mRuns = argStr.match(/--runs-dir\s+(\S+)/i);
      const mCase = argStr.match(/--case-id\s+(\S+)/i);
      if (/--include-refusals\b/i.test(argStr)) includeRefusals = true;
      if (mExec?.[1]) executionId = String(mExec[1]);
      if (mFile?.[1]) receiptsPath = String(mFile[1]);
      if (mRuns?.[1]) runsDir = String(mRuns[1]);
      if (mCase?.[1]) caseId = String(mCase[1]);
      if (!executionId && !receiptsPath) executionId = argStr;
    }

    try {
      await runEgressSnapshotCommand({ rootDir: process.cwd(), executionId, caseId, receiptsPath, runsDir, includeRefusals });
      return;
    } catch (e) {
      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  // Alias: /policy snapshot -> /egress snapshot (same behavior)
  const policySnapshotMatch = command.trim().match(/^\/policy\s+snapshot(?:\s+([\s\S]+))?\s*$/i);
  if (policySnapshotMatch) {
    const argStr = String(policySnapshotMatch[1] ?? "").trim();

    let executionId: string | null = null;
    let receiptsPath: string | null = null;
    let runsDir: string | null = null;
    let caseId: string | null = null;
    let includeRefusals = false;

    if (argStr.startsWith("{")) {
      try {
        const payload = JSON.parse(argStr);
        if (typeof payload?.execution_id === "string") executionId = payload.execution_id;
        if (typeof payload?.receipts_path === "string") receiptsPath = payload.receipts_path;
        if (typeof payload?.file === "string") receiptsPath = payload.file;
        if (typeof payload?.runs_dir === "string") runsDir = payload.runs_dir;
        if (typeof payload?.case_id === "string") caseId = payload.case_id;
        if (payload?.include_refusals === true) includeRefusals = true;
      } catch {
        process.stdout.write(
          JSON.stringify(
            {
              kind: "NeedInput",
              reason: "Invalid JSON payload for /policy snapshot",
              expected: {
                execution_id: "string (optional)",
                receipts_path: "string (optional, defaults to runs/receipts.jsonl)",
                runs_dir: "string (optional, defaults to runs)",
                case_id: "string (optional, used with include_refusals)",
                include_refusals: "boolean (optional)",
              },
            },
            null,
            2
          ) + "\n"
        );
        return;
      }
    } else if (argStr) {
      const mExec = argStr.match(/--execution\s+(\S+)/i);
      const mFile = argStr.match(/--file\s+(\S+)/i);
      const mRuns = argStr.match(/--runs-dir\s+(\S+)/i);
      const mCase = argStr.match(/--case-id\s+(\S+)/i);
      if (/--include-refusals\b/i.test(argStr)) includeRefusals = true;
      if (mExec?.[1]) executionId = String(mExec[1]);
      if (mFile?.[1]) receiptsPath = String(mFile[1]);
      if (mRuns?.[1]) runsDir = String(mRuns[1]);
      if (mCase?.[1]) caseId = String(mCase[1]);
      if (!executionId && !receiptsPath) executionId = argStr;
    }

    try {
      await runEgressSnapshotCommand({ rootDir: process.cwd(), executionId, caseId, receiptsPath, runsDir, includeRefusals });
      return;
    } catch (e) {
      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  // Drive tooling: folder ensurePath + templates.
  // Usage:
  //   /drive ensurePath {"target":"make_proxy","path":"TikTok/Exports/Raw","dryRun":true}
  //   /drive applyTemplate {"target":"make_proxy","template":"TikTokEvidence_v1"}
  //   /drive authTest {"target":"make_proxy"}
  //   /drive authTest {"targets":["my_drive_ops","shared_drive_marketing","trust_vault","make_proxy"],"createTemp":true}
  const driveEnsureMatch = command.trim().match(/^\/drive\s+ensurepath(?:\s+([\s\S]+))?\s*$/i);
  if (driveEnsureMatch) {
    const argStr = String(driveEnsureMatch[1] ?? "").trim();
    if (!argStr.startsWith("{")) {
      process.stdout.write(
        JSON.stringify(
          {
            kind: "NeedInput",
            reason: "Expected JSON payload for /drive ensurePath",
            expected: {
              target: "string",
              path: "string",
              root: "string (optional)",
              dryRun: "boolean (optional)",
            },
          },
          null,
          2
        ) + "\n"
      );
      return;
    }

    try {
      const payload = JSON.parse(argStr);
      const out = await runDriveEnsurePath(payload);
      process.stdout.write(JSON.stringify(out, null, 2) + "\n");
      return;
    } catch (e) {
      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  const driveTemplateMatch = command.trim().match(/^\/drive\s+applytemplate(?:\s+([\s\S]+))?\s*$/i);
  if (driveTemplateMatch) {
    const argStr = String(driveTemplateMatch[1] ?? "").trim();
    if (!argStr.startsWith("{")) {
      process.stdout.write(
        JSON.stringify(
          {
            kind: "NeedInput",
            reason: "Expected JSON payload for /drive applyTemplate",
            expected: {
              target: "string",
              template: "string (e.g., TikTokEvidence_v1)",
              root: "string (optional)",
              dryRun: "boolean (optional)",
            },
          },
          null,
          2
        ) + "\n"
      );
      return;
    }

    try {
      const payload = JSON.parse(argStr);
      const out = await runDriveApplyTemplate(payload);
      process.stdout.write(JSON.stringify(out, null, 2) + "\n");
      return;
    } catch (e) {
      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  const driveAuthTestMatch = command.trim().match(/^\/drive\s+authtest(?:\s+([\s\S]+))?\s*$/i);
  if (driveAuthTestMatch) {
    const argStr = String(driveAuthTestMatch[1] ?? "").trim();
    if (!argStr.startsWith("{")) {
      process.stdout.write(
        JSON.stringify(
          {
            kind: "NeedInput",
            reason: "Expected JSON payload for /drive authTest",
            expected: {
              target: "string (single target)",
              targets: "string[] (multi-target sweep)",
              createTemp: "boolean (optional; create+delete temp folder when supported)",
            },
          },
          null,
          2
        ) + "\n"
      );
      return;
    }

    try {
      const payload = JSON.parse(argStr);
      const out = await runDriveAuthTest(payload);
      process.stdout.write(JSON.stringify(out, null, 2) + "\n");
      return;
    } catch (e) {
      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  // Drive operator-tier: receipts + status.
  // Usage:
  //   /drive receipts tail {"n":20}
  //   /drive status {"targets":["my_drive_ops","shared_drive_marketing"],"n":1}
  const driveReceiptsTailMatch = command.trim().match(/^\/drive\s+receipts\s+tail(?:\s+([\s\S]+))?\s*$/i);
  if (driveReceiptsTailMatch) {
    const argStr = String(driveReceiptsTailMatch[1] ?? "").trim();
    if (!argStr.startsWith("{")) {
      process.stdout.write(
        JSON.stringify(
          {
            ok: false,
            cmd: "drive.receipts.tail",
            atUtc: new Date().toISOString(),
            error: { code: "PAYLOAD_REQUIRED", message: "Expected JSON payload like {\"n\":20}" },
          },
          null,
          2
        ) + "\n"
      );
      process.exitCode = 1;
      return;
    }

    try {
      const payload = JSON.parse(argStr);
      const out = await driveReceiptsTail(payload);
      process.stdout.write(JSON.stringify(out, null, 2) + "\n");
      if (!out.ok) process.exitCode = 1;
      return;
    } catch (e) {
      const msg = String((e as any)?.message ?? e);
      process.stdout.write(
        JSON.stringify(
          { ok: false, cmd: "drive.receipts.tail", atUtc: new Date().toISOString(), error: { code: "EXCEPTION", message: msg } },
          null,
          2
        ) + "\n"
      );
      process.exitCode = 1;
      return;
    }
  }

  const driveStatusMatch = command.trim().match(/^\/drive\s+status(?:\s+([\s\S]+))?\s*$/i);
  if (driveStatusMatch) {
    const argStr = String(driveStatusMatch[1] ?? "").trim();
    if (!argStr.startsWith("{")) {
      process.stdout.write(
        JSON.stringify(
          {
            ok: false,
            cmd: "drive.status",
            atUtc: new Date().toISOString(),
            error: { code: "PAYLOAD_REQUIRED", message: "Expected JSON payload like {\"targets\":[...],\"n\":1}" },
          },
          null,
          2
        ) + "\n"
      );
      process.exitCode = 1;
      return;
    }

    try {
      const payload = JSON.parse(argStr);
      const out = await driveStatus(payload);
      process.stdout.write(JSON.stringify(out, null, 2) + "\n");
      if (!out.ok) process.exitCode = 1;
      return;
    } catch (e) {
      const msg = String((e as any)?.message ?? e);
      process.stdout.write(
        JSON.stringify(
          { ok: false, cmd: "drive.status", atUtc: new Date().toISOString(), error: { code: "EXCEPTION", message: msg } },
          null,
          2
        ) + "\n"
      );
      process.exitCode = 1;
      return;
    }
  }

  // Claude worker (governed): drafting + optional tool execution under lane allowlists.
  // Usage (draft lane, no tool execution):
  //   CLAUDE_MODEL=... ANTHROPIC_API_KEY=... node --import tsx src/cli/run-command.ts /claude worker {"lane":"draft","prompt":"Summarize this case"}
  const claudeWorkerMatch = command.trim().match(/^\/claude\s+worker\s+([\s\S]+)$/i);
  if (claudeWorkerMatch) {
    try {
      const payload = JSON.parse(String(claudeWorkerMatch[1] ?? "{}"));
      await runClaudeWorkerCommand({
        rootDir: process.cwd(),
        lane: (payload?.lane ?? "draft") as any,
        prompt: String(payload?.prompt ?? ""),
        executeTools: Boolean(payload?.executeTools ?? false),
      });
      return;
    } catch (e) {
      console.error(String((e as any)?.message ?? e));
      process.exitCode = 1;
      return;
    }
  }

  // Tier-S11: deterministic, local test hook for speech confidence gradient.
  // Usage: /speak confidence <0..1|0..100> <message...>
  if (/^\/speak\s+confidence\b/i.test(command.trim())) {
    const lines = command
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const results: Array<any> = [];
    for (const line of lines) {
      if (!/^\/speak\s+confidence\b/i.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const confRaw = Number(parts[2]);
      const msg = line.trim().split(/\s+/).slice(3).join(" ").trim() || "confidence event";

      // Preserve existing gradient/prefix behavior when enabled, but ALWAYS attach the
      // provided confidence value so the speech gate evaluates it deterministically.
      if (process.env.SPEECH_CONFIDENCE_GRADIENT === "1") {
        speakText(msg, "confidence", threadId, { confidence: confRaw });
      } else {
        speak({
          text: msg,
          category: "confidence",
          threadId,
          meta: { confidence: confRaw },
        });
      }

      results.push({
        kind: "Spoke",
        category: "confidence",
        threadId,
        confidence: confRaw,
        message: msg,
      });
    }

    process.stdout.write(JSON.stringify(results.length === 1 ? results[0] : { kind: "SpeakBatch", results }, null, 0));
    return;
  }

  // Tier-17: read-only rankings compute
  if (command.startsWith("/rankings compute")) {
    const parts = command.trim().split(/\s+/);
    const days = parts[2] ? parseInt(parts[2], 10) : 7;
    const windowDays = Number.isFinite(days) ? days : 7;
    const bundle = computeRankings({ windowDays });
    const { bundlePath } = writeRankingsArtifacts(bundle);
    process.stdout.write(
      JSON.stringify(
        {
          kind: "RankingsComputed",
          window_days: windowDays,
          operators: bundle.operators.length,
          fingerprints: bundle.fingerprints.length,
          domains: bundle.domains.length,
          bundlePath,
        },
        null,
        0
      )
    );
    return;
  }

  // Tier-19: recommend promotions (read-only; does not write promotions)
  if (/^\/autonomy\s+promote\s+recommend\b/i.test(command.trim())) {
    const parsed = tryParseJsonArgTail(command);
    const windowRuns = typeof parsed?.windowRuns === "number" ? parsed.windowRuns : undefined;
    const minAvgScore = typeof parsed?.minAvgScore === "number" ? parsed.minAvgScore : undefined;
    const minAgeDays = typeof parsed?.minAgeDays === "number" ? parsed.minAgeDays : undefined;

    const out = recommendPromotions({ windowRuns, minAvgScore, minAgeDays });
    const now_iso = fixedNowIso();
    const wrote = writePromotionCandidatesArtifact({ now_iso, candidates: out });

    process.stdout.write(
      JSON.stringify(
        {
          kind: "PromotionCandidatesRecommended",
          now_iso,
          artifact: wrote.file,
          summary: {
            window_runs: (out as any).window_runs,
            min_avg_score: (out as any).min_avg_score,
            min_age_days: (out as any).min_age_days,
            candidates: Array.isArray((out as any).candidates) ? (out as any).candidates.length : 0,
          },
        },
        null,
        0
      )
    );
    return;
  }

  // Tier-15: deterministic audit export (court packet)
  // Usage: /audit export {"since_iso":"2025-01-01T00:00:00.000Z","redact":true,"include_artifacts":false}
  if (/^\/audit\s+export\b/i.test(command.trim())) {
    // Back-compat: if the tail is JSON, keep the Tier-15 court packet.
    // New: if the tail is a single token, treat it as an execution_id for Tier-15.1.

    const trimmed = command.trim();
    const hasBrace = trimmed.includes("{");
    if (!hasBrace) {
      const m = trimmed.match(/^\/audit\s+export\s+(\S+)\s*$/i);
      const execution_id = m?.[1] ? String(m[1]) : "";

      if (!execution_id) {
        process.stdout.write(
          JSON.stringify(
            {
              kind: "NeedInput",
              schema_version: "15.1",
              reason: "Missing required execution_id",
              expected: {
                execution_id: "string (e.g. exec_123)",
              },
            },
            null,
            0
          )
        );
        return;
      }

      try {
        const out = await exportAuditExecutionBundle({ execution_id, redact: true });
        process.stdout.write(JSON.stringify(out, null, 0));
      } catch (err: any) {
        process.exitCode = 1;
        process.stdout.write(
          JSON.stringify(
            {
              kind: "AuditExportError",
              message: String(err?.message ?? err),
            },
            null,
            0
          )
        );
      }
      return;
    }

    const payload = tryParseJsonArgTail(command);
    if (hasBrace && !payload) {
      process.stdout.write(
        JSON.stringify(
          {
            kind: "NeedInput",
            schema_version: "15.0",
            reason: "Invalid JSON payload for /audit export",
            expected: {
              since_iso: "ISO timestamp string (required)",
              redact: "boolean (default true)",
              include_artifacts: "boolean (default true)",
            },
          },
          null,
          0
        )
      );
      return;
    }

    const since_iso =
      typeof payload?.since_iso === "string"
        ? payload.since_iso
        : typeof payload?.since === "string"
          ? payload.since
          : null;

    if (!since_iso) {
      process.stdout.write(
        JSON.stringify(
          {
            kind: "NeedInput",
            schema_version: "15.0",
            reason: "Missing required field since_iso",
            expected: {
              since_iso: "ISO timestamp string",
              redact: "boolean (default true)",
              include_artifacts: "boolean (default true)",
            },
          },
          null,
          0
        )
      );
      return;
    }

    const redact = payload?.redact === false ? false : true;
    const include_artifacts = payload?.include_artifacts === false ? false : true;
    if (!redact && process.env.ALLOW_UNREDACTED_AUDIT_EXPORT !== "1") {
      process.exitCode = 3;
      process.stdout.write(
        JSON.stringify(
          {
            kind: "PolicyDenied",
            code: "AUDIT_EXPORT_REDACTION_REQUIRED",
            reason: "Unredacted audit exports are disabled by default. Set ALLOW_UNREDACTED_AUDIT_EXPORT=1 to override.",
          },
          null,
          0
        )
      );
      return;
    }

    try {
      const out = exportAuditCourtPacket({ since_iso, redact, include_artifacts });
      process.stdout.write(JSON.stringify(out, null, 0));
    } catch (err: any) {
      process.exitCode = 1;
      process.stdout.write(
        JSON.stringify(
          {
            kind: "AuditExportError",
            message: String(err?.message ?? err),
          },
          null,
          0
        )
      );
    }
    return;
  }

  if (process.env.CLI_DSL_DEBUG === "1" && domainPrefix) {
    console.warn(`[CLI-DOMAIN] ${original_command} → ${command} (domain=${domain_id})`);
  }

  const autonomy_mode = String(process.env.AUTONOMY_MODE || "OFF");

  function applyConfidenceDowngrade(mode: string, confidence: number): string {
    if (mode === "OFF") return "OFF";
    if (confidence <= 0.4) return "READ_ONLY_AUTONOMY";
    if (confidence <= 0.6) {
      if (mode === "APPROVAL_GATED_AUTONOMY") return "PROPOSE_ONLY_AUTONOMY";
    }
    return mode;
  }

  // Use raw DSL text for fingerprinting so normalization doesn't bypass state.
  const rawDomain = parseDomainPrefix(rawTrimmed);
  const fingerprint_domain_id = rawDomain?.domain_id ?? domain_id;
  const fingerprint_command = rawDomain?.inner_command ?? rawTrimmed;
  const fingerprint = deriveFingerprint({ command: fingerprint_command, domain_id: fingerprint_domain_id });

  const priorReceiptByFingerprint = readLastReceiptForFingerprint(fingerprint);

  // Tier-16: confidence-based autonomy downgrade (persistent, never auto-recovers).
  const confidenceSnap = readConfidence(fingerprint);
  const autonomy_mode_effective_confidence = applyConfidenceDowngrade(autonomy_mode, confidenceSnap.confidence);
  if (autonomy_mode_effective_confidence !== autonomy_mode) {
    process.env.AUTONOMY_MODE = autonomy_mode_effective_confidence;
  }

  // Tier-22.1: cooldown watcher runs at start of every run (before planning).
  // It can emit receipts + artifacts, but never grants write power.
  if (isRequalificationEnabled()) {
    const now_iso = fixedNowIso();
    const transitions = applyRequalificationCooldownWatcher({ now_iso });
    const ts = new Date(now_iso).getTime();
    const safeTs = Number.isFinite(ts) ? ts : Date.now();

    for (const t of transitions) {
      await persistRun({
        kind: "AutonomyStateTransition",
        execution_id: `autonomy_transition_${safeFileIdPart(t.fingerprint)}_${safeTs}`,
        threadId,
        goal: `Autonomy state transition: ${t.fingerprint} ${t.from}→${t.to}`,
        dry_run: true,
        started_at: now_iso,
        finished_at: now_iso,
        status: "success",
        fingerprint: t.fingerprint,
        autonomy_mode,
        autonomy_mode_effective: effectiveAutonomyModeForState({ autonomy_mode, state: t.to }),
        steps: [],
        transition: { fingerprint: t.fingerprint, from: t.from, to: t.to, reason: t.reason },
      } as any);

      try {
        emitSpeechBundle({
          fingerprint: t.fingerprint,
          execution_id: `autonomy_transition_${safeFileIdPart(t.fingerprint)}_${safeTs}`,
          now_iso,
          prior_by_fingerprint: null,
          current: { kind: "AutonomyStateTransition", transition: { fingerprint: t.fingerprint, from: t.from, to: t.to, reason: t.reason } },
          autonomy_mode,
          autonomy_mode_effective: effectiveAutonomyModeForState({ autonomy_mode, state: t.to }),
          s6: {
            requalification: {
              prev: { requalification: { fingerprint: t.fingerprint, state: t.from } },
              curr: { requalification: { fingerprint: t.fingerprint, state: t.to, cause: t.reason } },
            },
          },
        });
      } catch {
        // ignore
      }
    }
  }

  // Tier-∞.1 — Governor-aware requalification pacing.
  // Requalification is governed like execution, but under a dedicated fingerprint.
  {
    const trimmed = command.trim();
    if (/^\/autonomy\s+requalify\b/i.test(trimmed) && !/^\/autonomy\s+requalify\s+activate\b/i.test(trimmed)) {
      const now_iso = fixedNowIso();
      const g = checkGovernor({
        fingerprint: "autonomy.requalify",
        autonomy_mode: "READ_ONLY_AUTONOMY",
        now_iso,
      });

      if (g.decision !== "ALLOW") {
        const started_at = now_iso;
        const finished_at = now_iso;

        const prevRequalState = (() => {
          try {
            return isRequalificationEnabled() ? readRequalificationState(g.fingerprint)?.state ?? null : null;
          } catch {
            return null;
          }
        })();

        await persistRun({
          kind: "Throttled",
          execution_id: `throttled_${safeFileIdPart(g.fingerprint)}_${Date.now()}`,
          threadId,
          goal: `Throttled: ${trimmed}`,
          dry_run: true,
          started_at,
          finished_at,
          status: "throttled",
          fingerprint: g.fingerprint,
          autonomy_mode,
          autonomy_mode_effective: g.autonomy_mode_effective,
          throttle_reason: g.reason,
          retry_after: g.retry_after,
          error: g.reason,
          policy_denied: g.reason ? { code: g.reason, reason: g.reason } : null,
          steps: [],
        } as any);

        console.log(
          JSON.stringify(
            {
              kind: "Throttled",
              reason: g.reason,
              retry_after: g.retry_after,
            },
            null,
            2
          )
        );
        process.exit(3);
      }
    }
  }

  // Tier-22.0: requalification scan command.
  {
    const trimmed = command.trim();
    if (/^\/autonomy\s+requalify\s+scan\s*$/i.test(trimmed)) {
      const at = fixedNowIso();
      const scan = requalifyScan({ now_iso: at });

      // Persist a scan receipt (and a recommendation receipt for each newly eligible fingerprint).
      await persistRun({
        kind: "RequalificationScan",
        execution_id: `requal_scan_${Date.now()}`,
        threadId,
        goal: "Requalification scan",
        dry_run: true,
        started_at: at,
        finished_at: at,
        status: "success",
        fingerprint: null,
        autonomy_mode,
        autonomy_mode_effective: scan.entered_probation.length ? "READ_ONLY_AUTONOMY" : autonomy_mode,
        steps: [],
      } as any);

      for (const fp of scan.recommended) {
        await persistRun({
          kind: "RequalificationRecommended",
          execution_id: `requal_recommended_${safeFileIdPart(fp)}_${Date.now()}`,
          threadId,
          goal: `Requalification recommended: ${fp}`,
          dry_run: true,
          started_at: at,
          finished_at: at,
          status: "success",
          fingerprint: fp,
          autonomy_mode,
          autonomy_mode_effective: autonomy_mode,
          steps: [],
        } as any);
      }

      // Output must be JSON only.
      console.log(JSON.stringify({
        kind: scan.kind,
        evaluated: scan.evaluated,
        eligible: scan.eligible,
        still_suspended: scan.still_suspended,
      }, null, 2));
      process.exit(0);
    }
  }

  // Tier-22.3: explicit operator-approved activation.
  {
    const trimmed = command.trim();
    const m = trimmed.match(/^\/autonomy\s+requalify\s+activate\s+(\S+)\s*$/i);
    if (m?.[1]) {
      // Tier-∞.1.1 — Governor-aware activation pacing
      {
        const now_iso = fixedNowIso();
        const g = checkGovernor({
          fingerprint: "autonomy.activate",
          autonomy_mode: "READ_ONLY_AUTONOMY",
          now_iso,
        });

        if (g.decision !== "ALLOW") {
          const started_at = now_iso;
          const finished_at = now_iso;

          await persistRun({
            kind: "Throttled",
            execution_id: `throttled_${safeFileIdPart(g.fingerprint)}_${Date.now()}`,
            threadId,
            goal: `Throttled activation: ${trimmed}`,
            dry_run: true,
            started_at,
            finished_at,
            status: "throttled",
            fingerprint: g.fingerprint,
            autonomy_mode,
            autonomy_mode_effective: g.autonomy_mode_effective,
            throttle_reason: g.reason,
            retry_after: g.retry_after,
            error: g.reason,
            scope: "activation",
            policy_denied: g.reason ? { code: g.reason, reason: g.reason } : null,
            steps: [],
          } as any);

          console.log(
            JSON.stringify(
              {
                kind: "Throttled",
                scope: "activation",
                reason: g.reason,
                retry_after: g.retry_after,
              },
              null,
              2
            )
          );
          process.exit(3);
        }
      }

      const targetFingerprint = String(m[1]).trim();
      if (!targetFingerprint) {
        console.log(JSON.stringify({ kind: "NeedInput", fields: ["fingerprint"] }, null, 2));
        process.exit(2);
      }

      if (!isRequalificationEnabled()) {
        console.log(
          JSON.stringify(
            {
              kind: "ActivationDenied",
              fingerprint: targetFingerprint,
              reason: "REQUALIFICATION_DISABLED",
            },
            null,
            2
          )
        );
        process.exit(3);
      }

      const current = readRequalificationState(targetFingerprint);
      if (!current || current.state !== "ELIGIBLE") {
        console.log(
          JSON.stringify(
            {
              kind: "ActivationDenied",
              fingerprint: targetFingerprint,
              reason: "NOT_ELIGIBLE",
            },
            null,
            2
          )
        );
        process.exit(3);
      }

      const activated_at = fixedNowIso();
      writeRequalificationState({
        fingerprint: targetFingerprint,
        state: "ACTIVE",
        cause: "OPERATOR_ACTIVATION",
        since: current.since || activated_at,
        cooldown_until: null,
        activated_at,
      });
      writeRequalificationEvent({
        fingerprint: targetFingerprint,
        at_iso: activated_at,
        event: "OPERATOR_ACTIVATED",
        details: { from: "ELIGIBLE", to: "ACTIVE" },
      });

      console.log(
        JSON.stringify(
          {
            kind: "ActivationApproved",
            fingerprint: targetFingerprint,
            state: "ACTIVE",
            activated_at,
          },
          null,
          2
        )
      );
      process.exit(0);
    }
  }

  // Tier-∞.0: run governor (token bucket + circuit breaker). This must run
  // before any side-effecting DSL handlers so throttled runs produce receipts
  // but do not write execution artifacts.
  {
    const bypass =
      command.startsWith("/approve") ||
      command.startsWith("/rollback") ||
      command.toLowerCase().startsWith("/autonomy requalify");

    if (!bypass && isRunGovernorEnabled()) {
      const now_iso = fixedNowIso();
      const g = runGovernor({
        command: fingerprint_command,
        domain_id: fingerprint_domain_id,
        autonomy_mode: autonomy_mode_effective_confidence,
        now_iso,
      });

      if (g.decision !== "ALLOW") {
        const started_at = now_iso;
        const finished_at = now_iso;

        const prevRequalState = (() => {
          try {
            return isRequalificationEnabled() ? readRequalificationState(g.fingerprint)?.state ?? null : null;
          } catch {
            return null;
          }
        })();

        if (g.reason === "CIRCUIT_OPEN" && isRequalificationEnabled()) {
          const at = now_iso;
          writeRequalificationState({
            fingerprint: g.fingerprint,
            state: "SUSPENDED",
            cause: "CIRCUIT_BREAKER_OPEN",
            since: at,
            cooldown_until: g.retry_after,
          });
          writeRequalificationEvent({
            fingerprint: g.fingerprint,
            at_iso: at,
            event: "GOVERNOR_CIRCUIT_OPEN",
            details: { open_until: g.retry_after },
          });
        }

        const throttledReceipt = {
          kind: "Throttled",
          execution_id: `throttled_${safeFileIdPart(g.fingerprint)}_${Date.now()}`,
          threadId,
          goal: `Throttled: ${command}`,
          dry_run: true,
          started_at,
          finished_at,
          status: "throttled",
          fingerprint: g.fingerprint,
          autonomy_mode,
          autonomy_mode_effective: g.autonomy_mode_effective,
          throttle_reason: g.reason,
          retry_after: g.retry_after,
          error: g.reason,
          policy_denied: g.reason ? { code: g.reason, reason: g.reason } : null,
          steps: [],
        };

        await persistRun(throttledReceipt as any);

        // Tier-16: throttles decay confidence.
        try {
          const before = readConfidence(g.fingerprint).confidence;
          const updated = updateConfidence({ fingerprint: g.fingerprint, signal: "THROTTLE" });
          const after = updated.confidence;

          try {
            emitSpeechBundle({
              fingerprint: g.fingerprint,
              execution_id: throttledReceipt.execution_id,
              now_iso,
              prior_by_fingerprint: priorReceiptByFingerprint,
              current: throttledReceipt,
              autonomy_mode,
              autonomy_mode_effective: g.autonomy_mode_effective,
              s6: {
                confidence: { prev: { confidence: before }, curr: { confidence: after } },
              },
            });
          } catch {
            // ignore
          }
        } catch {
          // ignore
        }

        try {
          if (g.reason === "CIRCUIT_OPEN" && isRequalificationEnabled()) {
            emitSpeechBundle({
              fingerprint: g.fingerprint,
              execution_id: throttledReceipt.execution_id,
              now_iso,
              prior_by_fingerprint: priorReceiptByFingerprint,
              current: throttledReceipt,
              autonomy_mode,
              autonomy_mode_effective: g.autonomy_mode_effective,
              s6: {
                requalification: {
                  prev: { requalification: { fingerprint: g.fingerprint, state: prevRequalState ?? undefined } },
                  curr: { requalification: { fingerprint: g.fingerprint, state: "SUSPENDED", cause: "CIRCUIT_BREAKER_OPEN" } },
                },
              },
            });
          }
        } catch {
          // ignore
        }

        try {
          emitSpeechBundle({
            fingerprint: g.fingerprint,
            execution_id: throttledReceipt.execution_id,
            now_iso,
            prior_by_fingerprint: priorReceiptByFingerprint,
            current: throttledReceipt,
            autonomy_mode,
            autonomy_mode_effective: g.autonomy_mode_effective,
          });
        } catch {
          // ignore
        }

        console.log(
          JSON.stringify(
            {
              kind: "Throttled",
              reason: g.reason,
              retry_after: g.retry_after,
            },
            null,
            2
          )
        );
        process.exit(3);
      }
    }
  }

  // Tier-23 — Confidence decay (quiet + conservative).
  // Only runs when the fingerprint is ACTIVE, and only changes behavior when
  // decay actually triggers (then it blocks execution).
  {
    const bypass =
      command.startsWith("/approve") ||
      command.startsWith("/rollback") ||
      command.toLowerCase().startsWith("/autonomy requalify");

    if (!bypass && isRequalificationEnabled()) {
      const current = readRequalificationState(fingerprint);
      if (current?.state === "ACTIVE") {
        const now_iso = fixedNowIso();
        const check = shouldDecayConfidence({ fingerprint, now_iso });

        if (check.decay) {
          const next = {
            ...current,
            state: "PROBATION" as const,
            cause: "CONFIDENCE_DECAY",
            since: now_iso,
            cooldown_until: null,
            decayed_at: now_iso,
          };
          writeRequalificationState(next);
          writeRequalificationEvent({
            fingerprint,
            at_iso: now_iso,
            event: "CONFIDENCE_DECAY_ACTIVE_TO_PROBATION",
            details: {
              from: "ACTIVE",
              to: "PROBATION",
              reason: check.reason,
              successes_in_window: check.successes_in_window,
              required_successes: check.required_successes,
              horizon_hours: check.horizon_hours,
            },
          });

          writeConfidenceDecayEvent({
            fingerprint,
            from: "ACTIVE",
            to: "PROBATION",
            reason: check.reason,
            timestamp: now_iso,
          });

          const receipt = {
            kind: "ConfidenceDecayed" as const,
            fingerprint,
            from: "ACTIVE" as const,
            to: "PROBATION" as const,
            reason: check.reason,
          };

          await persistRun({
            kind: "ConfidenceDecayed",
            execution_id: `confidence_decayed_${safeFileIdPart(fingerprint)}_${Date.now()}`,
            threadId,
            goal: `Confidence decayed: ${fingerprint} ACTIVE→PROBATION`,
            dry_run: true,
            started_at: now_iso,
            finished_at: now_iso,
            status: "success",
            fingerprint,
            autonomy_mode,
            autonomy_mode_effective: effectiveAutonomyModeForState({ autonomy_mode, state: "PROBATION" }),
            receipt,
            steps: [],
          } as any);

          console.log(JSON.stringify(receipt, null, 2));
          process.exitCode = 4;
          return;
        }
      }
    }
  }

  // Tier-22 enforcement is handled in policy (checkPolicyWithMeta), not runner logic.

  // Tier-16: deny before planning when a fingerprint is suspended.
  {
    const bypass =
      command.startsWith("/approve") ||
      command.startsWith("/rollback") ||
      command.toLowerCase().startsWith("/autonomy requalify") ||
      command.toLowerCase().startsWith("/policy");

    if (!bypass && isRequalificationEnabled()) {
      const state = readRequalificationState(fingerprint);
      if (state?.state === "SUSPENDED") {
        console.log(
          JSON.stringify(
            {
              kind: "PolicyDenied",
              code: "REQUALIFICATION_BLOCKED",
              reason: "requalification state=SUSPENDED blocks execution",
            },
            null,
            2
          )
        );
        process.exitCode = 3;
        return;
      }
    }
  }

  if (command.startsWith("/rollback ")) {
    const target = command.replace("/rollback", "").trim();
    if (!target) {
      console.log(JSON.stringify({ kind: "NeedInput", fields: ["execution_id"] }));
      process.exit(2);
    }

    const prestates = loadPrestateForExecution(target);
    if (prestates.length === 0) {
      console.log(
        JSON.stringify({
          kind: "PolicyDenied",
          code: "NO_PRESTATE_AVAILABLE",
          reason: "rollback requires a prestate snapshot",
        })
      );
      process.exit(3);
    }

    const compensation_plan = {
      kind: "CompensationPlan",
      rolled_back_execution_id: target,
      plan_hash: prestates[0].plan_hash,
      actions: prestates.map((p: any) => ({
        step_id: p.step_id,
        resource: p.resource,
        revert_to_snapshot: p.snapshot,
      })),
    };

    const started_at = new Date().toISOString();
    const finished_at = new Date().toISOString();

    writeRollbackArtifact({
      execution_id: `rollback_${Date.now()}`,
      rolled_back_execution_id: target,
      plan_hash: prestates[0].plan_hash,
      started_at,
      finished_at,
      compensation_plan,
      result: { status: "recorded" },
    });

    // Tier-16: rollbacks decay confidence for the rolled-back fingerprint.
    try {
      const prior = readLastReceiptForExecutionId(target);
      const fp = prior && typeof (prior as any).fingerprint === "string" ? String((prior as any).fingerprint) : "";
      if (fp) {
        const before = readConfidence(fp).confidence;
        const updated = updateConfidence({ fingerprint: fp, signal: "ROLLBACK" });
        const after = updated.confidence;

        try {
          emitSpeechBundle({
            fingerprint: fp,
            execution_id: `rollback_${safeFileIdPart(fp)}_${Date.now()}`,
            now_iso: fixedNowIso(),
            prior_by_fingerprint: null,
            current: { kind: "RollbackRecorded", rolled_back_execution_id: target },
            autonomy_mode,
            autonomy_mode_effective: autonomy_mode,
            s6: {
              confidence: { prev: { confidence: before }, curr: { confidence: after } },
            },
          });
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    console.log(
      JSON.stringify({
        kind: "RollbackRecorded",
        rolled_back_execution_id: target,
        plan_hash: prestates[0].plan_hash,
      })
    );
    process.exit(0);
  }

  // Tier 5.3: local approval command. No re-planning, no agents.
  const approve = parseApproveCommand(command);
  if (approve) {
    const lastReceipt = readLastReceiptForExecutionId(approve.execution_id);
    if (!lastReceipt) {
      throw new Error(`No receipt found for execution_id '${approve.execution_id}'`);
    }
    const state = readApprovalState(approve.execution_id);
    const metaCommand =
      typeof (state as any)?.command === "string" && String((state as any).command).trim()
        ? String((state as any).command)
        : command;

    const approvalDomainId =
      typeof (state as any)?.domain_id === "string" && String((state as any).domain_id).trim()
        ? String((state as any).domain_id)
        : domain_id;

    // Tier-21: domain-scoped approval role enforcement (only when a domain context exists).
    if (approvalDomainId) {
      const operator_id = getOperatorId(process.env);
      const ok = operatorHasRole({ operator_id, domain_id: approvalDomainId, role: "approver" });
      if (!ok) {
        console.log(
          JSON.stringify(
            {
              kind: "PolicyDenied",
              code: "OPERATOR_NOT_AUTHORIZED_FOR_DOMAIN",
              reason: "operator lacks approver role for this domain",
              details: {
                operator_id,
                domain_id: approvalDomainId,
              },
            },
            null,
            2
          )
        );
        process.exit(3);
      }
    }

    if (lastReceipt.status !== "awaiting_approval") {
      const savedPlan: any = (state as any)?.plan;
      const steps =
        savedPlan?.steps ??
        savedPlan?.phases?.flatMap((p: any) => p.steps) ??
        [];
      const threadIdForKey =
        typeof savedPlan?.threadId === "string" && savedPlan.threadId
          ? savedPlan.threadId
          : typeof lastReceipt?.threadId === "string" && lastReceipt.threadId
            ? lastReceipt.threadId
            : "";
      const planHashForKey = typeof (state as any)?.plan_hash === "string" ? (state as any).plan_hash : "";

      const writeSteps = steps.filter((s: any) => s?.action === "notion.live.write");
      if (writeSteps.length && threadIdForKey && planHashForKey) {
        const hits: Array<{ step_id: string; idempotency_key: string }> = [];
        let allExecuted = true;
        for (const s of writeSteps) {
          const key = ensureIdempotencyKey(s, planHashForKey, threadIdForKey);
          if (!key) {
            allExecuted = false;
            continue;
          }
          const rec = getIdempotencyRecord(key);
          if (rec) {
            hits.push({ step_id: String(s.step_id ?? ""), idempotency_key: key });
          } else {
            allExecuted = false;
          }
        }

        if (allExecuted && hits.length) {
          console.log(
            JSON.stringify({
              kind: "AlreadyExecuted",
              code: "IDEMPOTENCY_HIT",
              execution_id: approve.execution_id,
              plan_hash: planHashForKey,
              steps: hits,
            })
          );
          process.exit(0);
        }
      }

      // General idempotency: if already completed successfully (and not a Tier-10.5 idempotency hit),
      // emit the existing receipt.
      if (lastReceipt.status === "success") {
        console.log(JSON.stringify(lastReceipt, null, 2));
        process.exit(0);
      }

      throw new Error(
        `Cannot approve execution_id '${approve.execution_id}': status is '${lastReceipt.status}', expected 'awaiting_approval'`
      );
    }

    const prestates = loadPrestateForExecution(approve.execution_id);
    if (prestates.length > 0) {
      const preHash = prestates[0]?.plan_hash;
      const curHash = state?.plan_hash;

      if (preHash && curHash && preHash !== curHash) {
        console.log(
          JSON.stringify({
            kind: "NeedApprovalAgain",
            code: "PRESTATE_MISMATCH",
            reason: "resource state changed since approval; re-approval required",
            details: {
              prestate_plan_hash: preHash,
              approval_plan_hash: curHash,
            },
          })
        );
        process.exit(4);
      }
    }
    // Re-check policy with explicit approval token.
    const nowIso = () => new Date().toISOString();
    const approvedAt = nowIso();

    const plan_hash = state.plan_hash;
    const plan: any = state.plan;
    if (typeof plan_hash === "string" && plan_hash) {
      (plan as any).plan_hash = plan_hash;
    }

    // Tier-10.6: batch approvals (one approval executes multiple pending steps)
    const pending = Array.isArray((state as any)?.pending_step_ids)
      ? ((state as any).pending_step_ids as any[]).map(String).filter(Boolean)
      : [];
    if (pending.length) {
      const threadIdForKey = typeof plan?.threadId === "string" ? plan.threadId : "";
      const priorPrestates = (state as any)?.prestates;

      const executedHits: Array<{ step_id: string; idempotency_key: string }> = [];
      const stepsToExecute: any[] = [];

      // Idempotency first: do not even do live checks for already-executed steps.
      for (const step_id of pending) {
        const step = findStepInPlan(plan, step_id);
        if (!step) throw new Error(`step not found: ${step_id}`);

        const key = ensureIdempotencyKey(step, plan_hash, threadIdForKey);
        if (key && getIdempotencyRecord(key)) {
          executedHits.push({ step_id, idempotency_key: key });
          continue;
        }
        stepsToExecute.push(step);
      }

      // Fresh prestate + guard checks for each pending step (Tier-9.1 + Tier-10.4)
      for (const step of stepsToExecute) {
        const step_id = String(step.step_id ?? "");
        const fresh = await fetchLivePrestateForStep(step);
        if (fresh !== null) {
          const freshFp = stableFingerprint(fresh);
          const priorFp =
            typeof priorPrestates?.[step_id]?.fingerprint === "string"
              ? String(priorPrestates[step_id].fingerprint)
              : typeof step?.prestate_fingerprint === "string"
                ? String(step.prestate_fingerprint)
                : null;

          if (priorFp && freshFp !== priorFp) {
            console.log(
              JSON.stringify({
                kind: "NeedApprovalAgain",
                code: "PRESTATE_MISMATCH",
                step_id,
                details: {
                  prior_fingerprint: priorFp,
                  fresh_fingerprint: freshFp,
                },
              })
            );
            process.exit(4);
          }

          const guards = (step as any)?.guards;
          if (Array.isArray(guards) && guards.length) {
            const gc = evaluateGuards(fresh, guards);
            if (!gc.ok) {
              console.log(
                JSON.stringify({
                  kind: "NeedApprovalAgain",
                  code: "GUARD_FAILED_PRE_EXEC",
                  step_id,
                  details: gc.failed,
                })
              );
              process.exit(4);
            }
          }
        }
      }

      if (stepsToExecute.length === 0 && executedHits.length) {
        console.log(
          JSON.stringify({
            kind: "AlreadyExecuted",
            code: "IDEMPOTENCY_HIT",
            execution_id: approve.execution_id,
            plan_hash,
            steps: executedHits,
          })
        );
        process.exit(0);
      }

      const approvedAt = nowIso();
      for (const s of stepsToExecute) {
        if (s?.action === "notion.live.write") {
          s.approved_at = approvedAt;
        }
      }

      const execPlan: any = {
        ...plan,
        phases: undefined,
        steps: stepsToExecute,
        plan_hash,
      };

      const policy = checkPolicyWithMeta(execPlan, process.env, new Date(), {
        execution_id: String(execPlan.execution_id),
        approved_execution_id: String(execPlan.execution_id),
        command: metaCommand,
        domain_id: approvalDomainId ?? undefined,
      });
      if ((policy as any).requireApproval) {
        throw new Error("Approval unexpectedly still required after /approve");
      }
      if (!(policy as any).allowed) {
        const denied = (policy as any).denied;
        const now = nowIso();
        await persistRun({
          execution_id: execPlan.execution_id,
          threadId: execPlan.threadId,
          goal: execPlan.goal,
          dry_run: execPlan.dry_run,
          started_at: typeof state.started_at === "string" ? state.started_at : now,
          finished_at: now,
          status: "denied",
          error: denied?.reason,
          agent_versions: execPlan.agent_versions,
          policy_denied: denied ? { code: denied.code, reason: denied.reason } : null,
          steps: [],
        } as any);

        console.log(JSON.stringify(denied, null, 2));
        process.exit(3);
      }

      const runLog = await executePlan(execPlan);
      // Persist the derived fingerprint so downstream governance (Tier-23)
      // can observe recent successful activity for this autonomy scope.
      (runLog as any).fingerprint = fingerprint;
      (runLog as any).autonomy_mode = autonomy_mode;
      (runLog as any).autonomy_mode_effective = autonomy_mode;
      (runLog as any).receipt_hash = computeReceiptHashForLog(runLog as any);

      await persistRun(runLog as any);

      // Tier-22.2: count successful runs while in PROBATION and recommend ELIGIBLE when threshold met.
      if (runLog.status === "success") {
        const planSteps = Array.isArray((execPlan as any)?.phases)
          ? (execPlan as any).phases.flatMap((p: any) => (Array.isArray(p?.steps) ? p.steps : []))
          : (Array.isArray((execPlan as any)?.steps) ? (execPlan as any).steps : []);
        await maybeRecordProbationSuccessAndRecommend({
          fingerprint,
          now_iso: fixedNowIso(),
          threadId,
          autonomy_mode,
          autonomy_mode_effective: (runLog as any).autonomy_mode_effective ?? autonomy_mode,
          run_status: String(runLog.status),
          policy_denied: Boolean((runLog as any).policy_denied),
          throttled: String(runLog.status) === "throttled",
          approval_required: Boolean((runLog as any).approval_required),
          steps: planSteps,
        });
      }

      if (runLog.status !== "success") {
        console.log(JSON.stringify(runLog, null, 2));
        process.exitCode = 1;
        return;
      }

      console.log(
        JSON.stringify({
          kind: "BatchApprovedExecuted",
          execution_id: approve.execution_id,
          plan_hash,
          executed_step_ids: stepsToExecute.map((s: any) => String(s.step_id ?? "")).filter(Boolean),
        })
      );
      process.exit(0);
    }

    // Tier-10.5: idempotency short-circuit before any live checks.
    {
      const savedPlan: any = (state as any)?.plan;
      const steps =
        savedPlan?.steps ??
        savedPlan?.phases?.flatMap((p: any) => p.steps) ??
        [];
      const threadIdForKey = typeof savedPlan?.threadId === "string" && savedPlan.threadId ? savedPlan.threadId : "";
      const writeSteps = steps.filter((s: any) => s?.action === "notion.live.write");

      if (writeSteps.length && threadIdForKey && typeof plan_hash === "string" && plan_hash) {
        const hits: Array<{ step_id: string; idempotency_key: string }> = [];
        let allExecuted = true;
        for (const s of writeSteps) {
          const key = ensureIdempotencyKey(s, plan_hash, threadIdForKey);
          if (!key) {
            allExecuted = false;
            continue;
          }
          const rec = getIdempotencyRecord(key);
          if (rec) {
            hits.push({ step_id: String(s.step_id ?? ""), idempotency_key: key });
          } else {
            allExecuted = false;
          }
        }

        if (allExecuted && hits.length) {
          console.log(
            JSON.stringify({
              kind: "AlreadyExecuted",
              code: "IDEMPOTENCY_HIT",
              execution_id: approve.execution_id,
              plan_hash,
              steps: hits,
            })
          );
          process.exit(0);
        }
      }
    }

    // Tier-10.2: stale-prestate detection using LIVE recheck
    if (process.env.NOTION_LIVE_APPROVE_RECHECK === "1") {
      const savedPlan: any = (state as any)?.plan;
      const steps =
        savedPlan?.steps ??
        savedPlan?.phases?.flatMap((p: any) => p.steps) ??
        [];

      for (const s of steps) {
        if (s?.action === "notion.live.write") {
          // Tier-10.5: idempotency check first; if already executed, skip guard + fingerprint recheck.
          const key = ensureIdempotencyKey(s, plan_hash, savedPlan?.threadId ?? "");
          if (key && getIdempotencyRecord(key)) {
            continue;
          }
          const path = s.notion_path_prestate || s.notion_path;
          if (typeof path !== "string" || !path.trim()) continue;
          const live = await notionLiveGet(path);

          // Tier-10.4: guard evaluation immediately pre-exec (anti-stale safety)
          const guards = (s as any)?.guards;
          if (Array.isArray(guards) && guards.length) {
            const guardCheck = evaluateGuards(live.redacted, guards);
            if (!guardCheck.ok) {
              console.log(
                JSON.stringify({
                  kind: "NeedApprovalAgain",
                  code: "GUARD_FAILED_PRE_EXEC",
                  details: guardCheck.failed,
                })
              );
              process.exit(4);
            }
          }

          const liveFp = stableFingerprint(live.redacted);
          const storedFp = s.prestate_fingerprint;

          if (storedFp && liveFp !== storedFp) {
            console.log(
              JSON.stringify({
                kind: "NeedApprovalAgain",
                code: "NOTION_LIVE_PRESTATE_CHANGED",
                reason: "Notion page changed since approval; re-approval required",
                details: { stored: storedFp, live: liveFp },
              })
            );
            process.exit(4);
          }
        }
      }
    }

    const phases = Array.isArray(plan?.phases) ? plan.phases : null;

    const artifacts: any = state.artifacts ?? {};
    const resolvedCapsAll: Record<string, string> = state.resolved_capabilities ?? {};
    const allStepLogs: any[] = Array.isArray(state.steps) ? state.steps : [];
    const phasesPlanned: string[] = Array.isArray(state.phases_planned) ? state.phases_planned : [];
    const phasesExecuted: string[] = Array.isArray(state.phases_executed) ? state.phases_executed : [];
    const overallStarted = typeof state.started_at === "string" ? state.started_at : nowIso();

    const autonomyMode = process.env.AUTONOMY_MODE || 'OFF';
    if (autonomyMode !== 'OFF') {
      const denyRuns = enforceMaxRunsPerDay();
      if (denyRuns) {
        console.log(JSON.stringify(denyRuns));
        process.exitCode = 3;
        return;
      }
    }

    if (phases && phasesPlanned.length) {
      const totalStepsPlanned = phases.reduce((acc: number, p: any) => acc + (Array.isArray(p?.steps) ? p.steps.length : 0), 0);

      let resumeIndex = 0;
      if (state.next_phase_id) {
        resumeIndex = phasesPlanned.indexOf(String(state.next_phase_id));
        if (resumeIndex < 0) resumeIndex = phasesExecuted.length;
      } else {
        resumeIndex = phasesExecuted.length;
      }

      for (let i = resumeIndex; i < phases.length; i += 1) {
        const phase = phases[i];
        const phaseId = String(phase.phase_id);

        const executedSteps = materializePhaseSteps({
          phase,
          artifacts: Object.fromEntries(Object.entries(artifacts).map(([k, v]: any) => [k, { outputs: v.outputs }])) as any,
        });
        const phasePlan: any = {
          ...plan,
          phases: undefined,
          required_capabilities: phase.required_capabilities,
          steps: executedSteps,
        };

        const policy = checkPolicyWithMeta(phasePlan, process.env, new Date(), {
          phase_id: phaseId,
          phases_count: phasesPlanned.length,
          total_steps_planned: totalStepsPlanned,
          execution_id: String(plan.execution_id),
          approved_execution_id: String(plan.execution_id),
          command: metaCommand,
          domain_id: approvalDomainId ?? undefined,
        });

        if ((policy as any).requireApproval) {
          throw new Error("Approval unexpectedly still required after /approve");
        }
        if (!(policy as any).allowed) {
          const denied = (policy as any).denied;
          const now = nowIso();
          await persistRun({
            execution_id: plan.execution_id,
            threadId: plan.threadId,
            goal: plan.goal,
            dry_run: plan.dry_run,
            started_at: overallStarted,
            finished_at: now,
            status: "denied",
            error: denied?.reason,
            agent_versions: plan.agent_versions,
            resolved_capabilities: resolvedCapsAll,
            phases_planned: phasesPlanned,
            phases_executed: phasesExecuted,
            denied_phase: phaseId,
            artifacts,
            policy_denied: denied ? { code: denied.code, reason: denied.reason } : null,
            steps: allStepLogs,
          } as any);

          console.log(JSON.stringify(denied, null, 2));
          process.exitCode = 3;
          return;
        }

        const phaseRun = await executePlan(phasePlan);
        const prefixedSteps = phaseRun.steps.map((s: any) => ({ ...s, step_id: `${phaseId}:${s.step_id}` }));
        allStepLogs.push(...prefixedSteps);

        if (phaseRun.status !== "success") {
          const now = nowIso();
          const failed = {
            ...phaseRun,
            started_at: overallStarted,
            finished_at: now,
            status: "failed" as const,
            error: phaseRun.error ?? `phase '${phaseId}' failed`,
            failed_step: phaseRun.failed_step ? `${phaseId}:${phaseRun.failed_step}` : undefined,
            steps: allStepLogs,
            agent_versions: plan.agent_versions,
            resolved_capabilities: resolvedCapsAll,
            phases_planned: phasesPlanned,
            phases_executed: phasesExecuted,
            artifacts,
          };
          (failed as any).receipt_hash = computeReceiptHashForLog(failed);
          await persistRun(failed as any);
          console.log(JSON.stringify(failed, null, 2));
          process.exitCode = 1;
          return;
        }

        const extracted = extractPhaseArtifacts({ phase, phaseRun, executedSteps });
        artifacts[phaseId] = {
          outputs: extracted.outputs,
          files: extracted.files,
          metadata: { started_at: phaseRun.started_at, finished_at: phaseRun.finished_at ?? phaseRun.started_at },
        };

        phasesExecuted.push(phaseId);
      }

      const finishedAt = nowIso();
      const overall = {
        execution_id: plan.execution_id,
        threadId: plan.threadId,
        goal: plan.goal,
        dry_run: plan.dry_run,
        plan_hash,
        started_at: overallStarted,
        finished_at: finishedAt,
        status: "success" as const,
        steps: allStepLogs,
        agent_versions: plan.agent_versions,
        resolved_capabilities: resolvedCapsAll,
        phases_planned: phasesPlanned,
        phases_executed: phasesExecuted,
        artifacts,
      };
      (overall as any).fingerprint = fingerprint;
      (overall as any).autonomy_mode = autonomy_mode;
      (overall as any).autonomy_mode_effective = autonomy_mode;
      (overall as any).receipt_hash = computeReceiptHashForLog(overall);

      // Tier 6.x artifacts should also be emitted on /approve (resume path).
      // Tier 6.1 requirement: write artifacts only after approved execution.
      if (overall.status === "success") {
        for (const s of overall.steps) {
          if (typeof s?.action === "string" && s.action.startsWith("notion.read.") && s.status === "success") {
            writeNotionReadArtifact({
              execution_id: overall.execution_id,
              threadId: overall.threadId,
              action: s.action,
              step_id: s.step_id,
              requested_at: s.started_at,
              finished_at: s.finished_at ?? s.started_at,
              response: s.response,
            });
          }
          if (s?.action === "notion.live.read" && s.status === "success") {
            const notion_path = new URL(String(s.url)).pathname;
            const file = writeNotionLiveReadArtifact({
              execution_id: overall.execution_id,
              step_id: s.step_id,
              notion_path,
              http_status: typeof s.http_status === "number" ? s.http_status : 0,
              response: s.response,
            });

            // Surface emitted artifact paths inside phase artifacts for easy auditing.
            // Step ids are phase-scoped as: "<phase_id>:<step_id>".
            const phaseId = typeof s.step_id === "string" && s.step_id.includes(":")
              ? s.step_id.split(":")[0]
              : null;
            if (phaseId && artifacts[phaseId]) {
              if (!Array.isArray(artifacts[phaseId].files)) artifacts[phaseId].files = [];
              artifacts[phaseId].files!.push(file);
            }
          }
          if (typeof s?.action === "string" && s.action.startsWith("notion.write.") && s.status === "success") {
            writeNotionWriteArtifact({
              execution_id: overall.execution_id,
              threadId: overall.threadId,
              action: s.action,
              step_id: s.step_id,
              approved_at: approvedAt,
              requested_at: s.started_at,
              finished_at: s.finished_at ?? s.started_at,
              request_payload: null,
              response: s.response,
            });
          }
        }
      }

      await persistRun(overall as any);
      console.log(JSON.stringify(overall, null, 2));
      return;
    }

    // Legacy resume (no phases): run from start after approval.
    if (Array.isArray((plan as any)?.steps)) {
      for (const s of (plan as any).steps) {
        if (s?.action === "notion.live.write") {
          s.approved_at = approvedAt;
        }
      }
    }
    const policy = checkPolicyWithMeta(plan, process.env, new Date(), {
      execution_id: String(plan.execution_id),
      approved_execution_id: String(plan.execution_id),
      command: metaCommand,
      domain_id: approvalDomainId ?? undefined,
    });
    if ((policy as any).requireApproval) {
      throw new Error("Approval unexpectedly still required after /approve");
    }
    if (!(policy as any).allowed) {
      const denied = (policy as any).denied;
      const now = nowIso();
      await persistRun({
        execution_id: plan.execution_id,
        threadId: plan.threadId,
        goal: plan.goal,
        dry_run: plan.dry_run,
        started_at: overallStarted,
        finished_at: now,
        status: "denied",
        error: denied?.reason,
        agent_versions: plan.agent_versions,
        policy_denied: denied ? { code: denied.code, reason: denied.reason } : null,
        steps: [],
      } as any);

      console.log(JSON.stringify(denied, null, 2));
      process.exitCode = 3;
      return;
    }

    const runLog = await executePlan(plan);
    (runLog as any).receipt_hash = computeReceiptHashForLog(runLog);

    // Tier 6.x artifacts should also be emitted on /approve (resume path).
    // Tier 6.1 requirement: write artifacts only after approved execution.
    if (runLog.status === "success") {
      for (const s of runLog.steps) {
        if (typeof s?.action === "string" && s.action.startsWith("notion.read.") && s.status === "success") {
          writeNotionReadArtifact({
            execution_id: runLog.execution_id,
            threadId: runLog.threadId,
            action: s.action,
            step_id: s.step_id,
            requested_at: s.started_at,
            finished_at: s.finished_at ?? s.started_at,
            response: s.response,
          });
        }
        if (s?.action === "notion.live.read" && s.status === "success") {
          const notion_path = new URL(String(s.url)).pathname;
          const file = writeNotionLiveReadArtifact({
            execution_id: runLog.execution_id,
            step_id: s.step_id,
            notion_path,
            http_status: typeof s.http_status === "number" ? s.http_status : 0,
            response: s.response,
          });

          const phaseId = typeof s.step_id === "string" && s.step_id.includes(":")
            ? s.step_id.split(":")[0]
            : null;
          if (phaseId) {
            const anyLog = runLog as any;
            if (!anyLog.artifacts) anyLog.artifacts = {};
            if (!anyLog.artifacts[phaseId]) {
              anyLog.artifacts[phaseId] = { outputs: {}, files: [], metadata: { started_at: runLog.started_at, finished_at: runLog.finished_at ?? runLog.started_at } };
            }
            if (!Array.isArray(anyLog.artifacts[phaseId].files)) anyLog.artifacts[phaseId].files = [];
            anyLog.artifacts[phaseId].files.push(file);
          }
        }
        if (typeof s?.action === "string" && s.action.startsWith("notion.write.") && s.status === "success") {
          const planStep = Array.isArray((plan as any)?.steps)
            ? (plan as any).steps.find((ps: any) => ps?.step_id === s.step_id)
            : undefined;
          writeNotionWriteArtifact({
            execution_id: runLog.execution_id,
            threadId: runLog.threadId,
            action: s.action,
            step_id: s.step_id,
            approved_at: approvedAt,
            requested_at: s.started_at,
            finished_at: s.finished_at ?? s.started_at,
            request_payload: planStep?.payload ?? null,
            response: s.response,
          });
        }
      }
    }

    const autonomyModeAfter = process.env.AUTONOMY_MODE || 'OFF';
    if (autonomyModeAfter === 'READ_ONLY_AUTONOMY' && runLog.status === 'success') {
      writeAutonomySummary({
        execution_id: runLog.execution_id,
        mode: autonomyModeAfter,
        steps_executed: (runLog?.steps || []).map((s: any) => s.step_id).filter(Boolean),
        started_at: runLog.started_at,
        finished_at: runLog.finished_at,
      });
    }

    await persistRun(runLog as any);

    // Tier-22.2: count successful runs while in PROBATION and recommend ELIGIBLE when threshold met.
    if (runLog.status === "success") {
      const planSteps = Array.isArray((plan as any)?.phases)
        ? (plan as any).phases.flatMap((p: any) => (Array.isArray(p?.steps) ? p.steps : []))
        : (Array.isArray((plan as any)?.steps) ? (plan as any).steps : []);
      await maybeRecordProbationSuccessAndRecommend({
        fingerprint,
        now_iso: fixedNowIso(),
        threadId,
        autonomy_mode,
        autonomy_mode_effective: (runLog as any).autonomy_mode_effective ?? autonomy_mode,
        run_status: String(runLog.status),
        policy_denied: Boolean((runLog as any).policy_denied),
        throttled: String(runLog.status) === "throttled",
        approval_required: Boolean((runLog as any).approval_required),
        steps: planSteps,
      });
    }
    try {
      emitSpeechBundle({
        fingerprint,
        execution_id: String((runLog as any).execution_id ?? ""),
        now_iso: fixedNowIso(),
        prior_by_fingerprint: priorReceiptByFingerprint,
        current: runLog,
        autonomy_mode,
        autonomy_mode_effective: String((runLog as any).autonomy_mode_effective ?? autonomy_mode),
      });
    } catch {
      // ignore
    }

    console.log(JSON.stringify(runLog, null, 2));
    return;
  }

  let plannerOut: any | null = null;
  let forwardedCommand: string = command;

  const templateCmd = parseTemplateCommand(command);
  if (templateCmd) {
    const registry = loadTemplateRegistry();
    const names = Object.keys(registry.templates).sort((a, b) => a.localeCompare(b));

    if (templateCmd.kind === "TemplateList") {
      console.log(JSON.stringify({ kind: "TemplateList", templates: names }, null, 2));
      return;
    }

    if (templateCmd.kind === "TemplateShow") {
      const entry = registry.templates[templateCmd.name];
      if (!entry) {
        throw new Error(`Unknown template: ${templateCmd.name}`);
      }
      console.log(
        JSON.stringify(
          {
            kind: "TemplateShow",
            name: templateCmd.name,
            description: entry.description ?? null,
            plan: entry.plan,
          },
          null,
          2
        )
      );
      return;
    }

    const entry = registry.templates[templateCmd.name];
    if (!entry) {
      throw new Error(`Unknown template: ${templateCmd.name}`);
    }

    const parsedArgs = extractJsonFromText(templateCmd.argsText);
    if (!isRecord(parsedArgs)) {
      throw new Error("/template run args must be a JSON object");
    }

    const execution_id = deriveTemplateExecutionId(templateCmd.name, parsedArgs);
    const vars: Record<string, string> = {
      execution_id,
      threadId,
    };
    for (const [k, v] of Object.entries(parsedArgs)) {
      vars[k] = typeof v === "string" ? v : String(v ?? "");
    }

    const materialized = substituteTemplateVars(entry.plan, vars);
    plannerOut = PlannerOutputSchema.parse(materialized);
    forwardedCommand = command;
  }

  // Local read-only fast-path: avoid requiring validator/planner webhooks for live Notion DB reads.
  // Matches docs/operator-readonly-guide.md usage.
  if (!plannerOut) {
    const notionLiveDb = parseNotionLiveDbCommand(command);
    if (notionLiveDb) {
      const execution_id = `tier6_notion_live_db_${sanitizeExecutionIdPart(notionLiveDb.database_id)}_${Date.now()}`;
      const plan = {
        kind: "ExecutionPlan",
        execution_id,
        threadId,
        dry_run: false,
        goal: `Notion live read (database): ${notionLiveDb.database_id}`,
        agent_versions: { validator: "1.2.0", planner: "1.1.3" },
        assumptions: ["Generated by local CLI fast-path"],
        required_secrets: [
          { name: "NOTION_TOKEN", source: "env", notes: "Notion API token for live reads" },
        ],
        phases: [
          {
            phase_id: "read",
            required_capabilities: ["notion.read.database"],
            steps: [
              {
                step_id: "read-db",
                action: "notion.live.read",
                adapter: "NotionAdapter",
                method: "GET",
                read_only: true,
                url: `https://api.notion.com/v1/databases/${notionLiveDb.database_id}`,
                notion_path: `/v1/databases/${notionLiveDb.database_id}`,
                headers: { "Cache-Control": "no-store" },
                expects: { http_status: [200], json_paths_present: ["id", "properties"] },
                idempotency_key: null,
              },
            ],
          },
        ],
      };

      plannerOut = PlannerOutputSchema.parse(plan);
      forwardedCommand = command;
    }
  }

  if (!plannerOut) {
    const validationUrl = mustEnv("VALIDATION_WEBHOOK_URL");
    const plannerUrl = mustEnv("PLANNER_WEBHOOK_URL");

    const validation = await sendMessageTurboCached({
      webhookUrl: validationUrl,
      threadId,
      // Locked transport: commands are interpreted from message text
      message: assembleSystemPrompt({ arch, modes, turbosparse: turbosparseMeta, command }),
      kind: "validator",
      turbosparse: turbosparseMeta,
    });

    const validatedRaw = parseJsonFromAgentResponse(validation.response);
    const validatedOut = ValidatorOutputSchema.parse(validatedRaw);

    if (validatedOut.kind === "NeedInput") {
      if (!validatedOut.threadId) {
        obsWarnOrThrow(
          "OBS-THREADID-INHERIT",
          "validator.threadId missing → inherited from transport"
        );
      }
      console.log(validatedOut.question);
      if (validatedOut.missing?.length) {
        console.log(`Missing: ${validatedOut.missing.join(", ")}`);
      }
      process.exitCode = 2;
      return;
    }

    const validated = ValidatedCommandSchema.parse(validatedOut);

    if (validated.kind !== "ValidatedCommand") {
      throw new Error("Validation agent returned invalid kind");
    }
    if (!validated.threadId) {
      obsWarnOrThrow(
        "OBS-THREADID-INHERIT",
        "validator.threadId missing → inherited from transport"
      );
    }
    if (validated.threadId && validated.threadId !== threadId) {
      throw new Error("Validation agent threadId mismatch");
    }
    if (!validated.allowed) {
      const reason = validated.denial_reason ?? "Command denied by validation agent";
      const required = validated.required_inputs?.length
        ? ` Required: ${validated.required_inputs.join(", ")}`
        : "";

      // Optional, append-only governance scribe.
      // If validation denies, record a SILENT_HALT marker (no other writes).
      try {
        appendSilentHaltLedgerLine();
      } catch {
        // ignore
      }

      throw new Error(`${reason}${required}`);
    }

    // Optional, append-only governance scribe.
    // Runs after validation approval and before any planner/execution.
    try {
      maybeAppendModeTransitionLedger();
    } catch {
      // ignore
    }

    forwardedCommand =
      typeof validated.forwarded_command === "string" && validated.forwarded_command.trim()
        ? validated.forwarded_command.trim()
        : command;

    const plannerOverrideJson = process.env.PLANNER_OVERRIDE_JSON;
    const allowPlannerOverride = process.env.ALLOW_PLANNER_OVERRIDE === "1";

    plannerOut = await (async () => {
      if (plannerOverrideJson && allowPlannerOverride) {
        const raw = JSON.parse(plannerOverrideJson);
        return PlannerOutputSchema.parse(raw);
      }

      const planned = await sendMessageTurboCached({
        webhookUrl: plannerUrl,
        threadId,
        // Locked transport: commands are interpreted from message text
        message: assembleSystemPrompt({ arch, modes, turbosparse: turbosparseMeta, command: forwardedCommand }),
        kind: "planner",
        turbosparse: turbosparseMeta,
      });

      // Retry-once policy for planner output variability (disabled in strict mode).
      try {
        const plannerRaw = parseJsonFromAgentResponse(planned.response);
        return PlannerOutputSchema.parse(plannerRaw);
      } catch (e) {
        if (isStrictAgentOutputEnabled()) throw e;

        obsWarn(
          "OBS-PLANNER-RETRY",
          "planner parse/schema failure → retrying once"
        );

        const firstRawText =
          typeof planned?.response?.response === "string" ? planned.response.response : "";

        return retryPlannerOnce({
          plannerUrl,
          threadId,
          command: forwardedCommand,
          arch,
          modes,
          turbosparse: turbosparseMeta,
          firstError: e,
          firstRawText,
        });
      }
    })();
  }

  if (plannerOut.kind === "NeedInput" && !plannerOut.threadId) {
    obsWarnOrThrow(
      "OBS-THREADID-INHERIT",
      "planner.threadId missing → inherited from transport"
    );
  }

  if (plannerOut.kind === "NeedInput") {
    // CLI-friendly: emit the question and exit non-zero so callers can handle it.
    console.log(plannerOut.question);
    if (plannerOut.missing?.length) {
      console.log(`Missing: ${plannerOut.missing.join(", ")}`);
    }
    process.exitCode = 2;
    return;
  }

  // Watch Mode manifest (informational; not authoritative): make the run self-describing.
  try {
    if (process.env.WATCH_MODE === "1") {
      appendRunLedgerLine(plannerOut.execution_id, {
        ts: new Date().toISOString(),
        kind: "watch_mode",
        stage: "manifest",
        enabled: true,
        phases: normalizedWatchPhases(),
        step_screenshots: process.env.WATCH_STEP_SCREENSHOTS === "1",
        systems: typeof process.env.WATCH_SYSTEMS === "string" ? process.env.WATCH_SYSTEMS : null,
        browser: typeof process.env.PLAYWRIGHT_BROWSER === "string" ? process.env.PLAYWRIGHT_BROWSER : null,
        headless: typeof process.env.PLAYWRIGHT_HEADLESS === "string" ? process.env.PLAYWRIGHT_HEADLESS : null,
        slow_mo: typeof process.env.PLAYWRIGHT_SLOW_MO === "string" ? process.env.PLAYWRIGHT_SLOW_MO : null,
      });
    }
  } catch {
    // ignore
  }

  // Optional UI tour after plan is produced (still before any execution).
  try {
    await maybeWatchTour("preplan", plannerOut.execution_id, "preplan");
  } catch {
    // ignore
  }

  // Tier 8.0: plan-wide policy budgets (deny before execution).
  {
    const denied = checkPlanPolicy(plannerOut);
    if (denied) {
      const now = new Date().toISOString();
      await persistRun({
        execution_id: plannerOut.execution_id,
        threadId: plannerOut.threadId,
        goal: plannerOut.goal,
        dry_run: plannerOut.dry_run,
        started_at: now,
        finished_at: now,
        status: "denied",
        error: denied.reason,
        agent_versions: plannerOut.agent_versions,
        policy_denied: { code: denied.code, reason: denied.reason },
        steps: [],
      } as any);

      console.log(JSON.stringify(denied, null, 2));
      process.exitCode = 3;
      return;
    }
  }

  // Tier 4: Agent registry + version pinning (reproducibility layer).
  // Planner must emit pinned versions; CLI enforces they match agents/registry.json.
  // Tier 5.1: registry is now capability-based (no hard-coded agent names).
  const registry = loadAgentRegistry();

  const allowMismatch = process.env.ALLOW_AGENT_VERSION_MISMATCH === "1";

  const normalizeVersion = (v: string) => {
    const s = String(v ?? "").trim();
    const idx = s.lastIndexOf("@");
    return idx >= 0 ? s.slice(idx + 1) : s;
  };

  const expectedValidator = findAgentsProvidingCapability(registry, "command.validate");
  const expectedPlanner = findAgentsProvidingCapability(registry, "plan.generate");

  if (expectedValidator.length !== 1 || expectedPlanner.length !== 1) {
    const denied = {
      kind: "PolicyDenied" as const,
      code: "POLICY_REGISTRY_INVALID",
      reason: "agents/registry.json must have exactly one provider for command.validate and plan.generate",
    };

    const now = new Date().toISOString();
    await persistRun({
      execution_id: plannerOut.execution_id,
      threadId: plannerOut.threadId,
      goal: plannerOut.goal,
      dry_run: plannerOut.dry_run,
      started_at: now,
      finished_at: now,
      status: "denied",
      error: denied.reason,
      agent_versions: plannerOut.agent_versions,
      policy_denied: { code: denied.code, reason: denied.reason },
      steps: [],
    });

    console.log(JSON.stringify({ ...denied, approval_required: false, executed: false }, null, 2));
    process.exitCode = 3;
    return;
  }

  const validatorPinned = normalizeVersion(plannerOut.agent_versions.validator);
  const plannerPinned = normalizeVersion(plannerOut.agent_versions.planner);
  const validatorRegistry = normalizeVersion(expectedValidator[0]!.version);
  const plannerRegistry = normalizeVersion(expectedPlanner[0]!.version);

  const mismatch = validatorPinned !== validatorRegistry || plannerPinned !== plannerRegistry;
  if (mismatch && !allowMismatch) {
    const denied = {
      kind: "PolicyDenied" as const,
      code: "POLICY_AGENT_VERSION_MISMATCH",
      reason: `agent_versions mismatch (plan: validator=${plannerOut.agent_versions.validator}, planner=${plannerOut.agent_versions.planner}; registry: validator=${expectedValidator[0]!.name}@${expectedValidator[0]!.version}, planner=${expectedPlanner[0]!.name}@${expectedPlanner[0]!.version})`,
    };

    const now = new Date().toISOString();
    await persistRun({
      execution_id: plannerOut.execution_id,
      threadId: plannerOut.threadId,
      goal: plannerOut.goal,
      dry_run: plannerOut.dry_run,
      started_at: now,
      finished_at: now,
      status: "denied",
      error: denied.reason,
      agent_versions: plannerOut.agent_versions,
      policy_denied: { code: denied.code, reason: denied.reason },
      steps: [],
    });

    console.log(JSON.stringify(denied, null, 2));
    process.exitCode = 3;
    return;
  }

  // Tier 5.1: capability routing (CLI-only, deterministic).
  const hasPhases = Array.isArray((plannerOut as any).phases) && (plannerOut as any).phases.length > 0;

  // Tier 5.2 phased execution
  if (hasPhases) {
    const nowIso = () => new Date().toISOString();

    const autonomyMode = process.env.AUTONOMY_MODE || 'OFF';
    if (autonomyMode !== 'OFF') {
      const denyRuns = enforceMaxRunsPerDay();
      if (denyRuns) {
        console.log(JSON.stringify(denyRuns));
        process.exitCode = 3;
        return;
      }
    }

    // Tier-20: safety backpressure; write suspension artifacts before gating/exec.
    autoSuspendDelegationsForCommand(command);

    let phasesPlanned: string[] = [];
    try {
      phasesPlanned = validatePhases(plannerOut).phases_planned;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const err = { kind: "CliError" as const, code: "CLI_PHASES_INVALID", reason: msg };
      const now = nowIso();
      await persistRun({
        execution_id: plannerOut.execution_id,
        threadId: plannerOut.threadId,
        goal: plannerOut.goal,
        dry_run: plannerOut.dry_run,
        started_at: now,
        finished_at: now,
        status: "failed",
        error: err.reason,
        agent_versions: plannerOut.agent_versions,
        phases_planned: null as any,
        phases_executed: [],
        steps: [],
      } as any);

      console.log(JSON.stringify(err, null, 2));
      process.exitCode = 1;
      return;
    }

    const phases = (plannerOut as any).phases as any[];
    const totalStepsPlanned = phases.reduce((acc, p) => acc + (Array.isArray(p?.steps) ? p.steps.length : 0), 0);

    // Ops freeze mode: deterministic deny (still produces receipts).
    if (process.env.ENGINE_FROZEN === "1") {
      const denied = {
        kind: "PolicyDenied" as const,
        code: "POLICY_ENGINE_FROZEN",
        reason: "ENGINE_FROZEN=1 (execution disabled)",
      };

      const now = nowIso();
      await persistRun({
        execution_id: plannerOut.execution_id,
        threadId: plannerOut.threadId,
        goal: plannerOut.goal,
        dry_run: plannerOut.dry_run,
        started_at: now,
        finished_at: now,
        status: "denied",
        error: denied.reason,
        agent_versions: plannerOut.agent_versions,
        phases_planned: phasesPlanned,
        phases_executed: [],
        denied_phase: phasesPlanned[0] ?? null,
        policy_denied: { code: denied.code, reason: denied.reason },
        steps: [],
      } as any);

      console.log(JSON.stringify(denied, null, 2));
      process.exitCode = 3;
      return;
    }

    const artifacts: Record<string, { outputs: Record<string, unknown>; files?: string[]; metadata: { started_at: string; finished_at: string } }> = {};
    const phasesExecuted: string[] = [];
    const resolvedCapsAll: Record<string, string> = {};
    const allStepLogs: any[] = [];
    let applyStepOrdinal = 0;
    let planFinalized = false;

    const overallStarted = nowIso();

    // Optional UI tour immediately before any apply steps run.
    // Runs only if explicitly listed in WATCH_PHASES (preapply/apply).
    try {
      if (shouldWatchPhase("preapply") || shouldWatchPhase("apply")) {
        await runWatchModeTour({
          execution_id: plannerOut.execution_id,
          config: controlConfig,
          note: shouldWatchPhase("apply") ? "apply" : "pre_apply",
        });
      }
    } catch {
      // ignore
    }

    for (const phase of phases) {
      const phaseId = String(phase.phase_id);

      // Resolve capabilities for this phase (Tier 5.1).
      let phaseResolvedCaps: Record<string, string> = {};
      try {
        const requiredCaps = phase.required_capabilities;
        if (!Array.isArray(requiredCaps) || !requiredCaps.every((c: any) => typeof c === "string")) {
          throw new Error(`phase '${phaseId}' required_capabilities must be string[]`);
        }
        const resolved = resolveCapabilities({ requiredCapabilities: requiredCaps, registry });
        phaseResolvedCaps = resolvedCapabilitiesToReceiptMap(resolved);
        for (const [k, v] of Object.entries(phaseResolvedCaps)) {
          resolvedCapsAll[k] = v;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const code = msg.includes("ambiguous") ? "POLICY_CAPABILITY_AMBIGUOUS" : "POLICY_CAPABILITY_UNRESOLVED";
        const denied = { kind: "PolicyDenied" as const, code, reason: msg };

        const now = nowIso();
        await persistRun({
          execution_id: plannerOut.execution_id,
          threadId: plannerOut.threadId,
          goal: plannerOut.goal,
          dry_run: plannerOut.dry_run,
          started_at: overallStarted,
          finished_at: now,
          status: "denied",
          error: denied.reason,
          agent_versions: plannerOut.agent_versions,
          resolved_capabilities: resolvedCapsAll,
          phases_planned: phasesPlanned,
          phases_executed: phasesExecuted,
          denied_phase: phaseId,
          artifacts,
          policy_denied: { code: denied.code, reason: denied.reason },
          steps: allStepLogs,
        } as any);

        console.log(JSON.stringify(denied, null, 2));
        process.exitCode = 3;
        return;
      }

      // Tier-9.1/Tier-10.2/Tier-10.5: approval-scoped notion.live.write steps must carry
      // prestate + fingerprint before the policy gate runs (policy requires them).
      const plan_hash_for_phase = computePlanHash(plannerOut);
      if (Array.isArray((phase as any)?.steps)) {
        for (const s of (phase as any).steps) {
          if (s?.action === "notion.live.write" && s?.approval_scoped === true && s?.read_only === false) {
            ensureIdempotencyKey(s, plan_hash_for_phase, plannerOut.threadId);
            const needsPrestate = !s.prestate || !(typeof s.prestate_fingerprint === "string" && String(s.prestate_fingerprint).trim());
            if (needsPrestate) {
              const snap = await fetchLivePrestateForStep(s);
              if (snap !== null) {
                if (!s.prestate) s.prestate = snap;
                if (!s.prestate_snapshot) s.prestate_snapshot = snap;
                if (!s.prestate_fingerprint) s.prestate_fingerprint = stableFingerprint(snap);
              }
            }
          }
        }
      }

      // Materialize steps with explicit artifact inputs.
      const executedSteps = materializePhaseSteps({ phase, artifacts: Object.fromEntries(Object.entries(artifacts).map(([k, v]) => [k, { outputs: v.outputs }])) });
      const phasePlan: any = {
        ...plannerOut,
        phases: undefined,
        required_capabilities: phase.required_capabilities,
        steps: executedSteps,
      };

      // Policy gate per phase.
      const policy = checkPolicyWithMeta(phasePlan, process.env, new Date(), {
        phase_id: phaseId,
        phases_count: phasesPlanned.length,
        total_steps_planned: totalStepsPlanned,
        execution_id: plannerOut.execution_id,
        command,
        domain_id: domain_id ?? undefined,
      });

      if ((policy as any).requireApproval) {
        const approval = (policy as any).approval;
        const now = nowIso();
        const plan_hash = computePlanHash(plannerOut);
        const stateFile = approvalStatePath(plannerOut.execution_id);

        // Tier-9.1/Tier-10.2/Tier-10.5: ensure approval-scoped notion.live.write steps have
        // prestate + fingerprint + idempotency key before pausing.
        const execution_id = plannerOut.execution_id;
        const steps =
          (plannerOut as any)?.steps ??
          (plannerOut as any)?.phases?.flatMap((p: any) => p.steps) ??
          [];

        for (const s of steps) {
          if (s?.action === "notion.live.write" && s?.approval_scoped === true) {
            ensureIdempotencyKey(s, plan_hash, plannerOut.threadId);
            const needsPrestate =
              !s.prestate ||
              !s.prestate_snapshot ||
              !(typeof s.prestate_fingerprint === "string" && String(s.prestate_fingerprint).trim());
            if (needsPrestate) {
              const snap = await fetchLivePrestateForStep(s);
              if (snap !== null) {
                if (!s.prestate) s.prestate = snap;
                if (!s.prestate_snapshot) s.prestate_snapshot = snap;
                if (!s.prestate_fingerprint) s.prestate_fingerprint = stableFingerprint(snap);
              }
            }

            const guards = (s as any)?.guards;
            if (Array.isArray(guards) && guards.length && s.prestate_snapshot) {
              const guardCheck = evaluateGuards(s.prestate_snapshot, guards);
              if (!guardCheck.ok) {
                console.log(
                  JSON.stringify({
                    kind: "NeedApprovalAgain",
                    code: "GUARD_FAILED_AT_APPROVAL",
                    details: guardCheck.failed,
                  })
                );
                process.exitCode = 4;
                return;
              }
            }
          }
        }

        // Tier-10.6: batch pause once when multiple approvable steps exist.
        const approvable = collectApprovableSteps(plannerOut);
        if (approvable.length > 1) {
          const prestates: Record<string, any> = {};
          for (const s of approvable) {
            if (!s.prestate_snapshot) {
              const snap = await fetchLivePrestateForStep(s);
              if (snap !== null) s.prestate_snapshot = snap;
            }
            if (!s.prestate_fingerprint && s.prestate_snapshot) {
              s.prestate_fingerprint = stableFingerprint(s.prestate_snapshot);
            }
            if (typeof s.step_id === "string" && s.prestate_snapshot && typeof s.prestate_fingerprint === "string") {
              prestates[s.step_id] = { snapshot: s.prestate_snapshot, fingerprint: s.prestate_fingerprint };
            }
          }

          // Emit per-step prestate artifacts so rollback remains recordable.
          for (const s of approvable) {
            writePrestateArtifact({
              execution_id,
              step_id: s.step_id ?? "write-step",
              resource: s.resource ?? { type: "unknown", id: "unknown" },
              snapshot: s.prestate_snapshot ?? { note: "planner did not provide snapshot" },
              captured_at: new Date().toISOString(),
              plan_hash,
            });
          }

          writeApprovalState({
            execution_id: plannerOut.execution_id,
            command,
            original_command,
            domain_id: domain_id ?? undefined,
            created_at: now,
            status: "awaiting_approval",
            kind: "ApprovalRequiredBatch",
            plan_hash,
            mode: "phased",
            plan: plannerOut,
            phases_planned: phasesPlanned,
            phases_executed: phasesExecuted,
            next_phase_id: phaseId,
            artifacts,
            resolved_capabilities: resolvedCapsAll,
            steps: allStepLogs,
            pending_step_ids: approvable.map((s: any) => String(s.step_id ?? "")).filter(Boolean),
            prestates,
            started_at: overallStarted,
          });

          await persistRun({
            execution_id: plannerOut.execution_id,
            threadId: plannerOut.threadId,
            goal: plannerOut.goal,
            dry_run: plannerOut.dry_run,
            plan_hash,
            started_at: overallStarted,
            finished_at: now,
            status: "awaiting_approval",
            error: approval?.reason,
            agent_versions: plannerOut.agent_versions,
            resolved_capabilities: resolvedCapsAll,
            phases_planned: phasesPlanned,
            phases_executed: phasesExecuted,
            denied_phase: null,
            artifacts,
            approval_required: {
              kind: "ApprovalRequiredBatch",
              execution_id: plannerOut.execution_id,
              plan_hash,
              pending_step_ids: approvable.map((s: any) => String(s.step_id ?? "")).filter(Boolean),
              state_file: stateFile,
            },
            steps: allStepLogs,
          } as any);

          console.log(
            JSON.stringify({
              kind: "ApprovalRequiredBatch",
              execution_id: plannerOut.execution_id,
              plan_hash,
              pending_step_ids: approvable.map((s: any) => String(s.step_id ?? "")).filter(Boolean),
              approval_required: true,
              executed: false,
              delegation: (policy as any).delegation ?? null,
              delegation_active: Boolean((policy as any).delegation?.active),
              reason: (policy as any).delegation?.suspension?.reason ?? (policy as any).delegation?.reason ?? null,
            })
          );
          process.exitCode = 4;
          return;
        }

        let captured = false;
        for (const s of steps) {
          if (s?.read_only === false) {
            captured = true;
            writePrestateArtifact({
              execution_id,
              step_id: s.step_id ?? "write-step",
              resource: s.resource ?? { type: "unknown", id: "unknown" },
              snapshot: s.prestate_snapshot ?? { note: "planner did not provide snapshot" },
              captured_at: new Date().toISOString(),
              plan_hash,
            });
          }
        }
        if (!captured) {
          writePrestateArtifact({
            execution_id,
            step_id: "write-step",
            resource: { type: "unknown", id: "unknown" },
            snapshot: { note: "planner did not provide snapshot" },
            captured_at: new Date().toISOString(),
            plan_hash,
          });
        }

        const approvalOut = { ...approval, execution_id: plannerOut.execution_id };

        writeApprovalState({
          execution_id: plannerOut.execution_id,
          command,
          original_command,
          domain_id: domain_id ?? undefined,
          created_at: now,
          status: "awaiting_approval",
          plan_hash,
          mode: "phased",
          plan: plannerOut,
          phases_planned: phasesPlanned,
          phases_executed: phasesExecuted,
          next_phase_id: phaseId,
          artifacts,
          resolved_capabilities: resolvedCapsAll,
          steps: allStepLogs,
          started_at: overallStarted,
        });

        await persistRun({
          execution_id: plannerOut.execution_id,
          threadId: plannerOut.threadId,
          goal: plannerOut.goal,
          dry_run: plannerOut.dry_run,
          plan_hash,
          started_at: overallStarted,
          finished_at: now,
          status: "awaiting_approval",
          error: approval?.reason,
          agent_versions: plannerOut.agent_versions,
          resolved_capabilities: resolvedCapsAll,
          phases_planned: phasesPlanned,
          phases_executed: phasesExecuted,
          denied_phase: null,
          artifacts,
          approval_required: { ...approvalOut, state_file: stateFile },
          steps: allStepLogs,
        } as any);

        console.log(
          JSON.stringify(
            {
              ...approvalOut,
              approval_required: true,
              executed: false,
              delegation: (policy as any).delegation ?? null,
              delegation_active: Boolean((policy as any).delegation?.active),
              reason: (policy as any).delegation?.suspension?.reason ?? (policy as any).delegation?.reason ?? null,
            },
            null,
            2
          )
        );
        process.exitCode = 4;

        // Optional UI tour while awaiting approval (inventory/proof pass).
        try {
          await maybeWatchTour("approval", plannerOut.execution_id, "awaiting_approval");
        } catch {
          // ignore
        }
        return;
      }

      if (!policy.allowed) {
        if (!("denied" in policy)) {
          throw new Error("Policy not allowed but no denial details");
        }
        const denied = policy.denied;
        const now = nowIso();
        await persistRun({
          execution_id: plannerOut.execution_id,
          threadId: plannerOut.threadId,
          goal: plannerOut.goal,
          dry_run: plannerOut.dry_run,
          started_at: overallStarted,
          finished_at: now,
          status: "denied",
          error: denied.reason,
          agent_versions: plannerOut.agent_versions,
          resolved_capabilities: resolvedCapsAll,
          phases_planned: phasesPlanned,
          phases_executed: phasesExecuted,
          denied_phase: phaseId,
          artifacts,
          policy_denied: { code: denied.code, reason: denied.reason },
          steps: allStepLogs,
        } as any);

        console.log(JSON.stringify(denied, null, 2));
        process.exitCode = 3;
        return;
      }

      // Approval boundary: once we begin executing steps, the run is proceeding.
      // Hashes MUST NOT be written before this point.

      // PLAN_FINALIZED: write plan summary exactly once (post-approval only) and optionally hash it.
      if (!planFinalized) {
        planFinalized = true;
        try {
          writePlanSummary(
            plannerOut.execution_id,
            [
              `# Run Summary`,
              ``,
              `execution_id: ${plannerOut.execution_id}`,
              `goal: ${plannerOut.goal}`,
              `dry_run: ${String(plannerOut.dry_run)}`,
              `phases_planned: ${Array.isArray(phasesPlanned) ? phasesPlanned.length : 0}`,
              ``,
              `This file is a human-readable plan summary. It does not grant or imply execution authority.`,
            ].join("\n")
          );

          appendRunLedgerLine(plannerOut.execution_id, {
            ts: new Date().toISOString(),
            kind: "plan_finalized",
            artifact: "plan/summary.md",
          });

          if (!plannerOut.dry_run && hashEnabled()) {
            hashArtifact(plannerOut.execution_id, "plan/summary.md", "apply");
          }
        } catch {
          // ignore
        }
      }

      const phaseRun = await executePlan(phasePlan, {
        onStepFinished: async ({ stepLog }) => {
          if (process.env.WATCH_MODE !== "1") return;
          if (process.env.WATCH_STEP_SCREENSHOTS !== "1") return;
          applyStepOrdinal++;
          const fullStepId = `${phaseId}:${stepLog.step_id}`;

          // STEP_EXECUTED event (ledger): the chain must trail this.
          try {
            appendRunLedgerLine(plannerOut.execution_id, {
              ts: new Date().toISOString(),
              kind: "step_executed",
              phase_id: phaseId,
              step_ordinal: applyStepOrdinal,
              step_id: fullStepId,
              action: stepLog.action,
              status: stepLog.status,
              finished_at: stepLog.finished_at,
            });
          } catch {
            // ignore
          }

          const screenshots = await captureWatchStepScreenshots({
            execution_id: plannerOut.execution_id,
            phase_id: phaseId,
            step_ordinal: applyStepOrdinal,
            step_id: fullStepId,
            config: controlConfig,
          });
          if (Array.isArray(screenshots) && screenshots.length) {
            stepLog.watch = {
              enabled: true,
              phases: ["apply"],
              screenshots,
            };

            // HASH_CHAIN(step artifacts): only finalized apply step screenshots.
            if (!plannerOut.dry_run && hashEnabled()) {
              for (const s of screenshots) {
                if (s && typeof (s as any).path === "string") {
                  hashArtifact(plannerOut.execution_id, String((s as any).path), "apply");
                }
              }
            }
          }
        },
      });
      // Prefix step IDs for uniqueness across phases.
      const prefixedSteps = phaseRun.steps.map((s: any) => ({ ...s, step_id: `${phaseId}:${s.step_id}` }));
      allStepLogs.push(...prefixedSteps);

      if (phaseRun.status !== "success") {
        const now = nowIso();
        const failed = {
          ...phaseRun,
          started_at: overallStarted,
          finished_at: now,
          status: "failed" as const,
          error: phaseRun.error ?? `phase '${phaseId}' failed`,
          failed_step: phaseRun.failed_step ? `${phaseId}:${phaseRun.failed_step}` : undefined,
          steps: allStepLogs,
          agent_versions: plannerOut.agent_versions,
          resolved_capabilities: resolvedCapsAll,
          phases_planned: phasesPlanned,
          phases_executed: phasesExecuted,
          artifacts,
        };
        (failed as any).turbosparse = { ...turbosparseMeta, systemPromptText: undefined };
        (failed as any).receipt_hash = computeReceiptHashForLog(failed);

        await persistRun(failed as any);
        console.log(JSON.stringify(failed, null, 2));
        process.exitCode = 1;
        return;
      }

      const extracted = extractPhaseArtifacts({ phase, phaseRun, executedSteps });
      artifacts[phaseId] = {
        outputs: extracted.outputs,
        files: extracted.files,
        metadata: { started_at: phaseRun.started_at, finished_at: phaseRun.finished_at ?? phaseRun.started_at },
      };

      phasesExecuted.push(phaseId);
    }

    const finishedAt = nowIso();
    const overall = {
      execution_id: plannerOut.execution_id,
      threadId: plannerOut.threadId,
      goal: plannerOut.goal,
      dry_run: plannerOut.dry_run,
      started_at: overallStarted,
      finished_at: finishedAt,
      status: "success" as const,
      steps: allStepLogs,
      agent_versions: plannerOut.agent_versions,
      resolved_capabilities: resolvedCapsAll,
      phases_planned: phasesPlanned,
      phases_executed: phasesExecuted,
      artifacts,
    };
    (overall as any).turbosparse = { ...turbosparseMeta, systemPromptText: undefined };
    (overall as any).fingerprint = fingerprint;
    (overall as any).autonomy_mode = autonomy_mode;
    (overall as any).autonomy_mode_effective = autonomy_mode;
    (overall as any).receipt_hash = computeReceiptHashForLog(overall);

    // Tier 3.5: deterministic document-intake work product.
    if (overall.status === "success") {
      const planVersion = process.env.PLAN_VERSION ?? "ExecutionPlan@1";
      const intake = artifacts["intake"]?.outputs;
      const intakePath = typeof intake?.path === "string" ? (intake.path as string) : null;
      const files = Array.isArray(intake?.files) ? (intake.files as any[]) : [];
      if (intakePath && intakePath.trim()) {
        writeIntakeArtifact({
          execution_id: overall.execution_id,
          threadId: overall.threadId,
          intakePath,
          files,
          started_at: overall.started_at,
          finished_at: overall.finished_at ?? overall.started_at,
          plan_version: planVersion,
        });
      }
    }

    // Tier 6.0: deterministic Notion read work product.
    if (overall.status === "success") {
      for (const s of overall.steps) {
        if (typeof s?.action === "string" && s.action.startsWith("notion.read.") && s.status === "success") {
          writeNotionReadArtifact({
            execution_id: overall.execution_id,
            threadId: overall.threadId,
            action: s.action,
            step_id: s.step_id,
            requested_at: s.started_at,
            finished_at: s.finished_at ?? s.started_at,
            response: s.response,
          });
        }
        if (s?.action === "notion.live.read" && s.status === "success") {
          const notion_path = new URL(String(s.url)).pathname;
          writeNotionLiveReadArtifact({
            execution_id: overall.execution_id,
            step_id: s.step_id,
            notion_path,
            http_status: typeof s.http_status === "number" ? s.http_status : 0,
            response: s.response,
          });
        }
      }
    }

    // Tier 6.1: deterministic Notion write work product (only after approval + execution).
    if (overall.status === "success") {
      for (const s of overall.steps) {
        if (typeof s?.action === "string" && s.action.startsWith("notion.write.") && s.status === "success") {
          writeNotionWriteArtifact({
            execution_id: overall.execution_id,
            threadId: overall.threadId,
            action: s.action,
            step_id: s.step_id,
            requested_at: s.started_at,
            finished_at: s.finished_at ?? s.started_at,
            request_payload: null,
            response: s.response,
          });
        }
      }
    }

    await persistRun(overall as any);

    // APPLY_COMPLETE (hash steps.executed.json after it is final).
    try {
      appendRunLedgerLine(overall.execution_id, {
        ts: new Date().toISOString(),
        kind: "apply_complete",
        status: overall.status,
      });

      writeApplyJson(overall.execution_id, "steps.executed.json", allStepLogs);

      if (!overall.dry_run && hashEnabled()) {
        hashArtifact(overall.execution_id, "apply/steps.executed.json", "apply");
        appendHashChainGroup({ execution_id: overall.execution_id, scope: "apply", count: hashCountApply, head: hashHead });
      }
    } catch {
      // ignore
    }

    // Optional UI tour after successful apply.
    try {
      if (shouldWatchPhase("postapply")) {
        const created = await runWatchModeTour({ execution_id: overall.execution_id, config: controlConfig, note: "post_apply" });

        // HASH_CHAIN(postapply artifacts): hash only postapply watch artifacts.
        if (!overall.dry_run && hashEnabled() && Array.isArray(created) && created.length) {
          for (const rel of created) {
            if (typeof rel === "string" && rel.startsWith("screen/")) {
              hashArtifact(overall.execution_id, rel, "postapply");
            }
          }
          appendHashChainGroup({ execution_id: overall.execution_id, scope: "postapply", count: hashCountPostapply, head: hashHead });
        }
      }
    } catch {
      // ignore
    }

    // Tier-22.2: count successful runs while in PROBATION and recommend ELIGIBLE when threshold met.
    if (overall.status === "success") {
      const planSteps = Array.isArray((plannerOut as any)?.phases)
        ? (plannerOut as any).phases.flatMap((p: any) => (Array.isArray(p?.steps) ? p.steps : []))
        : (Array.isArray((plannerOut as any)?.steps) ? (plannerOut as any).steps : []);
      await maybeRecordProbationSuccessAndRecommend({
        fingerprint,
        now_iso: fixedNowIso(),
        threadId,
        autonomy_mode,
        autonomy_mode_effective: (overall as any).autonomy_mode_effective ?? autonomy_mode,
        run_status: String(overall.status),
        policy_denied: Boolean((overall as any).policy_denied),
        throttled: String(overall.status) === "throttled",
        approval_required: Boolean((overall as any).approval_required),
        steps: planSteps,
      });
    }

    const autonomyModeAfter = process.env.AUTONOMY_MODE || 'OFF';
    if (autonomyModeAfter === 'READ_ONLY_AUTONOMY' && overall.status === 'success') {
      writeAutonomySummary({
        execution_id: overall.execution_id,
        mode: autonomyModeAfter,
        steps_executed: (overall?.steps || []).map((s: any) => s.step_id).filter(Boolean),
        started_at: overall.started_at,
        finished_at: overall.finished_at,
      });
    }

    (overall as any).executed = overall.status === "success";
    (overall as any).approval_required = false;

    console.log(JSON.stringify(overall, null, 2));
    return;
  }

  // Tier 5.1 (legacy single-phase): capability routing (CLI-only, deterministic).
  const capsRaw = plannerOut.required_capabilities ?? [];
  if (!Array.isArray(capsRaw) || !capsRaw.every((c) => typeof c === "string")) {
    const denied = {
      kind: "PolicyDenied" as const,
      code: "POLICY_CAPABILITY_INVALID",
      reason: "required_capabilities must be string[]",
    };

    const now = new Date().toISOString();
    await persistRun({
      execution_id: plannerOut.execution_id,
      threadId: plannerOut.threadId,
      goal: plannerOut.goal,
      dry_run: plannerOut.dry_run,
      started_at: now,
      finished_at: now,
      status: "denied",
      error: denied.reason,
      agent_versions: plannerOut.agent_versions,
      policy_denied: { code: denied.code, reason: denied.reason },
      steps: [],
    });

    console.log(JSON.stringify(denied, null, 2));
    process.exitCode = 3;
    return;
  }

  let resolvedCapabilities: Record<string, string> | undefined;
  if (capsRaw.length) {
    try {
      const resolved = resolveCapabilities({ requiredCapabilities: capsRaw, registry });
      resolvedCapabilities = resolvedCapabilitiesToReceiptMap(resolved);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = msg.includes("ambiguous") ? "POLICY_CAPABILITY_AMBIGUOUS" : "POLICY_CAPABILITY_UNRESOLVED";
      const denied = {
        kind: "PolicyDenied" as const,
        code,
        reason: msg,
      };

      const now = new Date().toISOString();
      await persistRun({
        execution_id: plannerOut.execution_id,
        threadId: plannerOut.threadId,
        goal: plannerOut.goal,
        dry_run: plannerOut.dry_run,
        started_at: now,
        finished_at: now,
        status: "denied",
        error: denied.reason,
        agent_versions: plannerOut.agent_versions,
        resolved_capabilities: undefined,
        policy_denied: { code: denied.code, reason: denied.reason },
        steps: [],
      });

      console.log(JSON.stringify(denied, null, 2));
      process.exitCode = 3;
      return;
    }
  }

  // Ops freeze mode: deny all execution while still producing receipts.
  if (process.env.ENGINE_FROZEN === "1") {
    const denied = {
      kind: "PolicyDenied" as const,
      code: "POLICY_ENGINE_FROZEN",
      reason: "ENGINE_FROZEN=1 (execution disabled)",
    };

    const now = new Date().toISOString();
    await persistRun({
      execution_id: plannerOut.execution_id,
      threadId: plannerOut.threadId,
      goal: plannerOut.goal,
      dry_run: plannerOut.dry_run,
      started_at: now,
      finished_at: now,
      status: "denied",
      error: denied.reason,
      agent_versions: plannerOut.agent_versions,
      policy_denied: { code: denied.code, reason: denied.reason },
      steps: [],
    });

    console.log(JSON.stringify(denied, null, 2));
    process.exitCode = 3;
    return;
  }

  // Tier 4: Policy layer (pre-execution guardrails).
  {
    const autonomyMode = process.env.AUTONOMY_MODE || 'OFF';
    if (autonomyMode !== 'OFF') {
      const denyRuns = enforceMaxRunsPerDay();
      if (denyRuns) {
        console.log(JSON.stringify(denyRuns));
        process.exitCode = 3;
        return;
      }
    }
  }

  // Tier-10.2: populate approval-scoped notion.live.write prestates before policy evaluation.
  // Safe: live prestate capture is GET-only and redaction happens in-memory before disk.
  {
    const steps =
      (plannerOut as any)?.steps ??
      (plannerOut as any)?.phases?.flatMap((p: any) => p.steps) ??
      [];

    for (const s of steps) {
      if (s?.action === "notion.live.write" && s?.approval_scoped === true) {
        const path = s.notion_path_prestate || s.notion_path;
        if (!s.prestate && typeof path === "string" && path.trim()) {
          const pre = await notionLiveGet(path);
          s.prestate = pre.redacted;
        }
        if (!s.prestate_fingerprint && s.prestate) {
          s.prestate_fingerprint = stableFingerprint(s.prestate);
        }
        if (!s.prestate_snapshot && s.prestate) {
          s.prestate_snapshot = s.prestate;
        }
      }
    }
  }

  // Tier-20: safety backpressure; write suspension artifacts before gating/exec.
  autoSuspendDelegationsForCommand(command);

  const policy = checkPolicyWithMeta(plannerOut, process.env, new Date(), {
    execution_id: plannerOut.execution_id,
    command,
    domain_id: domain_id ?? undefined,
  });

  if ((policy as any).requireApproval) {
    const delegation = (policy as any).delegation ?? null;
    const delegation_active = Boolean(delegation?.active);
    const delegation_reason = delegation?.suspension?.reason ?? delegation?.reason ?? null;
    const approval = (policy as any).approval;
    const now = new Date().toISOString();
    const plan_hash = computePlanHash(plannerOut);
    const stateFile = approvalStatePath(plannerOut.execution_id);

    // Tier-9.1: mandatory prestate capture for write-scoped steps
    // Tier-10.2: Ensure approval-scoped notion.live.write steps include prestate + fingerprint
    const execution_id = plannerOut.execution_id;
    const steps =
      (plannerOut as any)?.steps ??
      (plannerOut as any)?.phases?.flatMap((p: any) => p.steps) ??
      [];

        // Tier-10.5: Stamp deterministic idempotency_key onto approval-scoped notion.live.write steps.
        for (const s of steps) {
          if (s?.action === "notion.live.write") {
            ensureIdempotencyKey(s, plan_hash, plannerOut.threadId);
          }
        }

    for (const s of steps) {
      if (s?.action === "notion.live.write") {
        // Tier-10.5: Stamp deterministic idempotency_key onto approval-scoped notion.live.write steps.
        ensureIdempotencyKey(s, plan_hash, plannerOut.threadId);

        const path = s.notion_path_prestate || s.notion_path;
        if (!s.prestate && typeof path === "string" && path.trim()) {
          const pre = await notionLiveGet(path);
          s.prestate = pre.redacted;
        }
        if (!s.prestate_fingerprint && s.prestate) {
          s.prestate_fingerprint = stableFingerprint(s.prestate);
        }
        // Ensure the generic prestate artifact is redacted-before-disk.
        if (!s.prestate_snapshot && s.prestate) {
          s.prestate_snapshot = s.prestate;
        }
      }
    }

    // Tier-10.6: batch pause once when multiple approvable steps exist
    const approvable = collectApprovableSteps(plannerOut);
    if (approvable.length > 1) {
      const prestates: Record<string, any> = {};
      for (const s of approvable) {
        // Ensure prestate + fingerprint exist for deterministic resume.
        if (!s.prestate_snapshot) {
          const snap = await fetchLivePrestateForStep(s);
          if (snap !== null) s.prestate_snapshot = snap;
        }
        if (!s.prestate_fingerprint && s.prestate_snapshot) {
          s.prestate_fingerprint = stableFingerprint(s.prestate_snapshot);
        }

        if (typeof s.step_id === "string" && s.prestate_snapshot && typeof s.prestate_fingerprint === "string") {
          prestates[s.step_id] = { snapshot: s.prestate_snapshot, fingerprint: s.prestate_fingerprint };
        }
      }

      writeApprovalState({
        execution_id: plannerOut.execution_id,
        command,
        original_command,
        domain_id: domain_id ?? undefined,
        created_at: now,
        status: "awaiting_approval",
        kind: "ApprovalRequiredBatch",
        plan_hash,
        mode: "legacy",
        plan: plannerOut,
        pending_step_ids: approvable.map((s: any) => String(s.step_id ?? "")).filter(Boolean),
        prestates,
        started_at: now,
      });

      await persistRun({
        execution_id: plannerOut.execution_id,
        threadId: plannerOut.threadId,
        goal: plannerOut.goal,
        dry_run: plannerOut.dry_run,
        plan_hash,
        started_at: now,
        finished_at: now,
        status: "awaiting_approval",
        error: approval?.reason,
        agent_versions: plannerOut.agent_versions,
        approval_required: {
          kind: "ApprovalRequiredBatch",
          execution_id: plannerOut.execution_id,
          plan_hash,
          pending_step_ids: approvable.map((s: any) => String(s.step_id ?? "")).filter(Boolean),
          state_file: stateFile,
        },
        steps: [],
      } as any);

      console.log(
        JSON.stringify({
          kind: "ApprovalRequiredBatch",
          execution_id: plannerOut.execution_id,
          plan_hash,
          pending_step_ids: approvable.map((s: any) => String(s.step_id ?? "")).filter(Boolean),
          approval_required: true,
          executed: false,
          delegation,
          delegation_active,
          reason: delegation_reason,
        })
      );
      process.exitCode = 4;
      return;
    }

    // Tier-10.4: guard evaluation at approval pause (against live prestate snapshot)
    for (const s of steps) {
      if (s?.action === "notion.live.write" && s?.approval_scoped === true) {
        const guards = (s as any)?.guards;
        if (Array.isArray(guards) && guards.length) {
          const snap = (s as any).prestate_snapshot ?? (s as any).prestate;
          const guardCheck = evaluateGuards(snap, guards);
          if (!guardCheck.ok) {
            console.log(
              JSON.stringify({
                kind: "NeedApprovalAgain",
                code: "GUARD_FAILED_AT_APPROVAL",
                details: guardCheck.failed,
              })
            );
            process.exitCode = 4;
            return;
          }
        }
      }
    }

    let captured = false;
    for (const s of steps) {
      if (s?.read_only === false) {
        captured = true;
        writePrestateArtifact({
          execution_id,
          step_id: s.step_id ?? "write-step",
          resource: s.resource ?? { type: "unknown", id: "unknown" },
          snapshot: s.prestate_snapshot ?? { note: "planner did not provide snapshot" },
          captured_at: new Date().toISOString(),
          plan_hash,
        });
      }
    }
    if (!captured) {
      writePrestateArtifact({
        execution_id,
        step_id: "write-step",
        resource: { type: "unknown", id: "unknown" },
        snapshot: { note: "planner did not provide snapshot" },
        captured_at: new Date().toISOString(),
        plan_hash,
      });
    }

    const approvalOut = { ...approval, execution_id: plannerOut.execution_id };

    writeApprovalState({
      execution_id: plannerOut.execution_id,
      command,
      original_command,
      domain_id: domain_id ?? undefined,
      created_at: now,
      status: "awaiting_approval",
      plan_hash,
      mode: "legacy",
      plan: plannerOut,
      started_at: now,
    });

    await persistRun({
      execution_id: plannerOut.execution_id,
      threadId: plannerOut.threadId,
      goal: plannerOut.goal,
      dry_run: plannerOut.dry_run,
      plan_hash,
      started_at: now,
      finished_at: now,
      status: "awaiting_approval",
      error: approval?.reason,
      agent_versions: plannerOut.agent_versions,
      approval_required: { ...approvalOut, state_file: stateFile },
      steps: [],
    } as any);

    console.log(
      JSON.stringify(
        {
          ...approvalOut,
          approval_required: true,
          executed: false,
          delegation,
          delegation_active,
          reason: delegation_reason,
        },
        null,
        2
      )
    );
    process.exitCode = 4;
    return;
  }
  if (!policy.allowed) {
    if (!("denied" in policy)) {
      throw new Error("Policy not allowed but no denial details");
    }
    const denied = policy.denied;
    const now = new Date().toISOString();

    // Tier-16: policy denials decay confidence, with threshold enforcement.
    try {
      const beforeConfidence = readConfidence(fingerprint).confidence;
      const prevRequalState = (() => {
        try {
          return isRequalificationEnabled() ? readRequalificationState(fingerprint)?.state ?? null : null;
        } catch {
          return null;
        }
      })();

      const updated = updateConfidence({ fingerprint, signal: "POLICY_DENIAL" });
      const c = updated.confidence;

      try {
        emitSpeechBundle({
          fingerprint,
          execution_id: String((plannerOut as any)?.execution_id ?? ""),
          now_iso: fixedNowIso(),
          prior_by_fingerprint: priorReceiptByFingerprint,
          current: { kind: "PolicyDenied", code: denied.code, reason: denied.reason },
          autonomy_mode,
          autonomy_mode_effective: autonomy_mode,
          s6: {
            confidence: { prev: { confidence: beforeConfidence }, curr: { confidence: c } },
          },
        });
      } catch {
        // ignore
      }

      if (c <= 0.2 && isRequalificationEnabled()) {
        const at = fixedNowIso();
        writeRequalificationState({
          fingerprint,
          state: "SUSPENDED",
          cause: "CONFIDENCE_TOO_LOW",
          since: at,
          cooldown_until: null,
        });
        writeRequalificationEvent({
          fingerprint,
          at_iso: at,
          event: "CONFIDENCE_TOO_LOW_SUSPEND",
          details: { confidence: c },
        });

        try {
          emitSpeechBundle({
            fingerprint,
            execution_id: String((plannerOut as any)?.execution_id ?? ""),
            now_iso: at,
            prior_by_fingerprint: priorReceiptByFingerprint,
            current: { kind: "RequalificationStateChanged", to: "SUSPENDED", cause: "CONFIDENCE_TOO_LOW" },
            autonomy_mode,
            autonomy_mode_effective: effectiveAutonomyModeForState({ autonomy_mode, state: "SUSPENDED" }),
            s6: {
              requalification: {
                prev: { requalification: { fingerprint, state: prevRequalState ?? undefined } },
                curr: { requalification: { fingerprint, state: "SUSPENDED", cause: "CONFIDENCE_TOO_LOW" } },
              },
            },
          });
        } catch {
          // ignore
        }
      } else if (c <= 0.4 && isRequalificationEnabled()) {
        const at = fixedNowIso();
        const current = readRequalificationState(fingerprint);
        if (!current || current.state === "ACTIVE") {
          writeRequalificationState({
            fingerprint,
            state: "PROBATION",
            cause: "CONFIDENCE_TOO_LOW",
            since: at,
            cooldown_until: null,
          });
          writeRequalificationEvent({
            fingerprint,
            at_iso: at,
            event: "CONFIDENCE_TOO_LOW_PROBATION",
            details: { confidence: c },
          });

          try {
            emitSpeechBundle({
              fingerprint,
              execution_id: String((plannerOut as any)?.execution_id ?? ""),
              now_iso: at,
              prior_by_fingerprint: priorReceiptByFingerprint,
              current: { kind: "RequalificationStateChanged", to: "PROBATION", cause: "CONFIDENCE_TOO_LOW" },
              autonomy_mode,
              autonomy_mode_effective: effectiveAutonomyModeForState({ autonomy_mode, state: "PROBATION" }),
              s6: {
                requalification: {
                  prev: { requalification: { fingerprint, state: prevRequalState ?? undefined } },
                  curr: { requalification: { fingerprint, state: "PROBATION", cause: "CONFIDENCE_TOO_LOW" } },
                },
              },
            });
          } catch {
            // ignore
          }
        }
      }

      const nextMode = applyConfidenceDowngrade(autonomy_mode, c);
      if (nextMode !== autonomy_mode) process.env.AUTONOMY_MODE = nextMode;
    } catch {
      // ignore
    }

    await persistRun({
      execution_id: plannerOut.execution_id,
      threadId: plannerOut.threadId,
      goal: plannerOut.goal,
      dry_run: plannerOut.dry_run,
      started_at: now,
      finished_at: now,
      status: "denied",
      error: denied.reason,
      agent_versions: plannerOut.agent_versions,
      resolved_capabilities: resolvedCapabilities,
      policy_denied: { code: denied.code, reason: denied.reason },
      steps: [],
    });

    console.log(JSON.stringify(denied, null, 2));
    process.exitCode = 3;
    return;
  }

  const runLog = await executePlan(plannerOut);

  (runLog as any).executed = runLog.status === "success";
  (runLog as any).approval_required = false;
  (runLog as any).promotion_fingerprint = (policy as any).promotion_fingerprint ?? null;
  (runLog as any).delegation = (policy as any).delegation ?? null;
  (runLog as any).delegation_active = Boolean((runLog as any).delegation?.active);

  // Include pinned versions on receipts/run metadata.
  runLog.agent_versions = plannerOut.agent_versions;
  runLog.resolved_capabilities = resolvedCapabilities;

  // Tier 3.5: deterministic document-intake work product.
  // Trigger only when the explicit intake step succeeds.
  if (runLog.status === "success") {
    const planVersion = process.env.PLAN_VERSION ?? "ExecutionPlan@1";
    const intakeStepId = "scan-path";

    const planStep = plannerOut.steps.find((s: any) => s.step_id === intakeStepId);
    const runStep = runLog.steps.find((s) => s.step_id === intakeStepId);

    if (planStep && runStep && runStep.status === "success") {
      const intakePath = isRecord(planStep.payload) ? (planStep.payload as any).path : null;
      const files = isRecord(runStep.response) ? (runStep.response as any).files : [];

      if (typeof intakePath === "string" && intakePath.trim()) {
        writeIntakeArtifact({
          execution_id: runLog.execution_id,
          threadId: runLog.threadId,
          intakePath,
          files: Array.isArray(files) ? files : [],
          started_at: runLog.started_at,
          finished_at: runLog.finished_at ?? runLog.started_at,
          plan_version: planVersion,
        });
      }
    }
  }

  const autonomyModeAfter = process.env.AUTONOMY_MODE || 'OFF';
  if (autonomyModeAfter === 'READ_ONLY_AUTONOMY' && runLog.status === 'success') {
    writeAutonomySummary({
      execution_id: runLog.execution_id,
      mode: autonomyModeAfter,
      steps_executed: (runLog?.steps || []).map((s: any) => s.step_id).filter(Boolean),
      started_at: runLog.started_at,
      finished_at: runLog.finished_at,
    });
  }

  // Tier 6.0: deterministic Notion read work product.
  if (runLog.status === "success") {
    for (const s of runLog.steps) {
      if (typeof s?.action === "string" && s.action.startsWith("notion.read.") && s.status === "success") {
        writeNotionReadArtifact({
          execution_id: runLog.execution_id,
          threadId: runLog.threadId,
          action: s.action,
          step_id: s.step_id,
          requested_at: s.started_at,
          finished_at: s.finished_at ?? s.started_at,
          response: s.response,
        });
      }
      if (s?.action === "notion.live.read" && s.status === "success") {
        const notion_path = new URL(String(s.url)).pathname;
        writeNotionLiveReadArtifact({
          execution_id: runLog.execution_id,
          step_id: s.step_id,
          notion_path,
          http_status: typeof s.http_status === "number" ? s.http_status : 0,
          response: s.response,
        });
      }
    }
  }

  // Tier 6.1: deterministic Notion write work product (only after approval + execution).
  if (runLog.status === "success") {
    for (const s of runLog.steps) {
      if (typeof s?.action === "string" && s.action.startsWith("notion.write.") && s.status === "success") {
        const planStep = plannerOut.steps.find((ps: any) => ps.step_id === s.step_id);
        writeNotionWriteArtifact({
          execution_id: runLog.execution_id,
          threadId: runLog.threadId,
          action: s.action,
          step_id: s.step_id,
          requested_at: s.started_at,
          finished_at: s.finished_at ?? s.started_at,
          request_payload: planStep?.payload ?? null,
          response: s.response,
        });
      }
    }
  }

  await persistRun(runLog);

  // Tier-22.2: count successful runs while in PROBATION and recommend ELIGIBLE when threshold met.
  if (runLog.status === "success") {
    const planSteps = Array.isArray((plannerOut as any)?.phases)
      ? (plannerOut as any).phases.flatMap((p: any) => (Array.isArray(p?.steps) ? p.steps : []))
      : (Array.isArray((plannerOut as any)?.steps) ? (plannerOut as any).steps : []);
    await maybeRecordProbationSuccessAndRecommend({
      fingerprint,
      now_iso: fixedNowIso(),
      threadId,
      autonomy_mode,
      autonomy_mode_effective: (runLog as any).autonomy_mode_effective ?? autonomy_mode,
      run_status: String(runLog.status),
      policy_denied: Boolean((runLog as any).policy_denied),
      throttled: String(runLog.status) === "throttled",
      approval_required: Boolean((runLog as any).approval_required),
      steps: planSteps,
    });
  }

  console.log(JSON.stringify(runLog, null, 2));

  if (runLog.status !== "success") {
    process.exitCode = 1;
  }
}

function splitArgs(s: string): string[] {
  const out: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (!ch) continue;

    if (quote) {
      if (ch === quote) {
        quote = null;
        continue;
      }
      if (ch === "\\" && i + 1 < s.length) {
        const next = s[i + 1];
        current += next;
        i++;
        continue;
      }
      current += ch;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) out.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  if (current) out.push(current);
  return out;
}

function parseSlidesArgs(tokens: string[]): {
  title: string;
  subtitle?: string;
  brand: string;
  formats: SlidesFormat[];
  inPath?: string;
  sourceText: string;
} {
  let title = "Slides deck";
  let subtitle: string | undefined;
  let brand = "vault-guardian.black-gold";
  let formatStr = "pptx,html";
  let inPath: string | undefined;

  const rest: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i] ?? "";

    const take = (name: string): string | null => {
      const next = tokens[i + 1];
      if (typeof next === "string" && next.length) {
        i++;
        return next;
      }
      return null;
    };

    if (t === "--title") {
      const v = take("--title");
      if (v) title = v;
      continue;
    }
    if (t.startsWith("--title=")) {
      title = t.slice("--title=".length);
      continue;
    }

    if (t === "--subtitle") {
      subtitle = take("--subtitle") ?? subtitle;
      continue;
    }
    if (t.startsWith("--subtitle=")) {
      subtitle = t.slice("--subtitle=".length);
      continue;
    }

    if (t === "--brand") {
      brand = take("--brand") ?? brand;
      continue;
    }
    if (t.startsWith("--brand=")) {
      brand = t.slice("--brand=".length);
      continue;
    }

    if (t === "--format") {
      formatStr = take("--format") ?? formatStr;
      continue;
    }
    if (t.startsWith("--format=")) {
      formatStr = t.slice("--format=".length);
      continue;
    }

    if (t === "--in") {
      inPath = take("--in") ?? inPath;
      continue;
    }
    if (t.startsWith("--in=")) {
      inPath = t.slice("--in=".length);
      continue;
    }

    rest.push(t);
  }

  const formats = formatStr
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => s as SlidesFormat);

  return {
    title,
    subtitle,
    brand,
    formats,
    inPath: inPath ? path.resolve(process.cwd(), inPath) : undefined,
    sourceText: rest.join(" ").trim(),
  };
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

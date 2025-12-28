import fs from "node:fs";
import path from "node:path";

import { loadAgentRegistry, findAgentsProvidingCapability } from "../agents/agentRegistry.js";
import { getOperatorStatePath, readOperatorState, writeOperatorSpeechSink, type SpeechSinkName } from "../operator/state.js";
import { loadSpeechSinks } from "../speech/sinks/index.js";
import { writeOperatorSpeechSinkArtifact } from "../artifacts/writeOperatorSpeechSinkArtifact.js";
import { getSpeechGateStatus, speak } from "../speech/speak.js";
import { confidenceDecisionView, type RequalificationEvent } from "../operator/views/confidenceDecisionView.js";
import { renderConfidenceCurve } from "../operator/viz/renderConfidenceCurve.js";
import { readRequalificationState } from "../requalification/requalification.js";
import { loadConfidenceHistory } from "../speech/confidenceHistory.js";
import { persistRun } from "../persist/persistRun.js";
import { cmdCourtExport } from "../operator/commands/courtExport.js";
import { getRepoStatus } from "../operator/repoStatus.js";
import { getEffectiveConfidence } from "../confidence/confidenceStore.js";
import { computeOperatorRanking } from "../operator/ranking.js";
import { writeOperatorRankingArtifact } from "../artifacts/writeOperatorRankingArtifact.js";
import { operatorSpeechPlay, type SpeechPlayArgs, type OperatorContext } from "../operator/speechPlay.js";
import { findRepoRoot } from "../util/findRepoRoot.js";

if (process.env.WARN_NON_CANONICAL_REPO === "1") {
  try {
    const rs = getRepoStatus(process.cwd());
    if (rs.canonical_repo_root && rs.non_canonical) {
      // stderr only — never pollute stdout JSON
      process.stderr.write(
        JSON.stringify(
          {
            kind: "StartupWarning",
            code: "NON_CANONICAL_REPO",
            cwd: rs.cwd,
            repo_root: rs.repo_root,
            canonical_repo_root: rs.canonical_repo_root,
          },
          null,
          2
        ) + "\n"
      );
    }
  } catch {
    // fail-open
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function getArgCommand() {
  const raw = process.argv.slice(2).join(" ").trim();
  if (!raw) throw new Error("Missing command argument");
  return raw;
}

function nowIso() {
  return new Date().toISOString();
}

function deterministicNowIso() {
  const fixed = String(process.env.SMOKE_FIXED_NOW_ISO ?? "").trim();
  if (fixed) {
    const t = new Date(fixed).getTime();
    // Important: preserve the exact fixed ISO string for deterministic IDs/paths
    // (Date#toISOString() would inject millisecond precision like ".000Z").
    if (Number.isFinite(t)) return fixed;
  }
  return nowIso();
}

function envEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.SPEECH_ENABLED;
  if (v == null || v === "") return true;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

function parseCurrentSink(env: NodeJS.ProcessEnv = process.env): string {
  const raw = String(env.SPEECH_SINKS ?? "").trim();
  if (!raw) return "console";
  return raw.split(",")[0]!.trim() || "console";
}

function effectiveSinkName(desired: string): string {
  try {
    const sinks = loadSpeechSinks({ ...process.env, SPEECH_SINKS: desired });
    return sinks[0]?.name || "console";
  } catch {
    return "console";
  }
}

function deny(code: string, reason: string) {
  const out = { kind: "PolicyDenied" as const, code, reason };
  console.log(JSON.stringify(out, null, 2));
  process.exitCode = 3;
}

function parseSpeechSinkName(value: string): SpeechSinkName | null {
  const v = String(value ?? "").trim();
  if (v === "console" || v === "os-tts" || v === "elevenlabs") return v;
  return null;
}

function parseCsv(value: string | undefined | null): string[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveSpeechFallbackOrder(params: { operator_sink: string | null; env: NodeJS.ProcessEnv }): string[] {
  const canonical = ["elevenlabs", "os-tts", "console"];
  const raw = params.operator_sink ? [params.operator_sink] : parseCsv(params.env.SPEECH_SINKS);
  const base = raw.length ? raw : canonical;

  const out: string[] = [];
  for (const s of base) {
    const v = String(s ?? "").trim();
    if (!v) continue;
    if (!out.includes(v)) out.push(v);
  }
  for (const s of canonical) {
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

function canWriteDir(dir: string): { ok: boolean; dir: string; error?: string } {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const p = path.join(dir, `.writecheck.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`);
    fs.writeFileSync(p, "ok", { encoding: "utf8" });
    try {
      fs.unlinkSync(p);
    } catch {
      // ignore
    }
    return { ok: true, dir };
  } catch (err: any) {
    const msg = err && typeof err === "object" && "message" in err ? String(err.message) : String(err);
    return { ok: false, dir, error: msg };
  }
}

function resolveElevenLabsConfigSummary(env: NodeJS.ProcessEnv = process.env): {
  api_key_present: boolean;
  voice_id: string;
  voice_source:
    | "ELEVENLABS_VOICE_ID"
    | "LAST_KNOWN_GOOD"
    | "ELEVENLABS_DEFAULT_VOICE_ID"
    | "DEFAULT_SINTRAPRIME_VOICE_ID";
  model_id_set: boolean;
  use_last_known_good: boolean;
  last_known_good: { present: boolean; voice_id: string | null; error: string | null };
} {
  const apiKey = String(env.ELEVENLABS_API_KEY ?? "").trim();
  const explicitVoiceId = String(env.ELEVENLABS_VOICE_ID ?? "").trim();
  const defaultVoiceId = String(env.ELEVENLABS_DEFAULT_VOICE_ID ?? "").trim();
  const use_last_known_good = String(env.ELEVENLABS_USE_LAST_KNOWN_GOOD ?? "").trim() === "1";

  const lastKnownGood = (() => {
    const p = path.join(process.cwd(), "runs", "speech", "elevenlabs_last_known_good_voice.json");
    try {
      if (!fs.existsSync(p)) return { present: false, voice_id: null, error: null };
      const raw = JSON.parse(fs.readFileSync(p, "utf8"));
      const vid = raw && typeof raw === "object" && typeof (raw as any).voice_id === "string" ? String((raw as any).voice_id) : "";
      return { present: true, voice_id: vid.trim() || null, error: null };
    } catch (err: any) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : String(err);
      return { present: true, voice_id: null, error: msg };
    }
  })();

  const resolved = (() => {
    if (explicitVoiceId) {
      return { voice_id: explicitVoiceId, voice_source: "ELEVENLABS_VOICE_ID" as const };
    }
    if (use_last_known_good && lastKnownGood.voice_id) {
      return { voice_id: lastKnownGood.voice_id, voice_source: "LAST_KNOWN_GOOD" as const };
    }
    if (defaultVoiceId) {
      return { voice_id: defaultVoiceId, voice_source: "ELEVENLABS_DEFAULT_VOICE_ID" as const };
    }
    return { voice_id: "vcAk4fzFbxFxhOhfG9EI", voice_source: "DEFAULT_SINTRAPRIME_VOICE_ID" as const };
  })();
  const model_id_set = Boolean(String(env.ELEVENLABS_MODEL_ID ?? "").trim());
  return {
    api_key_present: Boolean(apiKey),
    voice_id: resolved.voice_id,
    voice_source: resolved.voice_source,
    model_id_set,
    use_last_known_good,
    last_known_good: lastKnownGood,
  };
}

function parseIntOrNull(value: string | undefined | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

type JobCard = {
  job_id: string;
  command: string;
  confidence: { score: number; band: string; action: string };
  regression: { regressed: boolean; requires_ack?: boolean; acknowledged?: boolean; severity?: string };
  policy_state: { allowed: boolean; reason: string };
  autonomy_mode: string;
  last_run: { status: string; exit_code: number | null; at: string | null } | null;
  rank: number;
};

function readJsonSafe(p: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function safeFilePart(input: string): string {
  const s = String(input ?? "");
  const cleaned = s.replace(/[\\/<>:\"|?*\x00-\x1F]/g, "_");
  return cleaned.slice(0, 120);
}

function listRequalificationEventsForFingerprint(fingerprint: string): RequalificationEvent[] {
  const fp = String(fingerprint ?? "").trim();
  if (!fp) return [];

  const dir = path.join(process.cwd(), "runs", "requalification", "events");
  if (!fs.existsSync(dir)) return [];

  const prefix = `${safeFilePart(fp)}.`;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .map((f) => {
      const m = f.match(/\.(\d+)\.json$/);
      const ts = m ? Number(m[1]) : Number.NaN;
      return { f, ts: Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER };
    })
    .sort((a, b) => a.ts - b.ts)
    .map((x) => x.f);

  const out: RequalificationEvent[] = [];
  for (const f of files) {
    const full = path.join(dir, f);
    const raw = readJsonSafe(full);
    if (!raw || typeof raw !== "object") continue;
    const kind = typeof (raw as any).kind === "string" ? String((raw as any).kind) : "";
    if (!kind) continue;
    out.push(raw as any);
  }
  return out;
}

function formatConfidenceViewAscii(rows: Array<{ confidence: number; decision: string; success: string; monotonic: boolean }>) {
  const header = ["Confidence", "Decision", "Success", "Monotonic"] as const;
  const lines: string[] = [];
  lines.push(`${header[0].padEnd(10)}  ${header[1].padEnd(8)}  ${header[2].padEnd(7)}  ${header[3]}`);
  lines.push("----------------------------------------");
  for (const r of rows) {
    const c = r.confidence.toFixed(2).padEnd(10);
    const d = String(r.decision ?? "").padEnd(8);
    const s = String(r.success ?? "").padEnd(7);
    const m = r.monotonic ? "true" : "false";
    lines.push(`${c}  ${d}  ${s}  ${m}`);
  }
  return lines.join("\n");
}

function listConfidenceChecks(): Array<{ execution_id: string; data: any }> {
  const dir = path.join(process.cwd(), "runs", "confidence-checks");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const out: Array<{ execution_id: string; data: any }> = [];
  for (const f of files) {
    const execution_id = f.replace(/\.json$/i, "");
    const full = path.join(dir, f);
    const data = readJsonSafe(full);
    if (data && typeof data === "object") out.push({ execution_id, data });
  }
  return out;
}

function listApprovalsAwaiting(): Array<{ execution_id: string; created_at: string | null; plan_goal: string | null }> {
  const dir = path.join(process.cwd(), "runs", "approvals");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const out: Array<{ execution_id: string; created_at: string | null; plan_goal: string | null }> = [];
  for (const f of files) {
    const full = path.join(dir, f);
    const data = readJsonSafe(full);
    if (!isRecord(data)) continue;
    const status = typeof data.status === "string" ? data.status : null;
    if (status !== "awaiting_approval") continue;
    const execution_id = typeof data.execution_id === "string" ? data.execution_id : f.replace(/\.json$/i, "");
    const created_at = typeof data.created_at === "string" ? data.created_at : null;
    const plan = (data as any).plan;
    const plan_goal = isRecord(plan) && typeof plan.goal === "string" ? plan.goal : null;
    out.push({ execution_id, created_at, plan_goal });
  }
  return out;
}

function listJobsRegistry(): Array<{ job_id: string; command: string; mode: string }> {
  const p = path.join(process.cwd(), "jobs", "registry.json");
  if (!fs.existsSync(p)) return [];
  const raw = readJsonSafe(p);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (!isRecord(x)) return null;
      const job_id = typeof x.job_id === "string" ? x.job_id : null;
      const command = typeof x.command === "string" ? x.command : null;
      const mode = typeof x.mode === "string" ? x.mode : "OFF";
      if (!job_id || !command) return null;
      return { job_id, command, mode };
    })
    .filter(Boolean) as any;
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

// Minimal deterministic plan builders (same contract as /policy score)
function buildPlanForCommand(inner: string, threadId: string, baseUrl: string): any {
  const trimmed = String(inner ?? "").trim();

  const mDb = trimmed.match(/^\/notion\s+(?:db|database)\s+(\S+)\s*$/i);
  if (mDb) {
    const dbId = String(mDb[1] ?? "").trim();
    return {
      kind: "ExecutionPlan",
      execution_id: "exec_operator_db_001",
      threadId,
      dry_run: false,
      goal: `Read Notion database ${dbId}`,
      required_capabilities: ["notion.read.database"],
      agent_versions: { validator: "1.2.0", planner: "1.1.3" },
      assumptions: ["Generated by operator queue"],
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
  }

  const mSet = trimmed.match(/^\/notion\s+set\s+(\S+)\s+([^=\s]+)=(.+)$/i);
  if (mSet) {
    const pageId = String(mSet[1] ?? "").trim();
    const prop = String(mSet[2] ?? "").trim();
    const value = String(mSet[3] ?? "").trim();
    return {
      kind: "ExecutionPlan",
      execution_id: "exec_operator_set_001",
      threadId,
      dry_run: false,
      goal: `Set Notion page property ${prop} on ${pageId}`,
      required_capabilities: ["notion.write.page_property"],
      agent_versions: { validator: "1.2.0", planner: "1.1.3" },
      assumptions: ["Generated by operator queue"],
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
          payload: { properties: { [prop]: value } },
          expects: { http_status: [200], json_paths_present: ["updated"] },
          idempotency_key: null,
        },
      ],
    };
  }

  // /template run is supported by reading templates/registry.json (read-only)
  const mt = trimmed.match(/^\/template\s+run\s+(\S+)\s+([\s\S]+)$/i);
  if (mt) {
    const name = mt[1]!;
    const argsText = mt[2]!;
    const regPath = path.join(process.cwd(), "templates", "registry.json");
    if (!fs.existsSync(regPath)) throw new Error("Missing templates/registry.json");
    const registry = JSON.parse(fs.readFileSync(regPath, "utf8"));
    const tpl = registry?.templates?.[name]?.plan;
    if (!tpl) throw new Error(`Unknown template: ${name}`);
    const args = JSON.parse(argsText);

    // Naive var replace on {{key}} in strings (matches existing behavior enough for smoke)
    const substitute = (v: any): any => {
      if (v === null || v === undefined) return v;
      if (typeof v === "string") {
        return v.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m, key) => {
          if (!(key in args)) throw new Error(`Missing template arg: ${key}`);
          return String(args[key]);
        });
      }
      if (Array.isArray(v)) return v.map(substitute);
      if (typeof v === "object") {
        const out: any = {};
        for (const [k, vv] of Object.entries(v)) out[k] = substitute(vv);
        return out;
      }
      return v;
    };

    const plan = substitute(tpl);
    if (!isRecord(plan) || plan.kind !== "ExecutionPlan") throw new Error("Template plan must be kind=ExecutionPlan");
    (plan as any).threadId = threadId;
    if (!(plan as any).execution_id) (plan as any).execution_id = "exec_operator_template_001";
    return plan;
  }

  throw new Error("/operator queue cannot build a plan for command");
}

function computeGroup(card: JobCard): number {
  const reg = card.regression;
  if (reg.regressed && reg.requires_ack && !reg.acknowledged) return 1;
  if (card.policy_state.reason === "APPROVAL_REQUIRED") return 2;
  if (card.confidence.action === "AUTO_RUN" && card.policy_state.allowed) return 3;
  if (card.autonomy_mode === "PROPOSE_ONLY_AUTONOMY") return 4;
  if (!card.policy_state.allowed) return 5;
  if (card.last_run && card.last_run.status === "success") return 6;
  return 6;
}

function rankJobs(jobs: JobCard[]): JobCard[] {
  const withMeta = jobs.map((j) => {
    const group = computeGroup(j);
    const waitingAt = j.last_run?.at ? new Date(j.last_run.at).getTime() : Number.POSITIVE_INFINITY;
    const t = Number.isFinite(waitingAt) ? waitingAt : Number.POSITIVE_INFINITY;
    return { j, group, t };
  });

  withMeta.sort((a, b) => {
    if (a.group !== b.group) return a.group - b.group;
    if (b.j.confidence.score !== a.j.confidence.score) return b.j.confidence.score - a.j.confidence.score;
    if (a.t !== b.t) return a.t - b.t;
    return a.j.job_id.localeCompare(b.j.job_id);
  });

  return withMeta.map((x, idx) => ({ ...x.j, rank: idx + 1 }));
}

function policyReasonFromSim(sim: any): { allowed: boolean; reason: string } {
  const decision = String(sim?.decision ?? "");
  if (decision === "ALLOWED") return { allowed: true, reason: "ALLOWED" };
  if (decision === "APPROVAL_REQUIRED") return { allowed: false, reason: "APPROVAL_REQUIRED" };
  return { allowed: false, reason: "DENIED" };
}

function jobCardFromConfidenceCheck(item: { execution_id: string; data: any }): JobCard | null {
  const d = item.data;
  if (!isRecord(d)) return null;
  const kind = typeof d.kind === "string" ? d.kind : null;
  if (kind !== "ConfidenceRegressionCheck") return null;

  const cmd = typeof (d as any).command === "string" ? (d as any).command : null;
  const current = (d as any).current;
  const regression = (d as any).regression;

  if (!cmd || !isRecord(current) || !isRecord(regression)) return null;

  const confidence = {
    score: typeof current.score === "number" ? current.score : 0,
    band: typeof current.band === "string" ? current.band : "LOW",
    action: typeof current.action === "string" ? current.action : "HUMAN_REVIEW_REQUIRED",
  };

  const regressed = Boolean((regression as any).regressed);
  const requires_ack = Boolean((regression as any).requires_ack);
  const acknowledged = Boolean((regression as any).acknowledged);
  const severity = typeof (regression as any).severity === "string" ? (regression as any).severity : undefined;

  const autonomy_mode = typeof (d as any).autonomy_mode === "string" ? (d as any).autonomy_mode : "OFF";

  const policy_reason = typeof (d as any).policy_state_reason === "string" ? (d as any).policy_state_reason : "HUMAN_REVIEW_REQUIRED";
  const policy_allowed = Boolean((d as any).policy_state_allowed);

  return {
    job_id: `confidence_${item.execution_id}`,
    command: cmd,
    confidence,
    regression: { regressed, requires_ack, acknowledged, severity },
    policy_state: { allowed: policy_allowed, reason: policy_reason },
    autonomy_mode,
    last_run: null,
    rank: 0,
  };
}

function jobCardFromApproval(item: { execution_id: string; created_at: string | null; plan_goal: string | null }): JobCard {
  return {
    job_id: item.execution_id,
    command: item.plan_goal ?? "Approval pending",
    confidence: { score: 0, band: "LOW", action: "PROPOSE_FOR_APPROVAL" },
    regression: { regressed: false },
    policy_state: { allowed: false, reason: "APPROVAL_REQUIRED" },
    autonomy_mode: "APPROVAL_GATED_AUTONOMY",
    last_run: { status: "paused", exit_code: 4, at: item.created_at },
    rank: 0,
  };
}

async function jobCardFromRegistry(job: { job_id: string; command: string; mode: string }): Promise<JobCard> {
  const threadId = (process.env.THREAD_ID || "local_test_001").trim();
  const baseUrl = String(process.env.NOTION_API_BASE || "http://localhost:8787").trim() || "http://localhost:8787";
  const at = new Date(process.env.SMOKE_FIXED_NOW_ISO || nowIso());
  const autonomyMode = job.mode;
  const env: NodeJS.ProcessEnv = { ...process.env, AUTONOMY_MODE: autonomyMode };

  // Build plan, simulate policy, then score (pure in-memory)
  let plan: any;
  try {
    plan = buildPlanForCommand(job.command, threadId, baseUrl);
  } catch {
    // If we cannot build deterministically, list as proposal-only placeholder.
    return {
      job_id: job.job_id,
      command: job.command,
      confidence: { score: 0, band: "LOW", action: "HUMAN_REVIEW_REQUIRED" },
      regression: { regressed: false },
      policy_state: { allowed: false, reason: "PROPOSE_ONLY" },
      autonomy_mode: autonomyMode,
      last_run: null,
      rank: 0,
    };
  }

  const { simulatePolicy } = await import("../policy/simulatePolicy.js");
  const { extractScoreFeatures } = await import("../policy/extractScoreFeatures.js");
  const { scorePolicy } = await import("../policy/scorePolicy.js");

  const sim = simulatePolicy({ plan, command: job.command, env, at, autonomy_mode: autonomyMode, approval: false });
  const policy_state = policyReasonFromSim(sim);

  const requiredCaps = Array.isArray(plan?.required_capabilities)
    ? plan.required_capabilities.filter((c: any) => typeof c === "string")
    : [];
  const capResolution = resolveCapabilityProviders(requiredCaps);

  const features = extractScoreFeatures({
    plan,
    policy_simulation: sim,
    capabilities_resolved: capResolution.capabilities_resolved,
    unresolved_capabilities: capResolution.unresolved,
    policy_env: env,
  });

  const scored = scorePolicy({
    target: job.command,
    evaluated_at: at.toISOString(),
    policy_simulation: { would_run: sim.would_run, decision: sim.decision === "ALLOWED" ? "ELIGIBLE" : sim.decision, reasons: (sim as any).reasons },
    features,
    obs: undefined,
  });

  return {
    job_id: job.job_id,
    command: job.command,
    confidence: {
      score: scored.confidence.score,
      band: scored.confidence.band,
      action: scored.confidence.action,
    },
    regression: { regressed: false },
    policy_state,
    autonomy_mode: autonomyMode,
    last_run: null,
    rank: 0,
  };
}

function parseOperatorCommand(command: string):
  | { kind: "OperatorQueue" }
  | { kind: "OperatorJob"; job_id: string }
  | { kind: "OperatorStats" }
  | { kind: "OperatorRank"; window_days: number }
  | { kind: "OperatorSpeechStatus" }
  | { kind: "OperatorSpeechCheck" }
  | { kind: "OperatorSpeechPing"; message: string | null }
  | { kind: "OperatorSpeechPlay"; args: string }
  | { kind: "OperatorSpeechSinkSet"; sink: string }
  | { kind: "OperatorPolicyRegressions" }
  | { kind: "OperatorConfidencePeek"; fingerprint: string }
  | { kind: "OperatorConfidenceView"; fingerprint: string }
  | { kind: "OperatorConfidenceCurve"; fingerprint: string }
  | { kind: "OperatorPolicySimulate"; args: string }
  | { kind: "OperatorCourtExport"; args: string }
  | { kind: "OperatorRepoStatus" }
  | null {
  const trimmed = command.trim();
  const mQueue = trimmed.match(/^\/operator\s+queue\s*$/i);
  if (mQueue) return { kind: "OperatorQueue" };
  const mJob = trimmed.match(/^\/operator\s+job\s+(\S+)\s*$/i);
  if (mJob) return { kind: "OperatorJob", job_id: mJob[1]! };
  const mStats = trimmed.match(/^\/operator\s+stats\s*$/i);
  if (mStats) return { kind: "OperatorStats" };
  const mRank = trimmed.match(/^\/operator\s+rank(?:\s+(\d+))?\s*$/i);
  if (mRank) {
    const rawDays = mRank[1] ? Number.parseInt(mRank[1], 10) : 7;
    const window_days = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 7;
    return { kind: "OperatorRank", window_days };
  }
  const mSpeechStatus = trimmed.match(/^\/operator\s+speech-status\s*$/i);
  if (mSpeechStatus) return { kind: "OperatorSpeechStatus" };
  const mSpeechCheck = trimmed.match(/^\/operator\s+speech-check\s*$/i);
  if (mSpeechCheck) return { kind: "OperatorSpeechCheck" };
  const mSpeechPing = trimmed.match(/^\/operator\s+speech-ping(?:\s+([\s\S]+))?$/i);
  if (mSpeechPing) return { kind: "OperatorSpeechPing", message: mSpeechPing[1] ? String(mSpeechPing[1]).trim() : null };
  const mSpeechPlay = trimmed.match(/^\/operator\s+speech-play\b([\s\S]*)$/i);
  if (mSpeechPlay) return { kind: "OperatorSpeechPlay", args: String(mSpeechPlay[1] ?? "").trim() };
  const mSpeechSinkSet = trimmed.match(/^\/operator\s+speech-sink\s+set\s+(\S+)\s*$/i);
  if (mSpeechSinkSet) return { kind: "OperatorSpeechSinkSet", sink: mSpeechSinkSet[1]! };
  const mPolicyRegressions = trimmed.match(/^\/operator\s+policy-regressions\s*$/i);
  if (mPolicyRegressions) return { kind: "OperatorPolicyRegressions" };
  const mConfidencePeek = trimmed.match(/^\/operator\s+confidence\s+peek\s+([\s\S]+)$/i);
  if (mConfidencePeek) return { kind: "OperatorConfidencePeek", fingerprint: String(mConfidencePeek[1] ?? "").trim() };
  const mConfidenceView = trimmed.match(/^\/operator\s+confidence-view\s+([\s\S]+)$/i);
  if (mConfidenceView) return { kind: "OperatorConfidenceView", fingerprint: String(mConfidenceView[1] ?? "").trim() };
  const mConfidenceCurve = trimmed.match(/^\/operator\s+confidence-curve\s+([\s\S]+)$/i);
  if (mConfidenceCurve) return { kind: "OperatorConfidenceCurve", fingerprint: String(mConfidenceCurve[1] ?? "").trim() };
  const mPolicySim = trimmed.match(/^\/operator\s+policy-simulate\b([\sS]*)$/i);
  if (mPolicySim) return { kind: "OperatorPolicySimulate", args: String(mPolicySim[1] ?? "").trim() };
  const mCourtExport = trimmed.match(/^\/operator\s+court-export\b([\sS]*)$/i);
  if (mCourtExport) return { kind: "OperatorCourtExport", args: String(mCourtExport[1] ?? "").trim() };
  const mRepoStatus = trimmed.match(/^\/operator\s+repo-status\s*$/i);
  if (mRepoStatus) return { kind: "OperatorRepoStatus" };
  return null;
}

function parseFlagValue(args: string, flag: string): string | null {
  const raw = String(args ?? "");
  const f = String(flag ?? "");
  if (!f) return null;

  const eq = raw.match(new RegExp(`(?:^|\\s)${f}=([^\\s]+)`));
  if (eq?.[1]) return String(eq[1]).trim();

  const spaced = raw.match(new RegExp(`(?:^|\\s)${f}\\s+([^\\s]+)`));
  if (spaced?.[1]) return String(spaced[1]).trim();

  return null;
}

function parseSpeechPlayArgs(rawArgs: string): SpeechPlayArgs {
  const args = String(rawArgs ?? "").trim();
  const dryRun = /(?:^|\s)--dry-run(?:\s|$)/i.test(args);

  // Accept either:
  //   latest
  //   --since <ISO>
  //   --since=<ISO>
  const since = parseFlagValue(args, "--since");

  const tokens = args
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const sub = tokens.find((t) => !t.startsWith("--"));

  if (String(sub ?? "").toLowerCase() === "latest") {
    return { mode: "latest", dryRun, source: "operator" };
  }

  if (since) {
    return { mode: "since", since, dryRun, source: "operator" };
  }

  throw new Error("Usage: /operator speech-play latest | /operator speech-play --since <ISO-8601> [--dry-run]");
}

function parseOperatorSpeechPingArgs(rawMessage: string | null): {
  emit: boolean;
  text: string;
} {
  const raw = String(rawMessage ?? "").trim();

  // Safe default: speech-ping is simulation unless explicitly overridden.
  // Supports either:
  //   /operator speech-ping --emit Your message
  //   /operator speech-ping Your message --emit
  const parts = raw.split(/\s+/).filter(Boolean);
  const normalize = (p: string) =>
    p
      .toLowerCase()
      .trim()
      // Allow quotes / punctuation around flags (common when invoked through multiple shells).
      .replace(/^["']+/, "")
      .replace(/["']+$/, "")
      .replace(/[,:;]+$/, "");

  const emit = parts.some((p) => normalize(p) === "--emit");
  const text = parts
    .filter((p) => normalize(p) !== "--emit")
    .join(" ")
    .trim();

  return {
    emit,
    text: text || "Speech system online.",
  };
}

(async () => {
  try {
    const raw = getArgCommand();
    const parsed = parseOperatorCommand(raw);
    if (!parsed) {
      throw new Error(
        "Usage: /operator queue | /operator job <job_id> | /operator stats | /operator rank [days] | /operator speech-status | /operator speech-check | /operator speech-ping [--emit] [message] | /operator speech-play latest | /operator speech-play --since <ISO-8601> [--dry-run] | /operator speech-sink set <console|os-tts|elevenlabs> | /operator policy-regressions | /operator confidence peek <fingerprint> | /operator confidence-view <fingerprint> | /operator confidence-curve <fingerprint> | /operator policy-simulate --policy <name> --confidence <csv> | /operator court-export | /operator repo-status"
      );
    }

    if (parsed.kind === "OperatorRank") {
      const ranking = computeOperatorRanking({ windowDays: parsed.window_days });
      const artifact = writeOperatorRankingArtifact(ranking);
      process.stdout.write(JSON.stringify({ ...ranking, artifact }, null, 0));
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorRepoStatus") {
      const out = getRepoStatus(process.cwd());
      console.log(JSON.stringify(out, null, 2));
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorCourtExport") {
      const started_at = deterministicNowIso();
      const args = String((parsed as any).args ?? "");

      const capability = parseFlagValue(args, "--capability");
      const as_of = parseFlagValue(args, "--as-of") ?? "latest";
      const format = parseFlagValue(args, "--format") ?? "pdf";
      const seal = /(?:^|\s)--seal(?:\s|$)/i.test(args);

      const res = await cmdCourtExport({
        at_iso: started_at,
        capability: capability ?? undefined,
        as_of,
        format,
        seal,
      } as any);
      const finished_at = deterministicNowIso();

      const status = res.ok ? ("success" as const) : ("denied" as const);
      const artifacts = {
        court_export: {
          export_id: res.export_id,
          out_dir: res.out_dir,
          manifest_path: res.manifest_path,
          index_pdf_path: res.ok ? res.index_pdf_path : null,
          denial_path: res.ok ? null : ((res as any).denial_path ?? null),
          latest_written: res.ok ? res.latest_written : null,
        },
      };

      await persistRun({
        kind: "CourtExportReceipt" as any,
        execution_id: res.export_id as any,
        threadId: null as any,
        status: status as any,
        started_at,
        finished_at,
        artifacts: artifacts as any,
        receipt: {
          tier: "24.2",
          domain: "court-export",
          input_sources: res.input_sources,
          files: res.files,
        },
      } as any);

      if (!res.ok) {
        console.log(
          JSON.stringify(
            {
              kind: "PolicyDenied",
              code: "COURT_EXPORT_MISSING_LATEST",
              reason: (res as any).reason,
              export_id: res.export_id,
              artifacts,
            },
            null,
            2
          )
        );
        process.exitCode = 3;
        return;
      }

      console.log(
        JSON.stringify(
          {
            kind: "CourtExport",
            ok: true,
            export_id: res.export_id,
            out_dir: res.out_dir,
            manifest_path: res.manifest_path,
            index_pdf_path: res.index_pdf_path,
            latest_written: res.latest_written,
            artifacts,
          },
          null,
          2
        )
      );
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorPolicyRegressions") {
      const { runOperatorPolicyRegressions } = await import("./run-operator-policy-regressions.js");
      const code = runOperatorPolicyRegressions();
      process.exitCode = code;
      return;
    }

    if (parsed.kind === "OperatorConfidencePeek") {
      const fp = String(parsed.fingerprint ?? "").trim();
      if (!fp) throw new Error("Usage: /operator confidence peek <fingerprint>");

      const runsDir = String(process.env.RUNS_DIR ?? "runs").trim() || "runs";
      const eff = getEffectiveConfidence(runsDir, fp);

      console.log(
        JSON.stringify(
          {
            kind: "ConfidencePeek",
            fingerprint: fp,
            raw_confidence: eff.raw_confidence,
            decayed_confidence: eff.decayed_confidence,
            age_ms: eff.age_ms,
            updated_at: eff.updated_at,
          },
          null,
          2
        )
      );
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorConfidenceView") {
      const fp = String(parsed.fingerprint ?? "").trim();
      if (!fp) throw new Error("Usage: /operator confidence-view <fingerprint>");

      const events = listRequalificationEventsForFingerprint(fp);
      const view = confidenceDecisionView(events);

      // Keep JSON as the source of truth; embed a deterministic ASCII rendering for humans.
      const ascii = formatConfidenceViewAscii(
        view.map((r) => ({
          confidence: r.confidence,
          decision: r.decision,
          success: r.success,
          monotonic: r.monotonic,
        }))
      );

      console.log(
        JSON.stringify(
          {
            kind: "OperatorConfidenceView",
            generated_at: nowIso(),
            fingerprint: fp,
            rows: view,
            ascii,
          },
          null,
          2
        )
      );
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorConfidenceCurve") {
      const fp = String(parsed.fingerprint ?? "").trim();
      if (!fp) {
        deny("MISSING_FINGERPRINT", "Fingerprint required for confidence-curve");
        return;
      }

      const history = loadConfidenceHistory(fp);
      const events = history.map((h) => ({
        confidence: h.confidence,
        decision: h.allowed ? ("ALLOW" as const) : ("DENY" as const),
      }));

      console.log(
        JSON.stringify(
          {
            kind: "OperatorView",
            fingerprint: fp,
            curve: renderConfidenceCurve(events),
            status: history.at(-1)?.status ?? "UNKNOWN",
          },
          null,
          2
        )
      );

      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorPolicySimulate") {
      const policy = parseFlagValue(parsed.args, "--policy");
      const csv = parseFlagValue(parsed.args, "--confidence");

      if (!policy) {
        deny("MISSING_POLICY", "--policy is required");
        return;
      }

      if (!csv) {
        deny("MISSING_CONFIDENCE", "--confidence is required");
        return;
      }

      const confidences = csv
        .split(",")
        .map((s) => Number(String(s).trim()))
        .filter((n) => Number.isFinite(n));

      if (!confidences.length) {
        deny("MISSING_CONFIDENCE", "--confidence must contain at least one number");
        return;
      }

      const { simulateOperatorPolicy } = await import("../policy/simulateOperatorPolicy.js");
      const results = confidences.map((c) => simulateOperatorPolicy({ policy, confidence: c }));

      const curve = results.map((r) => ({
        x: r.confidence,
        y: r.decision === "ALLOW" ? 1 : 0,
        reason: r.reason,
      }));

      const curve_ascii = renderConfidenceCurve(results.map((r) => ({ confidence: r.confidence, decision: r.decision })));

      console.log(
        JSON.stringify(
          {
            kind: "PolicySimulation",
            policy,
            results,
            curve,
            curve_ascii,
          },
          null,
          2
        )
      );
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorQueue") {
      const checks = listConfidenceChecks().map(jobCardFromConfidenceCheck).filter(Boolean) as JobCard[];
      const approvals = listApprovalsAwaiting().map(jobCardFromApproval);
      const jobs = (await Promise.all(listJobsRegistry().map(jobCardFromRegistry))).filter(Boolean) as JobCard[];

      const ranked = rankJobs([...checks, ...approvals, ...jobs]);

      console.log(
        JSON.stringify(
          {
            kind: "OperatorQueue",
            generated_at: nowIso(),
            jobs: ranked,
          },
          null,
          2
        )
      );
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorStats") {
      const checks = listConfidenceChecks();
      const approvals = listApprovalsAwaiting();
      const regressed = checks.filter((x) => Boolean((x.data as any)?.regression?.regressed)).length;
      const out = {
        kind: "OperatorStats",
        generated_at: nowIso(),
        approvals_awaiting: approvals.length,
        regressions: regressed,
      };
      console.log(JSON.stringify(out, null, 2));
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorSpeechStatus") {
      const state = readOperatorState();
      const desiredSink = state.speech_sink ?? parseCurrentSink();
      const sink = effectiveSinkName(desiredSink);
      const fingerprint = String(process.env.THREAD_ID ?? "speech").trim() || "speech";
      const gate = getSpeechGateStatus(fingerprint);

      const prime_speech_tier = String(process.env.PRIME_SPEECH_TIER ?? "local").trim() || "local";

      const out = {
        kind: "OperatorSpeechStatus",
        generated_at: nowIso(),
        cwd: process.cwd(),
        operator_state_path: getOperatorStatePath(),
        enabled: envEnabled(),
        prime_speech_tier,
        desired_sink: desiredSink,
        sink,
        operator_state_updated_at: state.updated_at,
        budget_remaining: gate.budget_remaining,
        silence_until: gate.silence_until,
        last_deny_reason: gate.last_deny_reason,
        debug_enabled: process.env.SPEECH_DEBUG === "1",
      };

      console.log(JSON.stringify(out, null, 2));
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorSpeechCheck") {
      const state = readOperatorState();
      const operator_sink = state.speech_sink ?? null;

      const prime_speech_tier = String(process.env.PRIME_SPEECH_TIER ?? "local").trim() || "local";
      const elevenlabs_tier_enabled = prime_speech_tier.toLowerCase() === "elevenlabs";

      const requested_order = resolveSpeechFallbackOrder({ operator_sink, env: process.env });
      const sinks = (() => {
        try {
          return loadSpeechSinks({ ...process.env, SPEECH_SINKS: requested_order.join(",") });
        } catch {
          return loadSpeechSinks({ ...process.env, SPEECH_SINKS: "console" });
        }
      })();

      const fingerprint = String(process.env.THREAD_ID ?? "speech").trim() || "speech";
      const gate = getSpeechGateStatus(fingerprint);

      const el = resolveElevenLabsConfigSummary(process.env);
      const artifacts = {
        runs: canWriteDir(path.join(process.cwd(), "runs")),
        speech_audio: canWriteDir(path.join(process.cwd(), "runs", "speech-audio")),
        speech_delta: canWriteDir(path.join(process.cwd(), "runs", "speech-delta")),
      };

      const out = {
        kind: "OperatorSpeechCheck",
        generated_at: nowIso(),
        cwd: process.cwd(),
        operator_state_path: getOperatorStatePath(),
        operator_state_updated_at: state.updated_at,
        enabled: envEnabled(),
        prime_speech_tier,
        fingerprint,
        gate,
        sinks: {
          operator_sink,
          env_speech_sinks: String(process.env.SPEECH_SINKS ?? "").trim() || null,
          requested_order,
          configured_order: sinks.map((s) => s.name),
        },
        elevenlabs: el,
        elevenlabs_tier_enabled,
        budgets: {
          voice_budget: parseIntOrNull(process.env.SPEECH_VOICE_BUDGET),
          max_per_minute: parseIntOrNull(process.env.SPEECH_MAX_PER_MINUTE),
          sink_fallback_timeout_ms: parseIntOrNull(process.env.SPEECH_SINK_FALLBACK_TIMEOUT_MS) ?? 2500,
        },
        speech_delta: {
          delta_only: process.env.SPEECH_DELTA_ONLY === "1",
          persist: process.env.SPEECH_DELTA_PERSIST === "1",
          ttl_ms: parseIntOrNull(process.env.SPEECH_DELTA_TTL_MS) ?? 24 * 60 * 60 * 1000,
        },
        artifacts,
        debug_enabled: process.env.SPEECH_DEBUG === "1",
      };

      console.log(JSON.stringify(out, null, 2));
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorSpeechPing") {
      const state = readOperatorState();
      const operator_sink = state.speech_sink ?? null;

      const requested_order = resolveSpeechFallbackOrder({ operator_sink, env: process.env });
      const sinks = (() => {
        try {
          return loadSpeechSinks({ ...process.env, SPEECH_SINKS: requested_order.join(",") });
        } catch {
          return loadSpeechSinks({ ...process.env, SPEECH_SINKS: "console" });
        }
      })();

      // Pick a category that is allowed under SPEECH_CATEGORIES allowlist, if one is set.
      const allowCats = parseCsv(process.env.SPEECH_CATEGORIES);
      const category = allowCats.length ? allowCats[0]! : "confidence";

      const allowEmitEnv = String(process.env.OPERATOR_ALLOW_SPEECH ?? "").trim() === "1";
      const ping = parseOperatorSpeechPingArgs(parsed.message);
      const allowEmit = allowEmitEnv || ping.emit;
      const text = ping.text;
      const fingerprint = "operator_speech_ping";
      const threadId = String(process.env.THREAD_ID ?? "operator_speech_ping").trim() || "operator_speech_ping";

      const enabled = envEnabled();
      const out = {
        kind: "OperatorSpeechPing",
        generated_at: nowIso(),
        enabled,
        requested: {
          operator_sink,
          env_speech_sinks: String(process.env.SPEECH_SINKS ?? "").trim() || null,
          requested_order,
        },
        resolved: {
          configured_order: sinks.map((s) => s.name),
        },
        emitted: {
          attempted: enabled,
          category,
          threadId,
          fingerprint,
          text_preview: text.slice(0, 140),
          simulation: !allowEmit,
          allow_emit_env: allowEmitEnv,
        },
      };

      // Emit speech via the existing choke point in simulation mode:
      // - uses operator sink + fallback
      // - no budgets/counters/artifacts
      // - stderr-only output (stdout remains JSON-only)
      try {
        if (enabled) {
          speak({
            text,
            category,
            threadId,
            fingerprint,
            meta: { autoplay_requested: allowEmit, source: "operator" },
            simulation: !allowEmit,
          });
        }
      } catch {
        // fail-open
      }

      console.log(JSON.stringify(out, null, 2));
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorSpeechPlay") {
      const speechArgs = parseSpeechPlayArgs(parsed.args);
      const ctx: OperatorContext = {
        repoRoot: findRepoRoot(process.cwd()),
        nowIso,
      };

      const res = await operatorSpeechPlay(speechArgs, ctx);
      console.log(JSON.stringify(res, null, 2));
      process.exitCode = 0;
      return;
    }

    if (parsed.kind === "OperatorSpeechSinkSet") {
      const desiredRaw = String(parsed.sink ?? "").trim();
      const desired = parseSpeechSinkName(desiredRaw);
      if (!desired) {
        deny("UNKNOWN_SPEECH_SINK", `Unknown speech sink: ${desiredRaw}`);
        return;
      }

      const available = (() => {
        try {
          const sinks = loadSpeechSinks({ ...process.env, SPEECH_SINKS: desired });
          return sinks.some((s) => s.name === desired);
        } catch {
          return false;
        }
      })();

      if (!available) {
        deny("SPEECH_SINK_UNAVAILABLE", `Speech sink unavailable: ${desired}`);
        return;
      }

      const prior = readOperatorState().speech_sink;
      const updated_at = nowIso();
      const execution_id = `operator_speech_sink_${Date.now()}`;

      writeOperatorSpeechSink({ sink: desired, updated_at });
      const artifact = writeOperatorSpeechSinkArtifact({
        execution_id,
        updated_at,
        sink: desired,
        prior_sink: prior,
      });

      const out = {
        kind: "OperatorSpeechSinkSet",
        execution_id,
        updated_at,
        sink: desired,
        prior_sink: prior,
        artifact: artifact.file,
      };
      console.log(JSON.stringify(out, null, 2));
      process.exitCode = 0;
      return;
    }

    // OperatorJob: minimal drill-down (read-only)
    const out = {
      kind: "OperatorJob",
      job_id: parsed.job_id,
      generated_at: nowIso(),
      note: "Not implemented in Tier-17 smoke vectors",
    };
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 0;
  } catch (err: any) {
    process.exitCode = 1;
    console.error(err?.message ? String(err.message) : String(err));
  }
})();



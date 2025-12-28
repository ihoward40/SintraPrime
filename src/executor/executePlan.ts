import type { ExecutionPlan, ExecutionStep } from "../schemas/ExecutionPlan.schema.js";
import { ExecutionPlanSchema } from "../schemas/ExecutionPlan.schema.js";
import crypto from "node:crypto";
import { computePlanHash } from "../utils/planHash.js";
import { proposeStatus } from "../analysis/proposeStatus.js";
import { notionLiveGet } from "../adapters/notionLiveRead.js";
import { notionLivePatchWithIdempotency, notionLiveRequestWithIdempotency } from "../adapters/notionLiveWrite.js";
import { writeNotionLiveWriteArtifact } from "../artifacts/writeNotionLiveWriteArtifact.js";
import { getIdempotencyRecord, writeIdempotencyRecord } from "../idempotency/idempotencyLedger.js";
import { kernelBus } from "../kernel/kernelBus.js";
import { redactSecretsDeep, secretsFromJsonObject } from "../utils/redactSecrets.js";
import { redactSecretsInString } from "../utils/redactSecrets.js";
import { getBrowserAllowOverrides, loadPolicyOverridesSync } from "../policy/policyOverrides.js";
// --- Court-grade enhancements ---
import { tsaTimestamp } from "../crypto/tsa.js";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
// Placeholder: import { verifyAuditorKey } from "../public/auditorAuth.js";
import PDFDocument from "pdfkit";

type ShellStep = Extract<ExecutionStep, { adapter: "ShellAdapter" }>;
type HttpStep = Exclude<ExecutionStep, ShellStep>;

type BrowserStep = Extract<ExecutionStep, { adapter: "BrowserAgent" }>;

function isShellStep(step: ExecutionStep): step is ShellStep {
  return (step as any)?.adapter === "ShellAdapter";
}

function isBrowserStep(step: ExecutionStep): step is BrowserStep {
  return (step as any)?.adapter === "BrowserAgent";
}

let cachedBrowserAllowlist: Set<string> | null = null;

async function getBrowserAllowlist(): Promise<Set<string>> {
  if (cachedBrowserAllowlist) return cachedBrowserAllowlist;
  try {
    const { loadBrowserAllowlist } = await import("../adapters/browser-agent.js");
    const base = await loadBrowserAllowlist({ cwd: process.cwd() });
    const overrides = loadPolicyOverridesSync({ cwd: process.cwd(), now: new Date() });
    const extra = getBrowserAllowOverrides(overrides);
    cachedBrowserAllowlist = new Set([...Array.from(base), ...extra].map((s) => String(s).toLowerCase()));
    return cachedBrowserAllowlist;
  } catch {
    cachedBrowserAllowlist = new Set();
    return cachedBrowserAllowlist;
  }
}

async function ensureStepArtifactDir(params: { execution_id: string; step_index: number }): Promise<string> {
  const base = path.join(process.cwd(), "runs", safeRunDirPart(params.execution_id));
  await fs.mkdir(base, { recursive: true });
  const padded = String(params.step_index).padStart(2, "0");
  const stepDirPadded = path.join(base, `step-${padded}`);
  const stepDirLegacy = path.join(base, `step-${params.step_index}`);
  await fs.mkdir(stepDirPadded, { recursive: true });
  await fs.mkdir(stepDirLegacy, { recursive: true });
  return stepDirPadded;
}

let cachedRedactSecrets: string[] | null = null;
let cachedRedactPath: string | null = null;

async function getRedactionSecrets(): Promise<string[]> {
  const p = typeof process.env.SINTRAPRIME_REDACT_SECRETS_PATH === "string" ? process.env.SINTRAPRIME_REDACT_SECRETS_PATH.trim() : "";
  if (!p) return [];

  if (cachedRedactPath === p && Array.isArray(cachedRedactSecrets)) {
    return cachedRedactSecrets;
  }

  try {
    const raw = await fs.readFile(p, "utf8");
    const obj = JSON.parse(raw);
    const secrets = secretsFromJsonObject(obj);
    cachedRedactPath = p;
    cachedRedactSecrets = secrets;
    return secrets;
  } catch {
    cachedRedactPath = p;
    cachedRedactSecrets = [];
    return [];
  }
}

type RunStatus =
  | "running"
  | "success"
  | "failed"
  | "denied"
  | "awaiting_approval"
  | "rejected"
  | "throttled";

type StepStatus = "success" | "failed" | "skipped";

function safeRunDirPart(input: string): string {
  // Windows-safe: execution IDs often contain ':' which is forbidden in filenames.
  return String(input ?? "").replace(/[\\/<>:\"|?*\x00-\x1F]/g, "_").slice(0, 160);
}

async function maybeWriteWorkflowStepReceipt(params: {
  enabled: boolean;
  execution_id: string;
  step_index: number;
  stepLog: StepRunLog;
}) {
  if (!params.enabled) return;
  if (!params.execution_id) return;
  if (!Number.isFinite(params.step_index) || params.step_index <= 0) return;

  try {
    const base = path.join(process.cwd(), "runs", safeRunDirPart(params.execution_id));
    await fs.mkdir(base, { recursive: true });

    const padded = String(params.step_index).padStart(2, "0");
    const stepDirPadded = path.join(base, `step-${padded}`);
    const stepDirLegacy = path.join(base, `step-${params.step_index}`);
    await fs.mkdir(stepDirPadded, { recursive: true });
    await fs.mkdir(stepDirLegacy, { recursive: true });
    const outPath = path.join(stepDirPadded, "receipt.json");
    const outPathLegacy = path.join(stepDirLegacy, "receipt.json");

    const receipt = {
      adapter: params.stepLog.adapter ?? null,
      action: params.stepLog.action,
      status: params.stepLog.status,
      method: (params.stepLog as any).method ?? null,
      url: (params.stepLog as any).url ?? null,
      http_status: params.stepLog.http_status,
      exit_code: (params.stepLog as any).exit_code ?? null,
      stdout: (params.stepLog as any).stdout ?? null,
      stderr: (params.stepLog as any).stderr ?? null,
      started_at: params.stepLog.started_at,
      finished_at: params.stepLog.finished_at,
      duration_ms: params.stepLog.duration_ms,
      expectations: params.stepLog.expectations,
      error: params.stepLog.error ?? null,
      response: params.stepLog.response,
    };

    await fs.writeFile(outPath, JSON.stringify(receipt, null, 2) + "\n");
    await fs.writeFile(outPathLegacy, JSON.stringify(receipt, null, 2) + "\n");
    await fs.appendFile(
      path.join(base, "run.log"),
      `${JSON.stringify({ kind: "StepReceipt", step_index: params.step_index, ...receipt })}\n`
    );
  } catch {
    // Best-effort; step receipt writes must never affect execution semantics.
  }
}

export type StepRunLog = {
  step_id: string;
  action: string;
  adapter: ExecutionStep["adapter"];
  method?: any;
  url?: any;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  status: StepStatus;
  http_status: number | null;
  exit_code?: number | null;
  stdout?: string;
  stderr?: string;
  response: unknown;
  expectations: {
    http_status_expected?: number[];
    http_status_ok?: boolean;
    json_paths_present?: string[];
    json_paths_ok?: boolean;
    exit_code_expected?: number[];
    exit_code_ok?: boolean;
  };
  error?: string;
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

async function executeStep(step: HttpStep, timeoutMs: number) {
  const headers: Record<string, string> = { ...(((step as any).headers ?? {}) as Record<string, string>) };

  const idk = (step as any).idempotency_key;
  if (idk && !hasHeader(headers, "Idempotency-Key")) {
    headers["Idempotency-Key"] = String(idk);
  }

  const method = String((step as any).method || "GET").toUpperCase();

  let body: string | undefined;
  const payload = (step as any).payload;
  if (methodAllowsBody(method) && payload !== undefined && payload !== null) {
    if (typeof payload === "string") {
      body = payload;
    } else {
      if (!hasHeader(headers, "Content-Type")) {
        headers["Content-Type"] = "application/json";
      }
      body = JSON.stringify(payload);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(String((step as any).url), {
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

function clipUtf8(input: Buffer, maxBytes: number): string {
  if (input.byteLength <= maxBytes) return input.toString("utf8");
  return input.subarray(0, maxBytes).toString("utf8") + `\n...[truncated ${input.byteLength - maxBytes} bytes]`;
}

async function runShellCommand(params: {
  command: string;
  shell: "bash" | "pwsh" | "sh";
  cwd: string;
  env?: Record<string, string>;
  timeoutMs: number;
}) {
  const maxCapture = 200_000; // bytes per stream

  const child = (() => {
    if (params.shell === "pwsh") {
      return spawn("pwsh", ["-NoProfile", "-Command", params.command], {
        cwd: params.cwd,
        env: { ...process.env, ...(params.env ?? {}) },
        windowsHide: true,
      });
    }
    if (params.shell === "sh") {
      return spawn("sh", ["-lc", params.command], {
        cwd: params.cwd,
        env: { ...process.env, ...(params.env ?? {}) },
        windowsHide: true,
      });
    }
    // default bash
    return spawn("bash", ["-lc", params.command], {
      cwd: params.cwd,
      env: { ...process.env, ...(params.env ?? {}) },
      windowsHide: true,
    });
  })();

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;

  child.stdout?.on("data", (b: Buffer) => {
    if (stdoutBytes >= maxCapture) return;
    const take = Math.min(b.byteLength, maxCapture - stdoutBytes);
    stdoutChunks.push(b.subarray(0, take));
    stdoutBytes += take;
  });
  child.stderr?.on("data", (b: Buffer) => {
    if (stderrBytes >= maxCapture) return;
    const take = Math.min(b.byteLength, maxCapture - stderrBytes);
    stderrChunks.push(b.subarray(0, take));
    stderrBytes += take;
  });

  const timeout = setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch {
      // ignore
    }
  }, params.timeoutMs);

  try {
    const exitCode: number = await new Promise((resolve, reject) => {
      child.on("error", (e) => reject(e));
      child.on("close", (code) => resolve(typeof code === "number" ? code : 0));
    });

    const stdout = clipUtf8(Buffer.concat(stdoutChunks), maxCapture);
    const stderr = clipUtf8(Buffer.concat(stderrChunks), maxCapture);
    return { exitCode, stdout, stderr };
  } finally {
    clearTimeout(timeout);
  }
}

export async function executePlan(rawPlan: unknown): Promise<ExecutionRunLog> {

  // Import requireAuthority for runtime enforcement
  const { requireAuthority } = await import("../ai/authorityGate.js");
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

  const isWorkflowRun =
    String(process.env.SINTRAPRIME_WORKFLOW_RUN ?? "") === "1" ||
    (typeof plan.execution_id === "string" && plan.execution_id.startsWith("workflow:"));

  const maybePrintWorkflowFetchHint = (step: ExecutionStep, e: any) => {
    if (!isWorkflowRun) return;
    if (isShellStep(step)) return;
    if (!step || typeof (step as any).url !== "string" || !(step as any).url) return;

    const name = String(e?.name ?? "");
    const message = String(e?.message ?? "");
    const code = String(e?.code ?? e?.cause?.code ?? "");

    const isTimeout = name === "AbortError" || code === "ABORT_ERR";
    const isNetwork =
      /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT/i.test(message) ||
      /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT/i.test(code) ||
      message.toLowerCase().includes("fetch failed");

    if (!isTimeout && !isNetwork) return;

    let u: URL | null = null;
    try {
      u = new URL(String((step as any).url));
    } catch {
      // ignore
    }

    const isLocalMock =
      !!u &&
      (u.hostname === "127.0.0.1" || u.hostname === "localhost") &&
      String(u.port || "") === "8787";

    const urlText = String((step as any).url);
    const headline = isTimeout
      ? `Cannot reach ${urlText} (timeout) — is the server running?`
      : `Cannot reach ${urlText} — is the server running?`;

    const tip = isLocalMock
      ? "Tip: Run `npm run mock:server` in another terminal before executing this workflow."
      : "Tip: Verify the URL is correct and reachable from this machine.";

    // Only a hint: do not change error handling semantics.
    process.stderr.write(`\n[workflow.run] ${headline}\n${tip}\n\n`);
  };

  const redact = async (v: unknown) => {
    const secrets = await getRedactionSecrets();
    if (!secrets.length) return v;
    return redactSecretsDeep(v, secrets);
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

    let stepIndex = 0;
    for (const step of plan.steps) {
      stepIndex += 1;
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

      // LLM gate: enforce authority for ai.request and ai.request.write (HTTP-only)
      if (!isShellStep(step) && (step.action === "ai.request" || step.action === "ai.request.write")) {
        await requireAuthority({
          actor_agent_id: plan.execution_id,
          action: step.action,
          target: (step as any).url,
          input: (step as any).payload,
        });
      }

      const stepLog: StepRunLog = {
        step_id: step.step_id,
        action: step.action,
        adapter: step.adapter,
        method: (step as any).method,
        url: (step as any).url,
        started_at: stepStarted,
        finished_at: stepStarted,
        duration_ms: 0,
        status: "skipped",
        http_status: null,
        response: null,
        expectations: {
          http_status_expected: (step as any).expects?.http_status,
          http_status_ok: typeof (step as any).expects?.http_status !== "undefined" ? false : undefined,
          json_paths_present: (step as any).expects?.json_paths_present,
          json_paths_ok: (step as any).expects?.json_paths_present ? false : undefined,
        },
      };

      try {
        if (plan.dry_run) {
          stepLog.status = "skipped";
          stepLog.response = { dry_run: true };
        } else {
          if (isBrowserStep(step) && String((step as any).method) === "goto") {
            const urlText = String((step as any).url ?? "").trim();
            let u: URL;
            try {
              u = new URL(urlText);
            } catch {
              throw new Error(`BrowserAgent invalid url: ${urlText}`);
            }

            const allow = await getBrowserAllowlist();
            const host = String(u.hostname ?? "").toLowerCase();
            if (!allow.has(host)) {
              throw new Error(`BrowserAgent blocked by allowlist: ${host} (see browser.allowlist.json)`);
            }

            const stepDir = await ensureStepArtifactDir({ execution_id: plan.execution_id, step_index: stepIndex });
            const harPath = path.join(stepDir, "network.har");
            const screenshotPath = path.join(stepDir, "screenshot.png");

            const timeout = typeof (step as any).timeout_ms === "number" && (step as any).timeout_ms > 0 ? (step as any).timeout_ms : timeoutMs;

            const { chromium } = await import("playwright");
            const browser = await chromium.launch({ headless: true });
            try {
              const context = await browser.newContext({ recordHar: { path: harPath } });
              const page = await context.newPage();

              // Block all non-allowlisted HTTP(S) requests (secure default).
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
                  // If URL parsing fails, abort rather than leak.
                  await route.abort();
                  return;
                }
                await route.continue();
              });

              await page.goto(urlText, { waitUntil: "load", timeout });
              await page.screenshot({ path: screenshotPath, fullPage: true });
              const title = await page.title();
              const finalUrl = page.url();
              await context.close();

              stepLog.status = "success";
              stepLog.response = {
                url: urlText,
                final_url: finalUrl,
                title,
                artifacts: {
                  har: harPath,
                  screenshot: screenshotPath,
                },
              };
              stepLog.http_status = 200;
            } finally {
              await browser.close();
            }

            const finished = nowIso();
            stepLog.finished_at = finished;
            stepLog.duration_ms = Date.now() - start;
            runLog.steps.push(stepLog);
            await maybeWriteWorkflowStepReceipt({ enabled: isWorkflowRun, execution_id: plan.execution_id, step_index: stepIndex, stepLog });
            continue;
          }

          if ((step as any)?.adapter === "ShellAdapter") {
            const overrides = loadPolicyOverridesSync({ cwd: process.cwd(), now: new Date() });
            const allowPlaintextLogs =
              String(process.env.SINTRAPRIME_SHELL_ALLOW_PLAINTEXT_LOGS ?? "") === "1" ||
              overrides.shell?.allow_plaintext_logs === true;

            const expectedExit = Array.isArray((step as any)?.expects?.exit_code)
              ? (step as any).expects.exit_code
              : typeof (step as any)?.expects?.exit_code === "number"
                ? [(step as any).expects.exit_code]
                : [0];

            const cmd = String((step as any).command ?? "");
            const shell = ((step as any).shell ?? "bash") as "bash" | "pwsh" | "sh";
            const cwd = typeof (step as any).cwd === "string" && String((step as any).cwd).trim()
              ? path.resolve(process.cwd(), String((step as any).cwd))
              : process.cwd();
            const env = (step as any).env && typeof (step as any).env === "object" ? (step as any).env as Record<string, string> : undefined;
            const timeout = typeof (step as any).timeout_ms === "number" && (step as any).timeout_ms > 0 ? (step as any).timeout_ms : timeoutMs;

            const { exitCode, stdout, stderr } = await runShellCommand({ command: cmd, shell, cwd, env, timeoutMs: timeout });
            const secrets = await getRedactionSecrets();
            const safeStdout = !allowPlaintextLogs && secrets.length ? redactSecretsInString(stdout, secrets) : stdout;
            const safeStderr = !allowPlaintextLogs && secrets.length ? redactSecretsInString(stderr, secrets) : stderr;
            stepLog.exit_code = exitCode;
            stepLog.stdout = safeStdout;
            stepLog.stderr = safeStderr;
            stepLog.expectations.exit_code_expected = expectedExit;
            stepLog.expectations.exit_code_ok = expectedExit.includes(exitCode);
            stepLog.status = expectedExit.includes(exitCode) ? "success" : "failed";
            stepLog.response = { exit_code: exitCode, stdout: safeStdout, stderr: safeStderr };

            // Use synthetic status for downstream expectations.
            stepLog.http_status = null;

            if (!expectedExit.includes(exitCode)) {
              throw new Error(`Shell command failed (exit ${exitCode})`);
            }

            const finished = nowIso();
            stepLog.finished_at = finished;
            stepLog.duration_ms = Date.now() - start;
            runLog.steps.push(stepLog);
            await maybeWriteWorkflowStepReceipt({ enabled: isWorkflowRun, execution_id: plan.execution_id, step_index: stepIndex, stepLog });
            continue;
          }

          const out =
            step.adapter === "GmailAdapter" || String(step.action || "").startsWith("gmail.")
              ? await (async () => {
                  const { gmailClientFromToken } = await import("../integrations/gmail/oauth.js");
                  const { google } = await import("googleapis");
                  const { pullGmailIntoEmailIngest } = await import("../integrations/gmail/pull.js");

                  const auth = gmailClientFromToken();
                  const gmail = google.gmail({ version: "v1", auth });

                  const action = String(step.action || "").trim();
                  const payload = (step as any).payload ?? {};

                  if (action === "gmail.messages.list") {
                    const q = typeof payload?.query === "string" ? payload.query : undefined;
                    const maxResults = typeof payload?.maxResults === "number" ? payload.maxResults : undefined;
                    const labelIds = Array.isArray(payload?.labelIds) ? payload.labelIds : undefined;
                    const r = await gmail.users.messages.list({
                      userId: "me",
                      q,
                      ...(typeof maxResults === "number" ? { maxResults } : {}),
                      ...(labelIds ? { labelIds } : {}),
                    });
                    return { ok: true, status: 200, response: { messages: r.data.messages ?? [] }, responseJson: { messages: r.data.messages ?? [] } };
                  }

                  if (action === "gmail.labels.create") {
                    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
                    if (!name) return { ok: false, status: 400, response: { error: "name required" }, responseJson: { error: "name required" } };
                    const r = await gmail.users.labels.create({ userId: "me", requestBody: { name } });
                    return { ok: true, status: 200, response: { id: r.data.id, name: r.data.name }, responseJson: { id: r.data.id, name: r.data.name } };
                  }

                  if (action === "gmail.labels.apply") {
                    const messageIds = Array.isArray(payload?.messageIds) ? payload.messageIds.map(String).filter(Boolean) : [];
                    const addLabelIds = Array.isArray(payload?.addLabelIds) ? payload.addLabelIds.map(String).filter(Boolean) : [];
                    if (!messageIds.length || !addLabelIds.length) {
                      return { ok: false, status: 400, response: { error: "messageIds and addLabelIds required" }, responseJson: { error: "messageIds and addLabelIds required" } };
                    }
                    for (const id of messageIds) {
                      await gmail.users.messages.modify({ userId: "me", id, requestBody: { addLabelIds, removeLabelIds: [] } });
                    }
                    return { ok: true, status: 200, response: { modified: messageIds.length }, responseJson: { modified: messageIds.length } };
                  }

                  if (action === "gmail.pull_ingest") {
                    const vendor = String(payload?.vendor ?? "").trim();
                    const emailIngestBase = String(payload?.emailIngestBase ?? "").trim();
                    if (!vendor || !emailIngestBase) {
                      return { ok: false, status: 400, response: { error: "vendor and emailIngestBase required" }, responseJson: { error: "vendor and emailIngestBase required" } };
                    }
                    const out = await pullGmailIntoEmailIngest({
                      vendor,
                      maxMessages: typeof payload?.maxMessages === "number" ? payload.maxMessages : undefined,
                      query: typeof payload?.query === "string" ? payload.query : undefined,
                      labelIds: payload?.labelIds ?? undefined,
                      emailIngestBase,
                      emailIngestSecret: typeof payload?.emailIngestSecret === "string" ? payload.emailIngestSecret : undefined,
                      stateFile: typeof payload?.stateFile === "string" ? payload.stateFile : undefined,
                    });
                    return { ok: true, status: 200, response: out, responseJson: out };
                  }

                  return { ok: false, status: 400, response: { error: `unknown gmail action: ${action}` }, responseJson: { error: `unknown gmail action: ${action}` } };
                })()
              : step.action === "analysis.propose_status"
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
                        : new URL(String((step as any).url)).pathname;

                    const r = await notionLiveGet(notionPath);
                    return {
                      ok: r.http_status >= 200 && r.http_status < 300,
                      status: r.http_status,
                      response: r.redacted,
                      responseJson: r.redacted,
                    };
                  })()
                : step.action === "notion.live.write" || step.action === "notion.live.insert"
                  ? await (async () => {
                      const notionPath =
                        typeof (step as any).notion_path === "string" &&
                        String((step as any).notion_path).trim()
                          ? String((step as any).notion_path)
                          : new URL(String((step as any).url)).pathname;

                      const props = (step as any).properties;
                      const payload = (step as any).payload;

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

                      const r = step.action === "notion.live.insert"
                        ? await notionLiveRequestWithIdempotency({
                            method: "POST",
                            path: notionPath,
                            body: payload ?? { parent: {}, properties: props },
                            idempotencyKey: stepIdempotencyKey,
                          })
                        : await notionLivePatchWithIdempotency(
                            notionPath,
                            { properties: props },
                            stepIdempotencyKey
                          );

                      if (r.http_status >= 400) {
                        const verb = step.action === "notion.live.insert" ? "POST" : "PATCH";
                        throw new Error(`Notion ${verb} failed HTTP ${r.http_status}`);
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
                : await executeStep(step as any, timeoutMs);
          stepLog.http_status = out.status;
          stepLog.response = await redact(out.response);

          const expectedHttp = Array.isArray((step as any).expects?.http_status)
            ? (step as any).expects.http_status
            : typeof (step as any).expects?.http_status === "number"
              ? [(step as any).expects.http_status]
              : [];
          if (expectedHttp.length) {
            const statusOk = expectedHttp.includes(out.status);
            stepLog.expectations.http_status_expected = expectedHttp;
            stepLog.expectations.http_status_ok = statusOk;
          }

          const expects: any = (step as any).expects ?? {};

          let jsonPathsOk = true;
          if (Array.isArray(expects.json_paths_present) && expects.json_paths_present.length) {
            const root = out.responseJson ?? (isPlainObject(out.response) ? out.response : null);
            for (const p of expects.json_paths_present) {
              if (getByPath(root, p) === undefined) {
                jsonPathsOk = false;
                break;
              }
            }
            stepLog.expectations.json_paths_ok = jsonPathsOk;
          }

          const statusOk = expectedHttp.length ? expectedHttp.includes(out.status) : out.ok;
          const ok = out.ok && statusOk && (expects.json_paths_present ? jsonPathsOk : true);
          stepLog.status = ok ? "success" : "failed";

          if (!ok) {
            const why = !out.ok
              ? `HTTP not ok (${out.status})`
              : !statusOk
                ? `Unexpected status (${out.status}); expected one of ${(expectedHttp ?? []).join(",")}`
                : "Missing required json path";
            stepLog.error = String(await redact(why));
          }
        }
      } catch (e: any) {
        maybePrintWorkflowFetchHint(step, e);
        stepLog.status = "failed";
        stepLog.error = String(
          await redact(
            e?.name === "AbortError" ? `Timeout after ${timeoutMs}ms` : (e?.message ?? String(e))
          )
        );
        stepLog.response = null;

      } finally {
        stepLog.duration_ms = Date.now() - start;
        stepLog.finished_at = nowIso();
        runLog.steps.push(stepLog);

        await maybeWriteWorkflowStepReceipt({
          enabled: isWorkflowRun,
          execution_id: plan.execution_id,
          step_index: stepIndex,
          stepLog,
        });

        // --- GOD-MODE KERNEL BUS SIGNALS ---
        const ms = stepLog.duration_ms ?? (Date.now() - start);
        (kernelBus as any).latencySample?.(ms);

        if (stepLog.status === "success") kernelBus.pulse("success", 0.7);
        else kernelBus.pulse("error", 1.0);

        kernelBus.assert(`step:${step.step_id}`, stepLog.status === "success", stepLog.status === "success" ? 0.6 : 1.0);
        // Optionally bump heat memory for milestones:
        // if (stepLog.status === "success" && /* milestone condition */) kernelBus.memHeatBump(0.20);
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

    // --- Court-grade: TSA timestamping, auditor key, notary attestation ---
    // 1. TSA timestamping of the execution receipt
    let tsaToken: Buffer | undefined;
    try {
      tsaToken = (await tsaTimestamp(Buffer.from(runLog.receipt_hash, "utf8"))) ?? undefined;
    } catch (e) {
      tsaToken = undefined;
    }

    // 2. Auditor key verification (placeholder, to be implemented)
    // Example: if (process.env.AUDITOR_PUBKEY) { verifyAuditorKey(runLog, process.env.AUDITOR_PUBKEY); }

    // 3. Notary attestation PDF (minimal, court-grade)
    let attestationPath: string | undefined;
    try {
      const doc = new PDFDocument();
      const pdfChunks: Buffer[] = [];
      doc.on("data", (chunk) => pdfChunks.push(chunk));
      doc.text("SintraPrime Execution Attestation");
      doc.text(`Execution ID: ${runLog.execution_id}`);
      doc.text(`Thread ID: ${runLog.threadId}`);
      doc.text(`Goal: ${runLog.goal}`);
      doc.text(`Status: ${runLog.status}`);
      doc.text(`Receipt Hash: ${runLog.receipt_hash}`);
      if (tsaToken) doc.text(`TSA Token: ${tsaToken.toString("base64")}`);
      doc.text(`Timestamp: ${runLog.finished_at}`);
      doc.end();
      await new Promise((resolve) => doc.on("end", resolve));
      const pdfBuffer = Buffer.concat(pdfChunks);
      const outDir = path.resolve("attestations");
      await fs.mkdir(outDir, { recursive: true });
      attestationPath = path.join(outDir, `attestation_${runLog.execution_id}.pdf`);
      await fs.writeFile(attestationPath, pdfBuffer);
    } catch (e) {
      attestationPath = undefined;
    }

    // Attach TSA and attestation to artifacts
    if (!runLog.artifacts) runLog.artifacts = {};
    runLog.artifacts.notary_attestation = {
      outputs: {
        tsa_token: tsaToken ? tsaToken.toString("base64") : undefined,
        attestation_pdf: attestationPath,
      },
      files: attestationPath ? [attestationPath] : undefined,
      metadata: { started_at: runLog.started_at, finished_at: runLog.finished_at! },
    };

    return runLog;
  } catch (e: any) {
    runLog.status = "failed";
    runLog.error = String(await redact(e?.message ?? String(e)));
    runLog.finished_at = new Date().toISOString();
    runLog.receipt_hash = computeReceiptHash(runLog);
    // Attach minimal failed attestation
    if (!runLog.artifacts) runLog.artifacts = {};
    runLog.artifacts.notary_attestation = {
      outputs: { error: runLog.error },
      files: undefined,
      metadata: { started_at: runLog.started_at, finished_at: runLog.finished_at! },
    };
    return runLog;
  }
}

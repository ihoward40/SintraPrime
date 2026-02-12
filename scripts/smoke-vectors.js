import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { sendMessage } from "../sendMessage.js";
import crypto from "node:crypto";
import rrule from "rrule";

const RRule = (rrule?.RRule || (rrule?.default ? rrule.default.RRule : null) || (rrule?.RRuleSet ? null : null));

const DEFAULT_LOCAL_MOCK_SECRET = "local_test_secret";
const DEFAULT_LOCAL_MOCK_PORT_START = 8787;
const DEFAULT_LOCAL_MOCK_PORT_TRIES = 20;

const LOCAL_MOCK_PID_FILE = path.join(process.cwd(), "runs", "_smoke_vectors_mock_server.pid");

function readPidFileSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = String(fs.readFileSync(filePath, "utf8") ?? "").trim();
    const pid = Number(raw);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isPidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function tryKillPid(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // ignore
  }

  // Windows can be stubborn about SIGTERM; fall back to taskkill.
  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      // ignore
    }
  }
}

async function cleanupStaleLocalMockPidFile() {
  const pid = readPidFileSafe(LOCAL_MOCK_PID_FILE);
  if (pid && isPidAlive(pid)) {
    tryKillPid(pid);
    const deadline = Date.now() + 1500;
    while (Date.now() < deadline && isPidAlive(pid)) {
      await sleep(50);
    }
  }

  try {
    fs.rmSync(LOCAL_MOCK_PID_FILE, { force: true });
  } catch {
    // ignore
  }
}

async function stopLocalMockServer(proc) {
  if (!proc) return;
  const pid = proc.pid;

  try {
    proc.kill();
  } catch {
    // ignore
  }

  if (pid && Number.isFinite(pid)) {
    const deadline = Date.now() + 1500;
    while (Date.now() < deadline && isPidAlive(pid)) {
      await sleep(50);
    }
    if (isPidAlive(pid)) {
      tryKillPid(pid);
    }
  }

  try {
    fs.rmSync(LOCAL_MOCK_PID_FILE, { force: true });
  } catch {
    // ignore
  }
}

function getLocalMockBaseUrl() {
  const v = process.env.VALIDATION_WEBHOOK_URL;
  if (typeof v !== "string") return null;
  return v.endsWith("/validation") ? v.slice(0, -"/validation".length) : null;
}

function rewriteLocalhost8787Urls(value, baseUrl) {
  if (!baseUrl) return value;
  if (typeof value === "string") {
    return value.startsWith("http://localhost:8787")
      ? baseUrl + value.slice("http://localhost:8787".length)
      : value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => rewriteLocalhost8787Urls(v, baseUrl));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = rewriteLocalhost8787Urls(v, baseUrl);
    }
    return out;
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function canReach(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

async function canUseValidationWebhook({ baseUrl, secret }) {
  try {
    const res = await fetch(`${baseUrl}/validation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": secret,
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ type: "user_message", threadId: "healthcheck", message: "/build health {\"noop\":true}" }),
    });
    const json = await res.json();
    return typeof json?.response === "string";
  } catch {
    return false;
  }
}

async function startLocalMockServerIfNeeded() {
  // Deterministic-by-default: use the local mock server unless explicitly
  // opting into remote URLs.
  if (process.env.SMOKE_VECTORS_USE_REMOTE === "1") return null;

  // If a previous smoke-vectors run leaked a mock server process (common on Windows
  // if a terminal is interrupted), clean it up so we can reliably bind to 8787 and
  // avoid partial URL rewrite issues.
  await cleanupStaleLocalMockPidFile();

  const secret = (process.env.WEBHOOK_SECRET || DEFAULT_LOCAL_MOCK_SECRET).trim();
  process.env.WEBHOOK_SECRET = secret;

  for (let i = 0; i < DEFAULT_LOCAL_MOCK_PORT_TRIES; i += 1) {
    const port = DEFAULT_LOCAL_MOCK_PORT_START + i;
    const child = spawn(process.execPath, [path.join(process.cwd(), "scripts", "mock-server.js")], {
      env: { ...process.env, WEBHOOK_SECRET: secret, MOCK_PORT: String(port) },
      stdio: "ignore",
      windowsHide: true,
    });

    const baseUrl = `http://localhost:${port}`;
    const healthUrl = `${baseUrl}/status/200`;
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      // If the child already exited (e.g. EADDRINUSE), do NOT latch onto
      // whatever else is running on this port. Try the next port instead.
      if (child.exitCode !== null) break;

      // Ensure we bind to a correctly configured server (WEBHOOK_SECRET set),
      // not just any process responding on the port.
      if ((await canReach(healthUrl)) && (await canUseValidationWebhook({ baseUrl, secret }))) {
        process.env.VALIDATION_WEBHOOK_URL = `${baseUrl}/validation`;
        process.env.PLANNER_WEBHOOK_URL = `${baseUrl}/planner`;
        process.env.WEBHOOK_URL = `${baseUrl}/validation`;

        try {
          fs.mkdirSync(path.dirname(LOCAL_MOCK_PID_FILE), { recursive: true });
          if (child.pid) fs.writeFileSync(LOCAL_MOCK_PID_FILE, String(child.pid));
        } catch {
          // ignore
        }

        return child;
      }
      await sleep(50);
    }

    try {
      child.kill();
    } catch {
      // ignore
    }
  }

  throw new Error(
    "Unable to start local mock server for smoke vectors. Set VALIDATION_WEBHOOK_URL/PLANNER_WEBHOOK_URL (and WEBHOOK_SECRET) explicitly."
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function extractJsonFromText(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new Error("Empty agent response");

  const strict = process.env.STRICT_AGENT_OUTPUT === "1";

  if (strict) {
    // In strict mode, the agent response must be a single valid JSON value (no fences, no extra prose).
    return JSON.parse(trimmed);
  }

  // Fast path: pure JSON
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  // Fenced code blocks
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    const inside = fenceMatch[1].trim();
    try {
      return JSON.parse(inside);
    } catch {
      // continue
    }
  }

  // Heuristic: first {...}
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

  // Heuristic: first [...]
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

  throw new Error(`Agent response did not contain parseable JSON. Preview: ${trimmed.slice(0, 240)}`);
}

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function deepSubsetMatch(actual, expected) {
  if (expected === null || expected === undefined) return true;

  // For vectors, arrays are expected to match exactly (length + element values).
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < expected.length; i += 1) {
      if (!deepSubsetMatch(actual[i], expected[i])) return false;
    }
    return true;
  }

  if (!isObject(expected)) {
    return Object.is(actual, expected);
  }

  if (!isObject(actual)) return false;

  for (const [k, v] of Object.entries(expected)) {
    if (!(k in actual)) return false;
    if (!deepSubsetMatch(actual[k], v)) return false;
  }
  return true;
}

function getVectorsPath() {
  const arg = process.argv.slice(2).find((a) => a.startsWith("--vectors="));
  if (arg) return arg.slice("--vectors=".length);
  return path.join(process.cwd(), "scripts", "smoke-vectors.json");
}

function getNameFilter() {
  const args = process.argv.slice(2);
  const kv = args.find((a) => a.startsWith("--filter="));
  if (kv) {
    const v = kv.slice("--filter=".length).trim();
    return v ? v : null;
  }

  // Support: --filter <value>
  const idx = args.findIndex((a) => a === "--filter");
  if (idx !== -1) {
    const v = String(args[idx + 1] ?? "").trim();
    return v ? v : null;
  }

  return null;
}

function unwrapDomainPrefix(command) {
  const trimmed = String(command ?? "").trim();
  const m = trimmed.match(/^\/domain\s+(\S+)\s+([\s\S]+)$/i);
  if (!m?.[1] || !m?.[2]) return null;
  const domain_id = String(m[1]).trim();
  const inner = String(m[2]).trim();
  if (!domain_id || !inner) return null;
  return { domain_id, inner, original: trimmed };
}

function runCli(command) {
  const trimmed = String(command ?? "").trim();
  const unwrapped = unwrapDomainPrefix(trimmed);
  const routing = unwrapped?.inner ?? trimmed;
  const entry = /^(\/queue\b|\/run\b)/i.test(routing)
    ? path.join(process.cwd(), "src", "cli", "run-console.ts")
    : /^\/scheduler\b/i.test(routing)
      ? path.join(process.cwd(), "src", "cli", "run-scheduler.ts")
      : /^\/policy\b/i.test(routing)
        ? path.join(process.cwd(), "src", "cli", "run-policy.ts")
        : /^\/delegate\b/i.test(routing)
          ? path.join(process.cwd(), "src", "cli", "run-delegate.ts")
        : /^\/operator-ui\b/i.test(routing)
          ? path.join(process.cwd(), "src", "cli", "run-operator-ui.ts")
        : /^\/operator\b/i.test(routing)
          ? path.join(process.cwd(), "src", "cli", "run-operator.ts")
      : path.join(process.cwd(), "src", "cli", "run-command.ts");

  const tsxBin = path.join(process.cwd(), "node_modules", ".bin", "tsx");
  const tsxNodeEntrypoint = path.join(
    process.cwd(),
    "node_modules",
    "tsx",
    "dist",
    "cli.mjs"
  );

  const res = process.platform === "win32"
    ? spawnSync(process.execPath, [tsxNodeEntrypoint, entry, command], {
        env: process.env,
        encoding: "utf8",
      })
    : spawnSync(tsxBin, [entry, command], {
        env: process.env,
        encoding: "utf8",
      });

  if (res.error) throw new Error(res.error.message);

  const stdout = String(res.stdout ?? "").trim();
  const stderr = String(res.stderr ?? "").trim();

  let json = null;
  if (stdout) {
    try {
      json = JSON.parse(stdout);
    } catch {
      // ignore
    }
  }

  return { exitCode: res.status ?? 0, stdout, stderr, json };
}

function seedTier21FixturesIfNeeded(vector, command) {
  const name = String(vector?.name ?? "");
  const trimmed = String(command ?? "").trim();
  const unwrapped = unwrapDomainPrefix(trimmed);
  const inner = unwrapped?.inner ?? trimmed;

  if (!name.startsWith("tier21-")) return;

  const domainsBase = path.join(process.cwd(), "runs", "domains");
  const rolesDir = path.join(domainsBase, "roles");
  fs.mkdirSync(rolesDir, { recursive: true });

  const registryPath = path.join(domainsBase, "registry.json");

  if (name === "tier21-domain-overlay-deny-write") {
    fs.mkdirSync(domainsBase, { recursive: true });
    fs.writeFileSync(
      registryPath,
      JSON.stringify(
        {
          kind: "TrustDomainRegistry",
          generated_at: new Date(0).toISOString(),
          domains: {
            "ops.notion": {
              domain_id: "ops.notion",
              description: "Tier-21 smoke domain",
              overlay: { deny_write: true },
            },
          },
        },
        null,
        2
      ) + "\n",
      { encoding: "utf8" }
    );
    return;
  }

  if (name === "tier21-role-blocks-approval") {
    // Registry exists but does NOT deny writes; the role check is what should fail.
    fs.mkdirSync(domainsBase, { recursive: true });
    fs.writeFileSync(
      registryPath,
      JSON.stringify(
        {
          kind: "TrustDomainRegistry",
          generated_at: new Date(0).toISOString(),
          domains: {
            "ops.notion": {
              domain_id: "ops.notion",
              description: "Tier-21 smoke domain",
              overlay: { deny_write: false },
            },
          },
        },
        null,
        2
      ) + "\n",
      { encoding: "utf8" }
    );

    // Operator has no approver role for ops.notion.
    const operatorId = "operator@local";
    const rolesPath = path.join(rolesDir, `${operatorId}.json`);
    fs.writeFileSync(
      rolesPath,
      JSON.stringify(
        {
          operator_id: operatorId,
          assigned_at: new Date(0).toISOString(),
          domains: {
            "ops.notion": { roles: ["viewer"] },
          },
        },
        null,
        2
      ) + "\n",
      { encoding: "utf8" }
    );

    // Seed approval state + receipt for exec_write_001 so /approve can run and be denied by role.
    const approvalsDir = path.join(process.cwd(), "runs", "approvals");
    fs.mkdirSync(approvalsDir, { recursive: true });
    const execution_id = "exec_write_001";
    const approvalPath = path.join(approvalsDir, `${execution_id}.json`);
    if (!fs.existsSync(approvalPath)) {
      fs.writeFileSync(
        approvalPath,
        JSON.stringify(
          {
            execution_id,
            command: "/notion set pg_999 Status=Done",
            original_command: "/domain ops.notion /notion set pg_999 Status=Done",
            domain_id: "ops.notion",
            created_at: new Date(0).toISOString(),
            status: "awaiting_approval",
            plan_hash: "tier21_fixture_plan_hash",
            mode: "legacy",
            pending_step_ids: ["step_001"],
            prestates: {},
            plan: {
              kind: "ExecutionPlan",
              execution_id,
              threadId: "local_test_001",
              dry_run: false,
              goal: "Tier-21 approval role fixture",
              agent_versions: { validator: "1.2.0", planner: "1.1.3" },
              assumptions: ["Generated by test fixture"],
              required_secrets: [],
              steps: [
                {
                  step_id: "step_001",
                  action: "write",
                  adapter: "WebhookAdapter",
                  method: "POST",
                  url: "http://localhost:8787/intake/scan",
                  payload: { path: "./docs" },
                  expects: { http_status: [200] },
                  idempotency_key: null,
                },
              ],
            },
          },
          null,
          2
        ) + "\n",
        { encoding: "utf8" }
      );
    }

    const receiptsPath = path.join(process.cwd(), "runs", "receipts.jsonl");
    fs.mkdirSync(path.dirname(receiptsPath), { recursive: true });
    const line = JSON.stringify(
      {
        execution_id,
        threadId: "local_test_001",
        status: "awaiting_approval",
        created_at: new Date(0).toISOString(),
        approval_required: { kind: "ApprovalRequired", code: "WRITE_OPERATION" },
      },
      null,
      0
    );
    try {
      const existing = fs.existsSync(receiptsPath) ? fs.readFileSync(receiptsPath, "utf8") : "";
      if (!existing.split(/\r?\n/).some((l) => {
        try { return JSON.parse(l)?.execution_id === execution_id; } catch { return false; }
      })) {
        fs.appendFileSync(receiptsPath, line + "\n", { encoding: "utf8" });
      }
    } catch {
      fs.appendFileSync(receiptsPath, line + "\n", { encoding: "utf8" });
    }

    return;
  }
}

function computeFingerprintForCommand(command) {
  const trimmed = String(command ?? "").trim();
  const unwrapped = unwrapDomainPrefix(trimmed);
  const domain_id = unwrapped?.domain_id ?? "";
  const inner = unwrapped?.inner ?? trimmed;
  const payload = `${domain_id}|${inner}`;
  return sha256(payload);
}

function computeGovernorFingerprintForCommand(command) {
  const trimmed = String(command ?? "").trim();
  const unwrapped = unwrapDomainPrefix(trimmed);
  const inner = String(unwrapped?.inner ?? trimmed).trim();

  if (/^\/autonomy\s+requalify\b/i.test(inner)) {
    return "autonomy.requalify";
  }
  if (/^\/notion\s+set\b/i.test(inner) || /^\/template\s+run\b/i.test(inner)) {
    return "notion.write.page";
  }
  if (/^\/notion\s+live\b/i.test(inner)) {
    return "notion.read.live";
  }
  if (/^\/intake\b/i.test(inner)) {
    return "intake.scan";
  }

  const domain_id = unwrapped?.domain_id ?? "";
  const payload = `${domain_id}|${inner}`;
  return sha256(payload);
}

function seedTierInfinityFixturesIfNeeded(vector, command) {
  const pre = vector?.precondition;
  const inject = vector?.inject;

  // Tier-∞.1: vector-level injections for governor state.
  if (inject && typeof inject === "object") {
    const wantsCircuitOpen = inject.circuit_open === true;
    if (wantsCircuitOpen) {
      const fp = typeof inject.fingerprint === "string" && inject.fingerprint.trim()
        ? inject.fingerprint.trim()
        : computeGovernorFingerprintForCommand(command);

      const baseNow = typeof process.env.SMOKE_FIXED_NOW_ISO === "string" && process.env.SMOKE_FIXED_NOW_ISO.trim()
        ? process.env.SMOKE_FIXED_NOW_ISO.trim()
        : new Date(0).toISOString();
      const nowMs = new Date(baseNow).getTime();
      const safeNowMs = Number.isFinite(nowMs) ? nowMs : 0;
      const openUntil = new Date(safeNowMs + 60 * 60 * 1000).toISOString();

      const outPath = path.join(process.cwd(), "runs", "governor", "circuit-breakers", `${fp}.json`);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(
        outPath,
        JSON.stringify(
          {
            fingerprint: fp,
            open_until: openUntil,
            opened_at: baseNow,
            reason: "seeded",
            counts: { policy_denials: 0, rollbacks: 0, confidence_regressions: 0 },
          },
          null,
          2
        ) + "\n",
        { encoding: "utf8" }
      );
    }
  }

  if (!pre || typeof pre !== "object") return;

  const counter = pre.governor_counter;
  if (counter && typeof counter === "object") {
    const seedCmd = typeof counter.command === "string" && counter.command.trim() ? counter.command : command;
    const fingerprint =
      typeof counter.fingerprint === "string" && counter.fingerprint.trim()
        ? counter.fingerprint.trim()
        : computeGovernorFingerprintForCommand(seedCmd);

    const hourStart = typeof counter.hour_start === "string" && counter.hour_start.trim()
      ? counter.hour_start
      : (typeof counter.updated_at === "string" && counter.updated_at.trim()
        ? new Date(counter.updated_at).toISOString().slice(0, 13) + ":00:00.000Z"
        : new Date(0).toISOString().slice(0, 13) + ":00:00.000Z");

    const tokensRemaining = Number.isFinite(Number(counter.tokens_remaining))
      ? Number(counter.tokens_remaining)
      : Number.isFinite(Number(counter.tokens))
        ? Number(counter.tokens)
        : 0;

    const concurrent = Number.isFinite(Number(counter.concurrent)) ? Number(counter.concurrent) : 0;
    const updatedAt = typeof counter.updated_at === "string" && counter.updated_at.trim()
      ? counter.updated_at
      : typeof counter.updated_at_iso === "string" && counter.updated_at_iso.trim()
        ? counter.updated_at_iso
        : new Date(0).toISOString();

    const outPath = path.join(process.cwd(), "runs", "governor", "counters", `${fingerprint}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          fingerprint,
          hour_start: hourStart,
          tokens_remaining: tokensRemaining,
          concurrent,
          updated_at: updatedAt,
        },
        null,
        2
      ) + "\n",
      { encoding: "utf8" }
    );
  }

  const breaker = pre.governor_circuit_breaker;
  if (breaker && typeof breaker === "object") {
    const seedCmd = typeof breaker.command === "string" && breaker.command.trim() ? breaker.command : command;
    const fingerprint =
      typeof breaker.fingerprint === "string" && breaker.fingerprint.trim()
        ? breaker.fingerprint.trim()
        : computeGovernorFingerprintForCommand(seedCmd);

    const openUntil = typeof breaker.open_until === "string" && breaker.open_until.trim()
      ? breaker.open_until
      : typeof breaker.open_until_iso === "string" && breaker.open_until_iso.trim()
        ? breaker.open_until_iso
        : new Date(0).toISOString();

    const openedAt = typeof breaker.opened_at === "string" && breaker.opened_at.trim()
      ? breaker.opened_at
      : typeof breaker.opened_at_iso === "string" && breaker.opened_at_iso.trim()
        ? breaker.opened_at_iso
        : new Date(0).toISOString();

    const outPath = path.join(
      process.cwd(),
      "runs",
      "governor",
      "circuit-breakers",
      `${fingerprint}.json`
    );
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          fingerprint,
          open_until: openUntil,
          opened_at: openedAt,
          reason: typeof breaker.reason === "string" ? breaker.reason : "seeded",
          counts: {
            policy_denials: Number.isFinite(Number(breaker?.counts?.policy_denials)) ? Number(breaker.counts.policy_denials) : 0,
            rollbacks: Number.isFinite(Number(breaker?.counts?.rollbacks)) ? Number(breaker.counts.rollbacks) : 0,
            confidence_regressions: Number.isFinite(Number(breaker?.counts?.confidence_regressions)) ? Number(breaker.counts.confidence_regressions) : 0,
          },
        },
        null,
        2
      ) + "\n",
      { encoding: "utf8" }
    );
  }

  const rollbackArtifacts = pre.rollback_artifacts;
  if (Array.isArray(rollbackArtifacts) && rollbackArtifacts.length) {
    const dir = path.join(process.cwd(), "runs", "rollback");
    fs.mkdirSync(dir, { recursive: true });
    rollbackArtifacts.forEach((a, idx) => {
      const file = path.join(dir, `seed_${String(idx + 1).padStart(2, "0")}.json`);
      fs.writeFileSync(file, JSON.stringify(a, null, 2) + "\n", { encoding: "utf8" });
    });
  }
}

function seedTier22FixturesIfNeeded(vector, command) {
  const pre = vector?.precondition;
  if (!pre || typeof pre !== "object") return;

  const state = pre.requalification_state;
  if (!state || typeof state !== "object") return;

  const seedCmd = typeof state.command === "string" && state.command.trim() ? state.command : command;
  const fingerprint =
    typeof state.fingerprint === "string" && state.fingerprint.trim()
      ? state.fingerprint.trim()
      : computeGovernorFingerprintForCommand(seedCmd);

  const requalState = typeof state.state === "string" ? state.state : (typeof state.status === "string" ? state.status : "SUSPENDED");
  const since = typeof state.since === "string" && state.since.trim()
    ? state.since
    : (typeof state.updated_at === "string" && state.updated_at.trim() ? state.updated_at : new Date(0).toISOString());
  const cause = typeof state.cause === "string" ? state.cause : (typeof state.reason === "string" ? state.reason : "seeded");
  const cooldownUntil = typeof state.cooldown_until === "string" ? state.cooldown_until : null;

  const outPath = path.join(process.cwd(), "runs", "requalification", "state", `${fingerprint}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        fingerprint,
        state: requalState,
        cause,
        since,
        cooldown_until: cooldownUntil,
      },
      null,
      2
    ) + "\n",
    { encoding: "utf8" }
  );
}

function seedConfidenceFixturesIfNeeded(vector, command) {
  const pre = vector?.precondition;
  if (!pre || typeof pre !== "object") return;

  const state = pre.confidence_state;
  if (!state || typeof state !== "object") return;

  const seedCmd = typeof state.command === "string" && state.command.trim() ? state.command : command;
  const fingerprint =
    typeof state.fingerprint === "string" && state.fingerprint.trim()
      ? state.fingerprint.trim()
      : computeGovernorFingerprintForCommand(seedCmd);

  const confidence = typeof state.confidence === "number" ? state.confidence : 1;
  const updated_at = typeof state.updated_at === "string" && state.updated_at.trim()
    ? state.updated_at.trim()
    : new Date(0).toISOString();

  const safe = String(fingerprint).replace(/[\\/<>:\"|?*\x00-\x1F]/g, "_").slice(0, 120);
  const outPath = path.join(process.cwd(), "runs", "confidence", `${safe}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        kind: "ConfidenceArtifact",
        fingerprint,
        confidence,
        updated_at,
        signals: Array.isArray(state.signals) ? state.signals : [],
      },
      null,
      2
    ) + "\n",
    { encoding: "utf8" }
  );
}

function seedReceiptFixturesIfNeeded(vector) {
  const pre = vector?.precondition;
  if (!pre || typeof pre !== "object") return;

  const items = pre.receipts_append;
  if (!Array.isArray(items) || items.length === 0) return;

  const receiptsPath = path.join(process.cwd(), "runs", "receipts.jsonl");
  fs.mkdirSync(path.dirname(receiptsPath), { recursive: true });
  const existing = fs.existsSync(receiptsPath) ? fs.readFileSync(receiptsPath, "utf8") : "";
  const existingLines = existing.split(/\r?\n/).filter(Boolean);

  const hasExecId = (execId) => {
    if (!execId) return false;
    return existingLines.some((l) => {
      try {
        return JSON.parse(l)?.execution_id === execId;
      } catch {
        return false;
      }
    });
  };

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const fingerprint = String(item.fingerprint ?? "").trim();
    if (!fingerprint) continue;

    const execution_id = String(item.execution_id ?? "").trim() || `seed_${fingerprint}_${Date.now()}`;
    if (hasExecId(execution_id)) continue;

    const status = String(item.status ?? "success").trim() || "success";
    const kind = typeof item.kind === "string" && item.kind.trim() ? item.kind.trim() : "success";
    const started_at = typeof item.started_at === "string" && item.started_at.trim() ? item.started_at.trim() : null;
    const finished_at = typeof item.finished_at === "string" && item.finished_at.trim() ? item.finished_at.trim() : null;
    const created_at = typeof item.created_at === "string" && item.created_at.trim() ? item.created_at.trim() : null;

    const line = JSON.stringify(
      {
        execution_id,
        threadId,
        fingerprint,
        kind,
        status,
        ...(created_at ? { created_at } : null),
        ...(started_at ? { started_at } : null),
        ...(finished_at ? { finished_at } : null),
      },
      null,
      0
    );

    fs.appendFileSync(receiptsPath, line + "\n", { encoding: "utf8" });
    existingLines.push(line);
  }
}

function seedExec123FixtureIfNeeded(command) {
  const trimmed = String(command ?? "").trim();
  const isReject = /^\/queue\s+reject\s+exec_123\b/i.test(trimmed);
  const needsExec123 =
    isReject ||
    /^\/run\s+(show|artifacts|tail)\s+exec_123\b/i.test(trimmed) ||
    /^\/queue\s+list\b/i.test(trimmed);
  if (!needsExec123) return;

  const dir = path.join(process.cwd(), "runs", "approvals");
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, "exec_123.json");
  const already = fs.existsSync(p);

  const createdAt = new Date(0).toISOString();
  const fixture = {
    execution_id: "exec_123",
    created_at: createdAt,
    status: "awaiting_approval",
    plan_hash: "tier11_fixture_plan_hash",
    mode: "legacy",
    plan: { kind: "ExecutionPlan", goal: "Tier-11 reject fixture", threadId: "local_test_001" },
    pending_step_ids: ["step_001"],
    prestates: {
      step_001: { snapshot: { kind: "Fixture" }, fingerprint: "tier11_fixture_fp" },
    },
  };

  if (!already || isReject) {
    fs.writeFileSync(p, JSON.stringify(fixture, null, 2), { encoding: "utf8" });
  }

  // Seed a matching prestate artifact for Tier-12 /run show.
  const preDir = path.join(process.cwd(), "runs", "prestate");
  fs.mkdirSync(preDir, { recursive: true });
  const prePath = path.join(preDir, "exec_123.step_001.json");
  if (!fs.existsSync(prePath) || isReject) {
    fs.writeFileSync(
      prePath,
      JSON.stringify(
        {
          execution_id: "exec_123",
          step_id: "step_001",
          snapshot: { kind: "Fixture" },
          fingerprint: "tier11_fixture_fp",
          created_at: createdAt,
        },
        null,
        2
      ),
      { encoding: "utf8" }
    );
  }
}

function resetSchedulerHistoryForVectorIfNeeded(vector) {
  const name = String(vector?.name ?? "");
  const cmd = String(vector?.command ?? "").trim();
  if (name !== "tier13-first-run-executes") return;
  if (!/^\/scheduler\s+run\s+notion_tax_cases_daily_scan\b/i.test(cmd)) return;

  const dir = path.join(process.cwd(), "runs", "scheduler-history");
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (!f.startsWith("notion_tax_cases_daily_scan.")) continue;
    try {
      fs.unlinkSync(path.join(dir, f));
    } catch {
      // ignore
    }
  }
}

function seedSchedulerHistoryFixtureIfNeeded(command) {
  const trimmed = String(command ?? "").trim();
  if (!/^\/scheduler\s+history\b/i.test(trimmed)) return;

  const dir = path.join(process.cwd(), "runs", "scheduler-history");
  fs.mkdirSync(dir, { recursive: true });

  // Deterministic fixtures: ensure at least two windows exist.
  const rows = [
    {
      job_id: "notion_tax_cases_daily_scan",
      window_id: "a9f23c19c2f0b1aa",
      started_at: "2024-01-09T00:00:01Z",
      outcome: { kind: "success" },
    },
    {
      job_id: "notion_tax_cases_daily_scan",
      window_id: "b1c77a993f8d2e01",
      started_at: "2024-01-08T00:00:01Z",
      outcome: { skipped: true },
    },
  ];

  for (const r of rows) {
    const file = path.join(dir, `${r.job_id}.${r.window_id}.json`);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(r, null, 2), { encoding: "utf8" });
    }
  }
}

function computeWindowId(job_id, rruleStr, atDate) {
  // Mirror src/scheduler/window.ts deterministically.
  const RR = (rrule && (rrule.RRule || (rrule.default && rrule.default.RRule))) || null;
  if (!RR) throw new Error("rrule.RRule unavailable");
  const opts = RR.parseString(rruleStr);
  const dtstart = new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
  const rule = new RR({ ...opts, dtstart });
  const windowStart = rule.before(atDate, true);
  if (!windowStart) return "never";
  const key = `${job_id}:${windowStart.toISOString()}`;
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

function seedSchedulerExplainFixtureIfNeeded(vector) {
  const cmd = String(vector?.command ?? "").trim();
  if (!/^\/scheduler\s+explain\b/i.test(cmd)) return;

  const cfg = vector?.post_assert?.scheduler_explain;
  if (!cfg || typeof cfg !== "object") return;

  const jobId = String(cfg.job_id || "").trim();
  const atIso = String(cfg.at || "").trim();
  if (!jobId || !atIso) {
    throw new Error("[FIXTURE] scheduler_explain requires post_assert.scheduler_explain.job_id and .at");
  }

  if (cfg.reset_history === true) {
    const dir = path.join(process.cwd(), "runs", "scheduler-history");
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        if (!f.startsWith(`${jobId}.`)) continue;
        try {
          fs.unlinkSync(path.join(dir, f));
        } catch {
          // ignore
        }
      }
    }
  }

  // Seed dedup history (if requested) for the evaluated window.
  if (cfg.seed_dedup === true) {
    const jobsPath = path.join(process.cwd(), "jobs", "registry.json");
    const jobs = JSON.parse(fs.readFileSync(jobsPath, "utf8"));
    const job = Array.isArray(jobs) ? jobs.find((j) => j && j.job_id === jobId) : null;
    if (!job || typeof job.schedule !== "string") throw new Error("[FIXTURE] scheduler_explain: job not found in registry");
    const at = new Date(atIso);
    const window_id = computeWindowId(jobId, job.schedule, at);
    const dir = path.join(process.cwd(), "runs", "scheduler-history");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${jobId}.${window_id}.json`);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(
        file,
        JSON.stringify(
          {
            job_id: jobId,
            window_id,
            started_at: at.toISOString(),
            outcome: { kind: "success" },
          },
          null,
          2
        ),
        { encoding: "utf8" }
      );
    }
  }

  // Seed budget state snapshots (read by scheduler explain) for specific UTC days.
  if (Array.isArray(cfg.seed_budget_days)) {
    const dir = path.join(process.cwd(), "runs", "autonomy", "state");
    fs.mkdirSync(dir, { recursive: true });
    for (const item of cfg.seed_budget_days) {
      if (!item || typeof item !== "object") continue;
      const day = String(item.day || "").trim();
      const count = Number(item.count);
      if (!day || !Number.isFinite(count)) continue;
      const p = path.join(dir, `runs-${day}.json`);
      fs.writeFileSync(p, JSON.stringify({ count }, null, 2), { encoding: "utf8" });
    }
  }
}

function seedOperatorQueueFixtureIfNeeded(command) {
  const trimmed = String(command ?? "").trim();
  if (!/^\/(operator\s+queue|operator-ui\s+queue)\b/i.test(trimmed)) return;

  // Seed one regression check (unacknowledged) and one approval item.
  const checksDir = path.join(process.cwd(), "runs", "confidence-checks");
  fs.mkdirSync(checksDir, { recursive: true });

  const regressionCheckPath = path.join(checksDir, "exec_regression_001.json");
  if (!fs.existsSync(regressionCheckPath)) {
    fs.writeFileSync(
      regressionCheckPath,
      JSON.stringify(
        {
          kind: "ConfidenceRegressionCheck",
          execution_id: "exec_regression_001",
          command: "/notion set pg_001 Status=Done",
          autonomy_mode: "APPROVAL_GATED_AUTONOMY",
          policy_state_allowed: false,
          policy_state_reason: "APPROVAL_REQUIRED",
          baseline: { score: 92, band: "HIGH", action: "AUTO_RUN" },
          current: { score: 61, band: "MEDIUM", action: "HUMAN_REVIEW_REQUIRED" },
          regression: {
            kind: "ConfidenceRegression",
            regressed: true,
            delta: -31,
            previous: { score: 92, band: "HIGH" },
            current: { score: 61, band: "MEDIUM" },
            severity: "MAJOR",
            requires_ack: true,
            acknowledged: false,
          },
          evaluated_at: new Date(0).toISOString(),
        },
        null,
        2
      ) + "\n",
      { encoding: "utf8" }
    );
  }

  const autorunCheckPath = path.join(checksDir, "exec_autorun_001.json");
  if (!fs.existsSync(autorunCheckPath)) {
    fs.writeFileSync(
      autorunCheckPath,
      JSON.stringify(
        {
          kind: "ConfidenceRegressionCheck",
          execution_id: "exec_autorun_001",
          command: "/notion db db_123",
          autonomy_mode: "READ_ONLY_AUTONOMY",
          policy_state_allowed: true,
          policy_state_reason: "ALLOWED",
          baseline: null,
          current: { score: 90, band: "HIGH", action: "AUTO_RUN" },
          regression: {
            kind: "ConfidenceRegression",
            regressed: false,
            delta: 0,
            previous: null,
            current: { score: 90, band: "HIGH" },
            severity: "NONE",
            requires_ack: false,
            acknowledged: false,
          },
          evaluated_at: new Date(0).toISOString(),
        },
        null,
        2
      ) + "\n",
      { encoding: "utf8" }
    );
  }

  const approvalsDir = path.join(process.cwd(), "runs", "approvals");
  fs.mkdirSync(approvalsDir, { recursive: true });
  const approvalPath = path.join(approvalsDir, "exec_operator_approval_001.json");
  if (!fs.existsSync(approvalPath)) {
    fs.writeFileSync(
      approvalPath,
      JSON.stringify(
        {
          execution_id: "exec_operator_approval_001",
          created_at: new Date(0).toISOString(),
          status: "awaiting_approval",
          plan_hash: "tier17_fixture_plan_hash",
          mode: "legacy",
          plan: { kind: "ExecutionPlan", goal: "Tier-17 approval fixture", threadId: "local_test_001" },
          pending_step_ids: ["step_001"],
          prestates: {
            step_001: { snapshot: { kind: "Fixture" }, fingerprint: "tier17_fixture_fp" },
          },
        },
        null,
        2
      ) + "\n",
      { encoding: "utf8" }
    );
  }
}

function seedOperatorUiApproveFixtureIfNeeded(command) {
  const trimmed = String(command ?? "").trim();
  const m = trimmed.match(/^\/operator-ui\s+approve\s+(\S+)\s*$/i);
  if (!m?.[1]) return;

  const execution_id = String(m[1]).trim();

  // Create a minimal awaiting-approval state + receipt so /approve can execute.
  const approvalsDir = path.join(process.cwd(), "runs", "approvals");
  fs.mkdirSync(approvalsDir, { recursive: true });
  const approvalPath = path.join(approvalsDir, `${execution_id}.json`);
  if (!fs.existsSync(approvalPath)) {
    fs.writeFileSync(
      approvalPath,
      JSON.stringify(
        {
          execution_id,
          created_at: new Date(0).toISOString(),
          status: "awaiting_approval",
          plan_hash: "tier18_fixture_plan_hash",
          mode: "legacy",
          pending_step_ids: ["step_001"],
          prestates: {},
          plan: {
            kind: "ExecutionPlan",
            execution_id,
            threadId: "local_test_001",
            dry_run: false,
            goal: "Tier-18 UI approve fixture",
            agent_versions: { validator: "1.2.0", planner: "1.1.3" },
            assumptions: ["Generated by test fixture"],
            required_secrets: [],
            steps: [
              {
                step_id: "step_001",
                action: "write",
                adapter: "WebhookAdapter",
                method: "POST",
                url: "http://localhost:8787/intake/scan",
                payload: { path: "./docs" },
                expects: { http_status: [200] },
                idempotency_key: null,
              },
            ],
          },
        },
        null,
        2
      ) + "\n",
      { encoding: "utf8" }
    );
  }

  const receiptsPath = path.join(process.cwd(), "runs", "receipts.jsonl");
  fs.mkdirSync(path.dirname(receiptsPath), { recursive: true });
  const line = JSON.stringify(
    {
      execution_id,
      threadId: "local_test_001",
      status: "awaiting_approval",
      created_at: new Date(0).toISOString(),
      approval_required: { kind: "ApprovalRequired", code: "WRITE_OPERATION" },
    },
    null,
    0
  );
  // Append only if there's no existing receipt for this execution id.
  try {
    const existing = fs.existsSync(receiptsPath) ? fs.readFileSync(receiptsPath, "utf8") : "";
    if (!existing.split(/\r?\n/).some((l) => {
      try { return JSON.parse(l)?.execution_id === execution_id; } catch { return false; }
    })) {
      fs.appendFileSync(receiptsPath, line + "\n", { encoding: "utf8" });
    }
  } catch {
    // If reading fails, still ensure at least one line exists.
    fs.appendFileSync(receiptsPath, line + "\n", { encoding: "utf8" });
  }
}

function seedDelegatedSupervisionFixtureIfNeeded(vector) {
  const name = String(vector?.name ?? "");
  const pre = vector?.precondition;
  const classId = pre && typeof pre === "object" ? pre.delegated_class : null;

  if (!classId && name !== "tier20-delegation-suspended-on-regression") return;

  const effectiveClassId = classId || "notion-status-updates";

  const base = path.join(process.cwd(), "runs");
  const classesDir = path.join(base, "delegated-classes");
  const approvalsDir = path.join(base, "delegated-approvals");
  const revocationsDir = path.join(base, "delegated-revocations");
  const suspensionsDir = path.join(base, "delegated-suspensions");
  const promotionsDir = path.join(base, "autonomy-promotions");
  const checksDir = path.join(base, "confidence-checks");

  // Deterministic per-vector isolation: delegated supervision artifacts are append-only by design.
  // ALSO isolate confidence regression evidence: Tier-17/18 fixtures write confidence-check artifacts
  // that can legitimately trigger Tier-20 auto-suspension unless we start each Tier-20 vector clean.
  for (const dir of [classesDir, approvalsDir, revocationsDir, suspensionsDir, checksDir]) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.mkdirSync(promotionsDir, { recursive: true });

  const classPath = path.join(classesDir, `${effectiveClassId}.json`);
  // Keep deterministic: the mock planner routes `/notion set ...` through NotionAdapter
  // with capability `notion.write.page_property`.
  const tier20Command = "/notion set pg_999 Status=Done";
  const tier20CapabilitySet = ["notion.write.page_property"];
  const tier20AdapterType = "NotionAdapter";
  fs.writeFileSync(
    classPath,
    JSON.stringify(
      {
        class_id: effectiveClassId,
        pattern: "/notion set pg_* Status=*",
        capabilities: tier20CapabilitySet,
        adapter: tier20AdapterType,
        write: true,
        created_at: "2025-01-22T01:00:00Z",
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  const approvalFile = path.join(approvalsDir, `${effectiveClassId}.2025-01-22T01-05-00-000Z.json`);
  if (!fs.existsSync(approvalFile)) {
    fs.writeFileSync(
      approvalFile,
      JSON.stringify(
        {
          class_id: effectiveClassId,
          approved_by: "operator@trust",
          scope: { autonomy_mode: "APPROVAL_GATED_AUTONOMY", confidence_min: 90, promotion_required: true },
          approved_at: "2025-01-22T01:05:00Z",
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
  }

  // Tier-19 prerequisite: delegation does nothing unless a matching promotion exists.
  // Promotions are stored by *computed fingerprint* (see src/autonomy/promotionFingerprint.ts).
  // If this is wrong, Tier-20 must fall back to approval.
  const promoFingerprint = (() => {
    const normalized_command = String(tier20Command).trim().replace(/\s+/g, " ").toLowerCase();
    const capability_set = Array.from(new Set(tier20CapabilitySet.map((c) => String(c ?? "").trim()).filter(Boolean))).sort();
    const adapter_type = String(tier20AdapterType ?? "").trim() || "unknown";
    const payload = { normalized_command, capability_set, adapter_type };
    const canonical = JSON.stringify(payload);
    return `auto_${sha256(canonical).slice(0, 16)}`;
  })();

  const promoPath = path.join(promotionsDir, `${promoFingerprint}.json`);
  if (!fs.existsSync(promoPath)) {
    fs.writeFileSync(
      promoPath,
      JSON.stringify(
        {
          fingerprint: promoFingerprint,
          command: tier20Command,
          promoted_at: "2025-01-21T00:00:00Z",
          criteria: { confidence_avg: 95, runs_observed: 25, regressions: 0 },
          previous_mode: "APPROVAL_GATED_AUTONOMY",
          new_mode: "AUTO_RUN",
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
  }

  if (name === "tier20-delegation-suspended-on-regression") {
    const checkPath = path.join(checksDir, "tier20_regression_001.json");
    if (!fs.existsSync(checkPath)) {
      fs.writeFileSync(
        checkPath,
        JSON.stringify(
          {
            kind: "ConfidenceRegressionCheck",
            command: "/notion set pg_999 Status=Done",
            fingerprint: "conf_tier20_fixture",
            baseline: {
              fingerprint: "conf_tier20_fixture",
              command: "/notion set pg_999 Status=Done",
              policy_version: "unversioned",
              autonomy_mode: "APPROVAL_GATED_AUTONOMY",
              capability_set: ["notion.write.page"],
              score: 95,
              band: "HIGH",
              action: "PROPOSE_FOR_APPROVAL",
              captured_at: "2025-01-01T00:00:00Z",
            },
            current: { score: 80, band: "MEDIUM", action: "PROPOSE_FOR_APPROVAL" },
            regression: { regressed: true, requires_ack: true, acknowledged: false, severity: "HARD" },
            evaluated_at: "2025-01-22T02:00:00Z",
          },
          null,
          2
        ) + "\n",
        "utf8"
      );
    }
  }
}

function getByPath(root, pathExpr) {
  const parts = String(pathExpr)
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);

  // Evaluate as a small "cursor" set to support wildcards anywhere.
  let cursors = [root];
  let sawWildcard = false;

  for (const part of parts) {
    const m = part.match(/^(\w+)(?:\[(\d+|\*)\])?$/);
    if (!m) return { kind: "missing" };
    const key = m[1];
    const idx = m[2] ?? null;

    const next = [];
    for (const cur of cursors) {
      if (!cur || typeof cur !== "object") continue;
      const val = cur[key];
      if (idx === null) {
        next.push(val);
        continue;
      }
      if (!Array.isArray(val)) continue;
      if (idx === "*") {
        sawWildcard = true;
        for (const item of val) next.push(item);
        continue;
      }
      const i = Number(idx);
      next.push(val[i]);
    }

    cursors = next;
    if (!cursors.length) return { kind: "missing" };
  }

  if (sawWildcard) return { kind: "wildcard", values: cursors };
  return { kind: "value", value: cursors[0] };
}

function assertOperatorPostAssert(gotJson, postAssert) {
  if (!postAssert || typeof postAssert !== "object") return;
  const keys = Object.keys(postAssert);
  const pathKeys = keys.filter((k) => k.startsWith("jobs[") || k.startsWith("rows["));
  if (!pathKeys.length) return;

  for (const k of pathKeys) {
    const expected = postAssert[k];
    const res = getByPath(gotJson, k);
    if (res.kind === "wildcard") {
      // Any-match semantics for jobs[*].foo
      const values = Array.isArray(res.values) ? res.values : [];
      const ok = values.some((v) => deepSubsetMatch(v, expected));
      if (!ok) {
        throw new Error(`[POST_ASSERT] ${k}: no jobs matched expected value`);
      }
      continue;
    }

    if (res.kind !== "value") {
      throw new Error(`[POST_ASSERT] ${k}: path missing`);
    }
    if (!deepSubsetMatch(res.value, expected)) {
      throw new Error(`[POST_ASSERT] ${k}: value did not match expected`);
    }
  }
}

function withVectorEnv(vectorEnv, fn) {
  const original = { ...process.env };
  try {
    if (vectorEnv && typeof vectorEnv === "object") {
      for (const [k, v] of Object.entries(vectorEnv)) {
        if (v === null) {
          delete process.env[k];
        } else {
          process.env[k] = String(v);
        }
      }
    }
    return fn();
  } finally {
    // IMPORTANT: Do not assign to process.env (it is a special object).
    // Restore by mutating keys to avoid env leakage across vectors.
    for (const k of Object.keys(process.env)) {
      if (!(k in original)) {
        delete process.env[k];
      }
    }
    for (const [k, v] of Object.entries(original)) {
      process.env[k] = v;
    }
  }
}

function readLastReceiptLine() {
  const file = path.join(process.cwd(), "runs", "receipts.jsonl");
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return null;
  return JSON.parse(lines[lines.length - 1]);
}

function readReceiptLinesRaw() {
  const file = path.join(process.cwd(), "runs", "receipts.jsonl");
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  return text.split(/\r?\n/).filter(Boolean);
}

function getReceiptLineCount() {
  return readReceiptLinesRaw().length;
}

function readReceiptsSinceLineCount(startLineCount) {
  const start = Math.max(0, Number(startLineCount) || 0);
  const lines = readReceiptLinesRaw();
  const slice = lines.slice(start);
  const out = [];
  for (const line of slice) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // ignore malformed
    }
  }
  return out;
}

function readLastReceiptForExecutionId(executionId) {
  const id = String(executionId ?? "").trim();
  if (!id) return null;

  const file = path.join(process.cwd(), "runs", "receipts.jsonl");
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    try {
      const json = JSON.parse(line);
      if (json?.execution_id === id) return json;
    } catch {
      // ignore
    }
  }
  return null;
}

function sha256(text) {
  return crypto.createHash("sha256").update(String(text ?? ""), "utf8").digest("hex");
}

function snapshotPath(relPath) {
  const full = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(full)) return { exists: false };
  const stat = fs.statSync(full);
  if (stat.isFile()) {
    const buf = fs.readFileSync(full);
    return { exists: true, kind: "file", hash: sha256(buf), size: stat.size };
  }
  if (stat.isDirectory()) {
    const entries = [];
    const walk = (dir, prefix) => {
      const names = fs.readdirSync(dir);
      for (const name of names) {
        const child = path.join(dir, name);
        const st = fs.statSync(child);
        const rel = prefix ? `${prefix}/${name}` : name;
        if (st.isDirectory()) {
          walk(child, rel);
        } else {
          entries.push({ rel, size: st.size, mtimeMs: st.mtimeMs });
        }
      }
    };
    walk(full, "");
    // Deterministic ordering
    entries.sort((a, b) => (a.rel !== b.rel ? a.rel.localeCompare(b.rel) : a.size - b.size));
    return { exists: true, kind: "dir", entries };
  }
  return { exists: true, kind: "other" };
}

function snapshotPaths(paths) {
  const out = {};
  for (const p of paths || []) {
    out[String(p)] = snapshotPath(String(p));
  }
  return out;
}

function assertNoWrites(before, after) {
  const bKeys = Object.keys(before || {}).sort();
  const aKeys = Object.keys(after || {}).sort();
  if (bKeys.length !== aKeys.length || bKeys.some((k, i) => k !== aKeys[i])) {
    throw new Error("[POST_ASSERT] no_writes: snapshot key mismatch");
  }
  for (const k of bKeys) {
    const b = before[k];
    const a = after[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      throw new Error(`[POST_ASSERT] no_writes: path changed: ${k}`);
    }
  }
}

const threadId = process.env.THREAD_ID || "local_test_001";
const vectorsPath = getVectorsPath();
const vectorsRaw = readJson(vectorsPath);
const nameFilter = getNameFilter();
const vectors = (() => {
  if (!Array.isArray(vectorsRaw)) return vectorsRaw;
  if (!nameFilter) return vectorsRaw;
  const needle = nameFilter.toLowerCase();
  return vectorsRaw.filter((v) => String(v?.name ?? "").toLowerCase().includes(needle));
})();

// Default STRICT_AGENT_OUTPUT off for the smoke runner itself.
// Individual vectors can still opt-in via { env: { STRICT_AGENT_OUTPUT: "1" } }.
if (process.env.STRICT_AGENT_OUTPUT === "1") {
  delete process.env.STRICT_AGENT_OUTPUT;
}

const mockServerProc = await startLocalMockServerIfNeeded();
const localMockBaseUrl = getLocalMockBaseUrl();

// Ensure the smoke suite is repeatable across runs by clearing cross-run state.
// (Per-vector cleanup below intentionally does NOT remove approvals/receipts,
// because some vectors depend on the previous vector within the same run.)
try {
  fs.rmSync(path.join(process.cwd(), "runs", "approvals"), { recursive: true, force: true });
} catch {
  // ignore
}
try {
  fs.rmSync(path.join(process.cwd(), "runs", "prestate"), { recursive: true, force: true });
} catch {
  // ignore
}
try {
  fs.rmSync(path.join(process.cwd(), "runs", "receipts.jsonl"), { force: true });
} catch {
  // ignore
}

function getWebhookUrlForStage(stage) {
  if (stage === "validation") return process.env.VALIDATION_WEBHOOK_URL || process.env.WEBHOOK_URL;
  if (stage === "planner") return process.env.PLANNER_WEBHOOK_URL || process.env.WEBHOOK_URL;
  return process.env.WEBHOOK_URL;
}

if (!Array.isArray(vectors) || vectors.length === 0) {
  throw new Error(`No vectors found at ${vectorsPath}`);
}

const results = [];
let failed = 0;

// Tier-10.5+: ensure idempotency ledger does not leak between test runs.
try {
  fs.rmSync(path.join(process.cwd(), "runs", "idempotency"), { recursive: true, force: true });
} catch {
  // ignore
}

for (const v of vectors) {
  const name = v?.name;
  let command = v?.command;
  const expect = v?.expect;
  const stage = v?.stage;
  const repeat = Number.isFinite(Number(v?.repeat)) ? Math.max(1, Number(v.repeat)) : 1;
  const expectFile = v?.expect_file_exists;
  const postAssert = v?.post_assert;
  const vectorEnv = v?.env;
  const plannerOverride = v?.planner_override;
  const expectExitCode = v?.expect_exit_code;

  const startedAt = Date.now();

  try {
    if (typeof name !== "string" || !name.trim()) throw new Error("Vector missing name");
    if (typeof command !== "string" || !command.trim()) throw new Error("Vector missing command");

    // Optional work-product assertion: remove first to avoid false positives.
    if (typeof expectFile === "string" && expectFile.trim()) {
      const fullPath = path.resolve(process.cwd(), expectFile);
      try {
        fs.rmSync(fullPath, { force: true });
      } catch {
        // ignore
      }
    }

      // Ensure per-vector env isolation for test-only planner override injection.
      // Without this, ambient env vars can cause the CLI to attempt planner override
      // when the vector did not request it.
      const baseEnvRaw = vectorEnv && typeof vectorEnv === "object" ? { ...vectorEnv } : {};
      // If the local mock server did not bind to 8787 (e.g. port busy), rewrite
      // any hardcoded localhost:8787 URLs in env/command to the actual base URL.
      const baseEnv = localMockBaseUrl ? rewriteLocalhost8787Urls(baseEnvRaw, localMockBaseUrl) : baseEnvRaw;
      let effectiveVectorEnv = baseEnv;

      // Ensure ambient shell env doesn't change smoke expectations.
      // STRICT_AGENT_OUTPUT causes the CLI to throw on observation warnings, which
      // can prevent JSON output and make vectors nondeterministic.
      if (!("STRICT_AGENT_OUTPUT" in baseEnv)) {
        baseEnv.STRICT_AGENT_OUTPUT = null;
      }

      // Ensure ambient AUTONOMY_MODE doesn't change smoke expectations.
      if (!("AUTONOMY_MODE" in baseEnv)) {
        baseEnv.AUTONOMY_MODE = null;
      }

      // Apply the same URL rewriting to the command string.
      command = localMockBaseUrl ? rewriteLocalhost8787Urls(command, localMockBaseUrl) : command;

      if (plannerOverride !== undefined) {
        baseEnv.ALLOW_PLANNER_OVERRIDE = "1";
        const rewritten = rewriteLocalhost8787Urls(
          // clone to avoid mutating the vector object
          JSON.parse(JSON.stringify(plannerOverride)),
          localMockBaseUrl
        );
        baseEnv.PLANNER_OVERRIDE_JSON = JSON.stringify(rewritten);
      } else {
        // Explicitly unset in this vector.
        baseEnv.ALLOW_PLANNER_OVERRIDE = null;
        baseEnv.PLANNER_OVERRIDE_JSON = null;
      }

    const result = await withVectorEnv(effectiveVectorEnv, async () => {
      if (stage === "cli") {
        // Autonomy budget state is persisted to disk and will accumulate across vectors
        // (and across repeated smoke suite runs) unless explicitly reset. This can make
        // otherwise unrelated vectors fail with BUDGET_MAX_RUNS_PER_DAY_EXCEEDED.
        try {
          fs.rmSync(path.join(process.cwd(), "runs", "autonomy", "state"), { recursive: true, force: true });
        } catch {
          // ignore
        }

        // Tier-21: domain artifacts are stateful; isolate per vector.
        try {
          fs.rmSync(path.join(process.cwd(), "runs", "domains"), { recursive: true, force: true });
        } catch {
          // ignore
        }

        // Tier-∞ / Tier-22: governor + requalification artifacts are stateful; isolate per vector.
        try {
          fs.rmSync(path.join(process.cwd(), "runs", "governor"), { recursive: true, force: true });
        } catch {
          // ignore
        }
        try {
          fs.rmSync(path.join(process.cwd(), "runs", "requalification"), { recursive: true, force: true });
        } catch {
          // ignore
        }
        try {
          fs.rmSync(path.join(process.cwd(), "runs", "rollback"), { recursive: true, force: true });
        } catch {
          // ignore
        }

        // Tier-16: confidence artifacts are stateful; isolate per vector.
        try {
          fs.rmSync(path.join(process.cwd(), "runs", "confidence"), { recursive: true, force: true });
        } catch {
          // ignore
        }

        seedReceiptFixturesIfNeeded(v);
        seedConfidenceFixturesIfNeeded(v, command);

        resetSchedulerHistoryForVectorIfNeeded(v);
        seedExec123FixtureIfNeeded(command);
        seedSchedulerHistoryFixtureIfNeeded(command);
        seedSchedulerExplainFixtureIfNeeded(v);
        seedOperatorQueueFixtureIfNeeded(command);
        seedOperatorUiApproveFixtureIfNeeded(command);
        seedDelegatedSupervisionFixtureIfNeeded(v);
        seedTier21FixturesIfNeeded(v, command);
        seedTierInfinityFixturesIfNeeded(v, command);
        seedTier22FixturesIfNeeded(v, command);

        const noWritesPaths = postAssert?.no_writes?.paths;
        const beforeWrites = Array.isArray(noWritesPaths) ? snapshotPaths(noWritesPaths) : null;

        const receiptsBefore = getReceiptLineCount();

        let out = null;
        for (let i = 0; i < repeat; i += 1) {
          out = runCli(command);
        }
        if (!out) throw new Error("repeat produced no output");

        const getNewReceipts = () => readReceiptsSinceLineCount(receiptsBefore);

        const afterWrites = Array.isArray(noWritesPaths) ? snapshotPaths(noWritesPaths) : null;
        const gotJson = out.json;
        if (gotJson === null) {
          throw new Error(
            `cli did not produce JSON. exit=${out.exitCode} stderr: ${out.stderr.slice(0, 240)} stdout: ${out.stdout.slice(0, 240)}`
          );
        }

        if (Array.isArray(postAssert?.stderr_contains)) {
          for (const needle of postAssert.stderr_contains) {
            const s = String(needle ?? "");
            if (s && !String(out.stderr ?? "").includes(s)) {
              throw new Error(`[POST_ASSERT] stderr missing substring: ${s}`);
            }
          }
        }

        if (typeof expectExitCode === "number" && out.exitCode !== expectExitCode) {
          throw new Error(`cli exit mismatch: got ${out.exitCode}, expected ${expectExitCode}`);
        }

        const ok = deepSubsetMatch(gotJson, expect);

        if (typeof expectFile === "string" && expectFile.trim()) {
          const fullPath = path.resolve(process.cwd(), expectFile);
          if (!fs.existsSync(fullPath)) {
            throw new Error(`expected file not found: ${expectFile}`);
          }
        }

        if (postAssert?.artifact_dir) {
          const dir = String(postAssert.artifact_dir);
          const artifactDir = path.resolve(process.cwd(), dir);
          const files = fs.readdirSync(artifactDir).filter((f) => f.endsWith(".json"));
          if (!files.length) {
            throw new Error(`[POST_ASSERT] No artifacts found in ${dir}`);
          }
          const latestName = files
            .map((name) => {
              const full = path.join(artifactDir, name);
              const stat = fs.statSync(full);
              return { name, mtimeMs: stat.mtimeMs };
            })
            .sort((a, b) => {
              if (a.mtimeMs !== b.mtimeMs) return a.mtimeMs - b.mtimeMs;
              return a.name.localeCompare(b.name);
            })
            .slice(-1)[0].name;

          const latest = path.join(artifactDir, latestName);
          const json = JSON.parse(fs.readFileSync(latest, "utf8"));
          for (const k of postAssert.contains_keys || []) {
            if (!(k in json)) {
              throw new Error(`[POST_ASSERT] Missing key '${k}' in ${latest}`);
            }
          }

          if (postAssert.contains_subset && typeof postAssert.contains_subset === "object") {
            if (!deepSubsetMatch(json, postAssert.contains_subset)) {
              // On some filesystems (notably Windows) multiple artifacts can share the same
              // mtimeMs when SMOKE_FIXED_NOW_ISO pins timestamps. In that case, selecting the
              // "latest" artifact can be non-deterministic. Fall back to scanning all artifacts.
              let found = false;
              for (const name of files) {
                try {
                  const full = path.join(artifactDir, name);
                  const candidate = JSON.parse(fs.readFileSync(full, "utf8"));
                  if (deepSubsetMatch(candidate, postAssert.contains_subset)) {
                    found = true;
                    break;
                  }
                } catch {
                  // ignore
                }
              }
              if (!found) {
                throw new Error(`[POST_ASSERT] Artifact JSON did not match expected subset: ${latest}`);
              }
            }
          }
        }

        if (postAssert?.receipt_subset) {
          const expectedSubset = postAssert.receipt_subset;

          const explicitExecutionId =
            expectedSubset && typeof expectedSubset === "object"
              ? expectedSubset.execution_id
              : null;

          const inferredExecutionId =
            typeof explicitExecutionId === "string" && explicitExecutionId.trim()
              ? explicitExecutionId
              : typeof v?.planner_override?.execution_id === "string" && v.planner_override.execution_id.trim()
                ? v.planner_override.execution_id
                : typeof v?.expect?.execution_id === "string" && v.expect.execution_id.trim()
                  ? v.expect.execution_id
                  : typeof gotJson?.execution_id === "string" && gotJson.execution_id.trim()
                    ? gotJson.execution_id
                    : null;

          const expectedKind =
            expectedSubset && typeof expectedSubset === "object" && typeof expectedSubset.kind === "string"
              ? expectedSubset.kind.trim()
              : null;
          const effectiveExecutionId =
            // If the expected receipt kind is NOT the main RunReceipt, the receipt we're
            // asserting about may have a different execution_id than the CLI response.
            // Only anchor on execution_id when it is explicitly requested, or when we're
            // asserting against the main run receipt.
            typeof explicitExecutionId === "string" && explicitExecutionId.trim()
              ? explicitExecutionId
              : expectedKind && expectedKind !== "RunReceipt"
                ? null
                : inferredExecutionId;

          const waitForMatchingNewReceipt = async () => {
            const deadline = Date.now() + 8000;
            while (Date.now() < deadline) {
              const newReceipts = getNewReceipts();

              if (typeof effectiveExecutionId === "string" && effectiveExecutionId.trim()) {
                const id = effectiveExecutionId.trim();
                for (let i = newReceipts.length - 1; i >= 0; i -= 1) {
                  const r = newReceipts[i];
                  if (r?.execution_id !== id) continue;
                  if (deepSubsetMatch(r, expectedSubset)) return { receipt: r, newReceipts };
                  return { receipt: r, newReceipts };
                }
              } else {
                // No execution_id available: require the expected subset to match a receipt
                // emitted during *this* vector run.
                for (let i = newReceipts.length - 1; i >= 0; i -= 1) {
                  const r = newReceipts[i];
                  if (deepSubsetMatch(r, expectedSubset)) return { receipt: r, newReceipts };
                }
              }

              await sleep(75);
            }
            return { receipt: null, newReceipts: getNewReceipts() };
          };

          const waited = await waitForMatchingNewReceipt();
          const receipt = waited.receipt
            ? waited.receipt
            : typeof effectiveExecutionId === "string" && effectiveExecutionId.trim()
              ? readLastReceiptForExecutionId(effectiveExecutionId)
              : readLastReceiptLine();
          if (!receipt) {
            throw new Error("[POST_ASSERT] No receipt found");
          }
          if (!deepSubsetMatch(receipt, expectedSubset)) {
            const preview = JSON.stringify(
              { expected: expectedSubset, got: receipt },
              null,
              2
            ).slice(0, 1200);
            throw new Error(`[POST_ASSERT] Receipt did not match expected subset. Preview: ${preview}`);
          }
        }

        if (beforeWrites && afterWrites) {
          assertNoWrites(beforeWrites, afterWrites);
        }

        assertOperatorPostAssert(gotJson, postAssert);

        if (postAssert?.confidence && typeof postAssert.confidence === "object") {
          const cfg = postAssert.confidence;
          if (!isObject(gotJson) || gotJson.kind !== "ConfidenceScore") {
            throw new Error("[POST_ASSERT] confidence: response kind is not ConfidenceScore");
          }
          if (typeof cfg.min_score === "number") {
            const score = isObject(gotJson.confidence) ? gotJson.confidence.score : null;
            if (typeof score !== "number") {
              throw new Error("[POST_ASSERT] confidence: missing confidence.score");
            }
            if (score < cfg.min_score) {
              throw new Error(
                `[POST_ASSERT] confidence: score below min (got ${score}, expected >= ${cfg.min_score})`
              );
            }
          }
        }

        if (postAssert?.scheduler_history && typeof postAssert.scheduler_history === "object") {
          const cfg = postAssert.scheduler_history;
          if (!isObject(gotJson) || gotJson.kind !== "SchedulerHistory") {
            throw new Error("[POST_ASSERT] scheduler_history: response kind is not SchedulerHistory");
          }

          const rows = Array.isArray(gotJson.rows) ? gotJson.rows : null;
          if (!rows) throw new Error("[POST_ASSERT] scheduler_history: response.rows must be an array");

          if (typeof cfg.rows_length === "number") {
            if (rows.length !== cfg.rows_length) {
              throw new Error(
                `[POST_ASSERT] scheduler_history: rows length mismatch (got ${rows.length}, expected ${cfg.rows_length})`
              );
            }
          }

          if (cfg.latest === true) {
            const jobIdFromCfg = typeof cfg.job_id === "string" && cfg.job_id.trim() ? cfg.job_id.trim() : null;
            const cmdText = String(command ?? "");
            const m = cmdText.match(/^\/scheduler\s+history\s+(\S+)/i);
            const jobId = jobIdFromCfg || (m ? m[1] : null);
            if (!jobId) throw new Error("[POST_ASSERT] scheduler_history: missing job_id for latest assertion");

            // Parse optional --since from the command (same contract as the CLI).
            let sinceMs = null;
            const sinceMatch = cmdText.match(/\s--since\s+(\S+)/i);
            if (sinceMatch?.[1]) {
              const d = new Date(sinceMatch[1]);
              if (!Number.isFinite(d.getTime())) {
                throw new Error("[POST_ASSERT] scheduler_history: invalid --since in command");
              }
              sinceMs = d.getTime();
            }

            const dir = path.join(process.cwd(), "runs", "scheduler-history");
            if (!fs.existsSync(dir)) throw new Error("[POST_ASSERT] scheduler_history: runs/scheduler-history missing");
            const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

            const candidates = [];
            for (const f of files) {
              const full = path.join(dir, f);
              let data;
              try {
                data = JSON.parse(fs.readFileSync(full, "utf8"));
              } catch {
                continue;
              }
              if (!data || data.job_id !== jobId) continue;
              const startedAt = new Date(String(data.started_at ?? ""));
              const t = startedAt.getTime();
              if (!Number.isFinite(t)) continue;
              if (sinceMs !== null && t < sinceMs) continue;
              candidates.push({ started_at: startedAt.toISOString(), t });
            }

            if (!candidates.length) {
              throw new Error("[POST_ASSERT] scheduler_history: no matching history rows on disk");
            }

            const expectedLatest = candidates.sort((a, b) => b.t - a.t)[0].started_at;
            const first = rows[0];
            const gotStartedAt = first && typeof first.started_at === "string" ? first.started_at : null;
            if (!gotStartedAt) {
              throw new Error("[POST_ASSERT] scheduler_history: rows[0].started_at missing");
            }
            if (gotStartedAt !== expectedLatest) {
              throw new Error(
                `[POST_ASSERT] scheduler_history: latest started_at mismatch (got ${gotStartedAt}, expected ${expectedLatest})`
              );
            }
          }
        }

        if (postAssert?.scheduler_explain && typeof postAssert.scheduler_explain === "object") {
          const cfg = postAssert.scheduler_explain;
          if (!isObject(gotJson) || gotJson.kind !== "SchedulerExplain") {
            throw new Error("[POST_ASSERT] scheduler_explain: response kind is not SchedulerExplain");
          }
          if (typeof cfg.primary_reason === "string" && gotJson.primary_reason !== cfg.primary_reason) {
            throw new Error(
              `[POST_ASSERT] scheduler_explain: primary_reason mismatch (got ${gotJson.primary_reason}, expected ${cfg.primary_reason})`
            );
          }
          if (typeof cfg.would_run === "boolean" && gotJson.would_run !== cfg.would_run) {
            throw new Error(
              `[POST_ASSERT] scheduler_explain: would_run mismatch (got ${gotJson.would_run}, expected ${cfg.would_run})`
            );
          }
          if (!Array.isArray(gotJson.to_unblock) || gotJson.to_unblock.length === 0) {
            throw new Error("[POST_ASSERT] scheduler_explain: to_unblock must be a non-empty array");
          }
          if (!Array.isArray(gotJson.reasons) || gotJson.reasons.length === 0) {
            throw new Error("[POST_ASSERT] scheduler_explain: reasons must be a non-empty array");
          }
          for (const r of gotJson.reasons) {
            if (!r || typeof r !== "object") continue;
            const evidence = r.evidence;
            if (typeof evidence !== "string" || !evidence.trim()) {
              throw new Error("[POST_ASSERT] scheduler_explain: reason.evidence must be a non-empty string");
            }
            // Only enforce existence for run artifacts/state paths.
            if (evidence.startsWith("runs/")) {
              const p = path.resolve(process.cwd(), evidence);
              if (!fs.existsSync(p)) {
                throw new Error(`[POST_ASSERT] scheduler_explain: evidence path missing: ${evidence}`);
              }
            }
          }
        }

        if (postAssert?.audit_export && typeof postAssert.audit_export === "object") {
          const cfg = postAssert.audit_export;
          if (!isObject(gotJson) || gotJson.kind !== "AuditExportResult") {
            throw new Error("[POST_ASSERT] audit_export: response kind is not AuditExportResult");
          }
          const exportDir = typeof gotJson.export_dir === "string" ? gotJson.export_dir : null;
          if (!exportDir) throw new Error("[POST_ASSERT] audit_export: missing export_dir");
          const absExport = path.resolve(process.cwd(), exportDir);
          if (!fs.existsSync(absExport)) {
            throw new Error(`[POST_ASSERT] audit_export: export_dir not found: ${exportDir}`);
          }
          if (Array.isArray(cfg.must_contain_files)) {
            for (const rel of cfg.must_contain_files) {
              const p = path.join(absExport, String(rel).replace(/\\/g, "/"));
              if (!fs.existsSync(p)) {
                throw new Error(`[POST_ASSERT] audit_export: missing file in bundle: ${rel}`);
              }
            }
          }
        }

        if (postAssert?.audit_verify) {
          if (!isObject(gotJson) || gotJson.kind !== "AuditExportResult") {
            throw new Error("[POST_ASSERT] audit_verify: requires AuditExportResult response");
          }
          const exportDir = typeof gotJson.export_dir === "string" ? gotJson.export_dir : null;
          if (!exportDir) throw new Error("[POST_ASSERT] audit_verify: missing export_dir");
          const absExport = path.resolve(process.cwd(), exportDir);

          const proc = spawnSync(process.execPath, ["VERIFY/verify.cjs", "."], {
            cwd: absExport,
            encoding: "utf8",
          });
          if (proc.status !== 0) {
            throw new Error(
              `[POST_ASSERT] audit_verify: verifier failed (exit=${proc.status}) stderr=${String(proc.stderr || "").slice(0, 500)}`
            );
          }
        }

        if (postAssert?.audit_execution_export && typeof postAssert.audit_execution_export === "object") {
          const cfg = postAssert.audit_execution_export;
          if (!isObject(gotJson) || gotJson.kind !== "AuditExecutionExportResult") {
            throw new Error("[POST_ASSERT] audit_execution_export: response kind is not AuditExecutionExportResult");
          }

          const exportDir = typeof gotJson.export_dir === "string" ? gotJson.export_dir : null;
          if (!exportDir) throw new Error("[POST_ASSERT] audit_execution_export: missing export_dir");
          const absExport = path.resolve(process.cwd(), exportDir);
          if (!fs.existsSync(absExport)) {
            throw new Error(`[POST_ASSERT] audit_execution_export: export_dir not found: ${exportDir}`);
          }

          if (Array.isArray(cfg.must_contain_files)) {
            for (const rel of cfg.must_contain_files) {
              const p = path.join(absExport, String(rel).replace(/\\/g, "/"));
              if (!fs.existsSync(p)) {
                throw new Error(`[POST_ASSERT] audit_execution_export: missing file in bundle: ${rel}`);
              }
            }
          }

          if (cfg.must_have_zip === true) {
            const zipPath = typeof gotJson.zip_path === "string" ? gotJson.zip_path : null;
            if (!zipPath) throw new Error("[POST_ASSERT] audit_execution_export: missing zip_path");
            const absZip = path.resolve(process.cwd(), zipPath);
            if (!fs.existsSync(absZip)) {
              throw new Error(`[POST_ASSERT] audit_execution_export: zip not found: ${zipPath}`);
            }
          }

          if (cfg.verify_ok === true) {
            const proc = spawnSync(process.execPath, ["verify.js"], {
              cwd: absExport,
              encoding: "utf8",
            });
            if (proc.status !== 0) {
              throw new Error(
                `[POST_ASSERT] audit_execution_export: verify.js failed (exit=${proc.status}) stderr=${String(proc.stderr || "").slice(0, 500)}`
              );
            }
          }
        }

        if (postAssert?.audit_execution_tamper && typeof postAssert.audit_execution_tamper === "object") {
          const cfg = postAssert.audit_execution_tamper;
          if (!isObject(gotJson) || gotJson.kind !== "AuditExecutionExportResult") {
            throw new Error("[POST_ASSERT] audit_execution_tamper: requires AuditExecutionExportResult response");
          }

          const exportDir = typeof gotJson.export_dir === "string" ? gotJson.export_dir : null;
          if (!exportDir) throw new Error("[POST_ASSERT] audit_execution_tamper: missing export_dir");
          const absExport = path.resolve(process.cwd(), exportDir);
          if (!fs.existsSync(absExport)) {
            throw new Error(`[POST_ASSERT] audit_execution_tamper: export_dir not found: ${exportDir}`);
          }

          const tamperRel = typeof cfg.tamper_path === "string" ? cfg.tamper_path : null;
          if (!tamperRel) throw new Error("[POST_ASSERT] audit_execution_tamper: missing tamper_path");
          const tamperAbs = path.join(absExport, tamperRel.replace(/\\/g, "/"));
          if (!fs.existsSync(tamperAbs)) {
            throw new Error(`[POST_ASSERT] audit_execution_tamper: tamper_path not found: ${tamperRel}`);
          }

          // Mutate the file deterministically so hashes.json no longer matches.
          const original = fs.readFileSync(tamperAbs);
          fs.writeFileSync(tamperAbs, Buffer.concat([original, Buffer.from("\n ", "utf8")]));

          const proc = spawnSync(process.execPath, ["verify.js"], {
            cwd: absExport,
            encoding: "utf8",
          });

          if (cfg.verify_should_fail === true) {
            if (proc.status === 0) {
              throw new Error("[POST_ASSERT] audit_execution_tamper: expected verify.js to fail, but it succeeded");
            }
          } else {
            if (proc.status !== 0) {
              throw new Error(
                `[POST_ASSERT] audit_execution_tamper: verify.js failed unexpectedly (exit=${proc.status}) stderr=${String(proc.stderr || "").slice(0, 500)}`
              );
            }
          }
        }

        if (postAssert?.approval_state) {
          const receipt = readLastReceiptLine();
          if (!receipt || typeof receipt.execution_id !== "string" || !receipt.execution_id) {
            throw new Error("[POST_ASSERT] approval_state: missing receipt.execution_id");
          }
          const statePath = path.resolve(
            process.cwd(),
            "runs",
            "approvals",
            `${receipt.execution_id}.json`
          );
          if (!fs.existsSync(statePath)) {
            throw new Error(`[POST_ASSERT] approval_state: state file not found: ${statePath}`);
          }
          const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
          if (state?.status !== "awaiting_approval") {
            throw new Error(
              `[POST_ASSERT] approval_state: status mismatch (got '${state?.status}', expected 'awaiting_approval')`
            );
          }
          if (typeof state?.plan_hash !== "string" || !state.plan_hash) {
            throw new Error("[POST_ASSERT] approval_state: missing or invalid plan_hash in state file");
          }
          if (typeof receipt?.plan_hash !== "string" || !receipt.plan_hash) {
            throw new Error("[POST_ASSERT] approval_state: missing or invalid plan_hash in receipt");
          }
          if (receipt.plan_hash !== state.plan_hash) {
            throw new Error(
              "[POST_ASSERT] approval_state: receipt.plan_hash did not match approval state plan_hash"
            );
          }

          if (postAssert.approval_state_subset && typeof postAssert.approval_state_subset === "object") {
            if (!deepSubsetMatch(state, postAssert.approval_state_subset)) {
              throw new Error("[POST_ASSERT] approval_state_subset: state did not match expected subset");
            }
          }
        }

        if (Array.isArray(postAssert?.files_exist) && postAssert.files_exist.length) {
          for (const rel of postAssert.files_exist) {
            const fullPath = path.resolve(process.cwd(), String(rel));
            if (!fs.existsSync(fullPath)) {
              throw new Error(`[POST_ASSERT] expected file not found: ${rel}`);
            }
          }
        }

        if (postAssert?.resume_reused_plan_hash) {
          const receipt = readLastReceiptLine();
          if (!receipt || typeof receipt.execution_id !== "string" || !receipt.execution_id) {
            throw new Error("[POST_ASSERT] resume_reused_plan_hash: missing receipt.execution_id");
          }
          if (typeof receipt?.plan_hash !== "string" || !receipt.plan_hash) {
            throw new Error("[POST_ASSERT] resume_reused_plan_hash: missing or invalid receipt.plan_hash");
          }
          const statePath = path.resolve(
            process.cwd(),
            "runs",
            "approvals",
            `${receipt.execution_id}.json`
          );
          if (!fs.existsSync(statePath)) {
            throw new Error(`[POST_ASSERT] resume_reused_plan_hash: state file not found: ${statePath}`);
          }
          const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
          if (typeof state?.plan_hash !== "string" || !state.plan_hash) {
            throw new Error("[POST_ASSERT] resume_reused_plan_hash: missing or invalid state.plan_hash");
          }
          if (receipt.plan_hash !== state.plan_hash) {
            throw new Error(
              "[POST_ASSERT] resume_reused_plan_hash: receipt.plan_hash did not match approval state plan_hash"
            );
          }
        }

        return { ok, status: 0, kind: gotJson?.kind ?? gotJson?.status ?? null };
      }

      const webhookUrl = getWebhookUrlForStage(stage);
      if (!webhookUrl) {
        throw new Error(
          `Missing webhook URL for stage '${stage ?? "(default)"}'. Set WEBHOOK_URL or VALIDATION_WEBHOOK_URL/PLANNER_WEBHOOK_URL.`
        );
      }

      const out = await sendMessage({ message: command, threadId, webhookUrl });

      // Webhook response is JSON. We expect the agent payload in out.response.response (string).
      const agentText = out?.response?.response;
      if (typeof agentText !== "string") {
        const preview = JSON.stringify(out?.response ?? null).slice(0, 240);
        throw new Error(`Agent did not return a string 'response' field. response=${preview}`);
      }
      const agentJson = extractJsonFromText(agentText);

      if (process.env.STRICT_AGENT_OUTPUT === "1") {
        if (agentJson?.threadId === undefined) {
          throw new Error("[OBS-THREADID-INHERIT] agentJson.threadId missing in strict mode");
        }
        if (agentJson.threadId !== threadId) {
          throw new Error("agentJson.threadId mismatch in strict mode");
        }
      }

      const ok = deepSubsetMatch(agentJson, expect);

      if (typeof expectFile === "string" && expectFile.trim()) {
        const fullPath = path.resolve(process.cwd(), expectFile);
        if (!fs.existsSync(fullPath)) {
          throw new Error(`expected file not found: ${expectFile}`);
        }
      }

      if (postAssert?.artifact_dir) {
        throw new Error("post_assert is only supported for stage 'cli'");
      }

      return { ok, status: out.status, kind: agentJson?.kind ?? null };
    });

    const ok = result.ok;

    results.push({
      name,
      ok,
      status: result.status,
      kind: result.kind,
      stage: stage ?? "default",
      duration_ms: Date.now() - startedAt,
    });

    if (!ok) failed += 1;
  } catch (e) {
    failed += 1;
    results.push({
      name: name ?? "(missing name)",
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      duration_ms: Date.now() - startedAt,
    });
  }
}

process.stdout.write(
  JSON.stringify(
    {
      threadId,
      vectors: results,
      ok: failed === 0,
      failed,
      total: results.length,
    },
    null,
    2
  )
);

if (failed !== 0) process.exitCode = 1;

if (mockServerProc) {
  await stopLocalMockServer(mockServerProc);
}

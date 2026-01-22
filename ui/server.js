import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { sendMessage } from "../sendMessage.js";
import voiceRoutes from "./routes/voice.routes.js";
import slackRoutes from "./routes/slack.routes.js";
import slackCommandRoutes from "./routes/slack.commands.routes.js";
import slackInboundRoutes from "./routes/slack.inbound.routes.js";
import slackGraphRoutes from "./routes/slack.graph.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import caseConfigRoutes from "./routes/caseConfig.routes.js";
import enforcementTestRoutes from "./routes/enforcementTest.routes.js";
import clusterRoutes from "./routes/cluster.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import adminNodeRoutes from "./routes/admin.node.routes.js";
import adminCaseRoutes from "./routes/admin.case.routes.js";
import adminAnalyticsRoutes from "./routes/admin.analytics.routes.js";
import adminSecurityRoutes from "./routes/admin.security.routes.js";
import adminSecurityBinderRoutes from "./routes/admin.securityBinder.routes.js";
import adminBlueTeamRoutes from "./routes/admin.blueTeam.routes.js";
import adminSlackRoutes from "./routes/admin.slack.routes.js";
import adminDebugRoutes from "./routes/admin.debug.routes.js";
import adminLitigationRoutes from "./routes/admin.litigation.routes.js";
import debugRoutes from "./routes/debug.routes.js";
import advisorRoutes from "./routes/advisor.routes.js";
import webhooksRoutes from "./routes/webhooks.routes.js";
import timelineRoutes from "./routes/timeline.routes.js";
import omniRoutes from "./routes/omni.routes.js";
import judgesRoutes from "./routes/judges.routes.js";
import templateHistoryRoutes from "./routes/templateHistory.routes.js";
import strategyRoutes from "./routes/strategy.routes.js";
import governorRoutes from "./routes/governor.routes.js";
import adminGovernorRoutes from "./routes/admin.governor.routes.js";
import securityRoutes from "./routes/security.routes.js";
import paralegalRoutes from "./routes/paralegal.routes.js";
import { ensureSelfRegistered, setSelfUrl } from "./core/clusterManager.js";
import { loadControlSecretsEnv } from "./core/envLoader.js";

import { securityHeaders } from "./security/securityHeaders.js";
import { perimeterVision } from "./security/perimeterVision.js";
import { networkVision } from "./security/networkVision.js";
import { threatAwareGuard } from "./security/threatAwareGuard.js";
import { createRateLimiter } from "./security/rateLimit.js";
import { SlackClient } from "./services/SlackClient.js";
import { startSlackTokenWatchdog } from "../src/watchers/slackTokenWatchdog.js";
import registerSlackTestRoutes from "../src/routes/slack.test.routes.js";

// Side-effect import: registers Slack event bus bindings
import "./integrations/slackEvents.js";
// Side-effect import: registers Slack slash command handlers
import "./integrations/slackCommandHandlers.js";
// Side-effect import: posts interactive Slack alerts for key events
import "./integrations/slackExpansionAlerts.js";

// Side-effect import: optional voice autopilot (env-gated)
import "./integrations/voiceAutopilot.js";

// Side-effect import: Notion mirroring for paralegal cases/tasks (env-gated)
import "./integrations/notionParalegalSync.js";

// Side-effect imports: Slack command fusion bridges
import "./intelligence/slackNotionBridge.js";
import "./intelligence/slackCalendarBridge.js";
import "./intelligence/slackMakeBridge.js";
import "./intelligence/slackVoiceBridge.js";
import "./intelligence/slackEnforcementBus.js";

// Side-effect import: autonomous mode engine (env-gated)
import "./intelligence/autonomousEngine.js";

// Side-effect import: Governor + Tribunal engine (env-gated internally)
import "./intelligence/governorBoot.js";

// Side-effect import: Autonomous Paralegal orchestrator
import "./intelligence/paralegal/paralegalOrchestrator.js";

// Side-effect import: load latest Slack knowledge graph (if present)
import "./intelligence/slackGraphBoot.js";

// Side-effect import: autonomous paralegal task/case engine (env-gated)
import "./intelligence/autonomousParalegal.js";

// Side-effect imports: log/timeline persistence for ops UI
import "./services/advisorLogEngine.js";
import "./services/timelineEngine.js";
import { startOmniSkillEngine } from "./intelligence/omniSkillEngine.js";

// Side-effect import: security + vision + threat engines
import "./security/securityBoot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local secrets early (no override) so the UI server sees control/secrets.env.
loadControlSecretsEnv();

const app = express();

// If behind a reverse proxy in prod, set UI_TRUST_PROXY=1 so req.ip is correct.
if (String(process.env.UI_TRUST_PROXY || "").trim() === "1") {
  app.set("trust proxy", true);
}
const DESIRED_PORT = Number(process.env.UI_PORT || 3001);
const HOST = String(process.env.UI_HOST || "127.0.0.1").trim() || "127.0.0.1";
const PORT_FALLBACK_RANGE = Number(process.env.UI_PORT_FALLBACK_RANGE || 20);
const RUNS_DIR = path.resolve(process.cwd(), "runs");
const EXPORTS_DIR = path.resolve(process.cwd(), "exports");
const CLIENT_DIST = path.join(__dirname, "client", "dist");
const LEGACY_PUBLIC = path.join(__dirname, "public");

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sintraprime-ui", uptime_s: Math.round(process.uptime()) });
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "sintraprime-ui", uptime_s: Math.round(process.uptime()) });
});

app.use("/api/slack", slackGraphRoutes);

// Allow local dev UIs (e.g. Next on :3000) to call this server directly.
// Configure via UI_CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000".
const DEFAULT_CORS = "http://localhost:3000,http://127.0.0.1:3000";
const CORS_ORIGINS = String(process.env.UI_CORS_ORIGINS || DEFAULT_CORS)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = String(req.headers.origin || "").trim();
  if (origin && (CORS_ORIGINS.includes("*") || CORS_ORIGINS.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, X-API-Key, X-Sintra-Admin",
    );
  }

  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// Baseline security headers + basic request vision.
app.use(securityHeaders);
app.use(perimeterVision);
app.use(networkVision);
app.use(threatAwareGuard);

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      // Capture raw JSON for HMAC verification on signed webhook routes.
      // This must be done at the first JSON parser that consumes the stream.
      req.rawBody = buf?.toString("utf8") || "";
    },
  }),
);

// Rate limit the most sensitive surfaces.
const adminLimiter = createRateLimiter({ windowMs: 60_000, max: 40, keyFn: (req) => req.ip, label: "admin" });
const slackCmdLimiter = createRateLimiter({ windowMs: 60_000, max: 120, keyFn: (req) => req.ip, label: "slack-command" });
app.use("/api/admin", adminLimiter);
app.use("/api/slack/command", slackCmdLimiter);

// Ensure at least a local node exists in the cluster view.
ensureSelfRegistered();

let slackClientForOps = null;

function safeInit(label, fn) {
  try {
    const out = fn();
    if (out && typeof out.then === "function") {
      out.catch((err) => {
        console.warn(`[UI] ⚠️ ${label} failed: ${err?.message || String(err)}`);
      });
    }
  } catch (err) {
    console.warn(`[UI] ⚠️ ${label} failed: ${err?.message || String(err)}`);
  }
}

// OmniSkill planning engine (event-bus wiring)
startOmniSkillEngine();

// Optional: concise log when Slack self-heals
safeInit("Slack reconnection logger", async () => {
  const { eventBus } = await import("./core/eventBus.js");
  eventBus.on("slack.reconnected", (evt) => {
    console.log("[Watchtower] Slack reconnected at", evt?.time, "via", evt?.source);
  });
});

// Slack Token Watchtower (optional): proactive auth health + best-effort OAuth refresh.
// NOTE: Token refresh only works if Slack issued a refresh token for your install.
safeInit("Slack Token Watchtower", () => {
  const offline = String(process.env.SLACK_OFFLINE || "").trim() === "1";
  if (offline) return;

  const enabled = String(process.env.SLACK_WATCHTOWER || "").trim();
  if (enabled === "0") return;

  // Auto-enable if token present unless explicitly disabled.
  const hasToken = Boolean(process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN);
  if (enabled !== "1" && !hasToken) return;

  const slackClient = new SlackClient({
    defaultChannel: process.env.SLACK_PARALEGAL_CHANNEL || process.env.SLACK_DEFAULT_CHANNEL || "#all-ikesolutions",
  });

  slackClientForOps = slackClient;

  startSlackTokenWatchdog(slackClient);
});

// Slack test suite routes (admin-gated; see src/routes/slack.test.routes.js)
registerSlackTestRoutes(app, { getSlackClient: () => slackClientForOps });

// Voice synthesis API (ElevenLabs)
app.use("/api/voice", voiceRoutes);
// Compatibility alias (requested): /voice/test/:mode
app.use("/voice", voiceRoutes);

// Slack brainstem API (Make.com should call this, not Slack directly)
app.use("/api/slack", slackRoutes);

// Slack slash commands (e.g. /sintra)
app.use("/api/slack", slackCommandRoutes);

// Slack Events API + Interactivity (optional; requires public URL and signing secret)
app.use("/api/slack", slackInboundRoutes);

// Unified inbound webhooks (Make/TikTok/etc). These are public-facing; keep them signed.
app.use(webhooksRoutes);

// Dashboard APIs (enforcement status + controls)
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cases", caseConfigRoutes);
app.use("/api/enforcement", enforcementTestRoutes);

// Advisor + timeline APIs
app.use("/api/advisor", advisorRoutes);
app.use("/api/timeline", timelineRoutes);

// OmniSkill APIs
app.use("/api/omni", omniRoutes);

// Autonomous Paralegal state API
app.use("/api", paralegalRoutes);

// Debug-only event injection API (env-gated; can be admin-protected)
app.use("/api", debugRoutes);

// Judge + template evolution + strategy (Cluster Console)
app.use("/api/judges", judgesRoutes);
app.use("/api/template-history", templateHistoryRoutes);
app.use("/api/strategy", strategyRoutes);
app.use("/api/governor", governorRoutes);

// Cluster + analytics APIs
app.use("/api/cluster", clusterRoutes);
app.use("/api/analytics", analyticsRoutes);

// Security state + incidents
app.use("/api/security", securityRoutes);

// Admin control plane
app.use("/api/admin", adminNodeRoutes);
app.use("/api/admin", adminCaseRoutes);
app.use("/api/admin", adminAnalyticsRoutes);
app.use("/api/admin", adminGovernorRoutes);
app.use("/api/admin", adminSecurityRoutes);
app.use("/api/admin", adminSecurityBinderRoutes);
app.use("/api/admin", adminBlueTeamRoutes);
app.use("/api/admin", adminSlackRoutes);
app.use("/api/admin", adminDebugRoutes);
app.use("/api/admin", adminLitigationRoutes);

function safeReadJson(absPath) {
  try {
    return JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch {
    return null;
  }
}

function parseIsoOrNull(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

function bestTimestampIso(obj) {
  const candidates = [
    obj?.finished_at,
    obj?.started_at,
    obj?.created_at,
    obj?.captured_at,
    obj?.approved_at,
    obj?.written_at,
    obj?.guard_evaluated_at,
    obj?.requested_at,
    obj?.generated_at,
  ];
  for (const c of candidates) {
    const t = parseIsoOrNull(c);
    if (t !== null) return new Date(t).toISOString();
  }
  return null;
}

function resolveUnderRuns(relPath) {
  const abs = path.resolve(RUNS_DIR, String(relPath || ""));
  const base = RUNS_DIR.endsWith(path.sep) ? RUNS_DIR : RUNS_DIR + path.sep;
  if (!abs.startsWith(base) && abs !== RUNS_DIR) {
    throw new Error("path escapes runs/");
  }
  return abs;
}

function resolveUnderExports(maybeAbsOrRelPath) {
  const raw = String(maybeAbsOrRelPath || "");
  const abs = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(process.cwd(), raw);
  const base = EXPORTS_DIR.endsWith(path.sep) ? EXPORTS_DIR : EXPORTS_DIR + path.sep;
  if (!abs.startsWith(base) && abs !== EXPORTS_DIR) {
    throw new Error("path escapes exports/");
  }
  return abs;
}

function sanitizeFilePart(value) {
  const s = String(value ?? "");
  const cleaned = s.replace(/[\\/<>:\"|?*\x00-\x1F]/g, "_");
  return cleaned.slice(0, 160);
}

function findLatestAuditZipForExecution(executionId) {
  const safeId = sanitizeFilePart(executionId);
  const dir = path.join(EXPORTS_DIR, "audit_exec");
  if (!fs.existsSync(dir)) return null;

  const prefix = `audit_${safeId}.zip`;
  const candidates = fs
    .readdirSync(dir)
    .filter((name) => name === prefix || (name.startsWith(prefix + "_") && /^_\d+$/.test(name.slice((prefix + "_").length))))
    .map((name) => {
      const abs = path.join(dir, name);
      try {
        const st = fs.statSync(abs);
        return st.isFile() ? { name, abs, mtimeMs: st.mtimeMs } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    if (a.mtimeMs !== b.mtimeMs) return b.mtimeMs - a.mtimeMs;
    return String(b.name).localeCompare(String(a.name));
  });
  return candidates[0].abs;
}

// ---- READ-ONLY APIs ----

app.get("/api/approvals", (_req, res) => {
  const dir = path.join(RUNS_DIR, "approvals");
  if (!fs.existsSync(dir)) return res.json([]);
  const items = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => safeReadJson(path.join(dir, f)))
    .filter(Boolean);
  res.json(items);
});

app.get("/api/receipts", (req, res) => {
  const limit = Math.min(500, Math.max(0, Number(req.query.limit || 100)));
  const file = path.join(RUNS_DIR, "receipts.jsonl");
  if (!fs.existsSync(file)) return res.json([]);
  const raw = fs.readFileSync(file, "utf8").trim();
  if (!raw) return res.json([]);
  const lines = raw.split("\n").filter(Boolean);
  const out = [];
  for (const l of lines.slice(-limit)) {
    try {
      out.push(JSON.parse(l));
    } catch {
      // ignore malformed
    }
  }
  res.json(out);
});

app.get("/api/artifacts", (req, res) => {
  const prefix = String(req.query.prefix || "");
  let base;
  try {
    base = resolveUnderRuns(prefix);
  } catch {
    return res.status(400).json({ error: "prefix must be under runs/" });
  }

  if (!fs.existsSync(base)) return res.json([]);

  const walk = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(d, e.name))
        : [{ path: path.relative(RUNS_DIR, path.join(d, e.name)).replace(/\\\\/g, "/") }]
    );

  res.json(walk(base));
});

app.get("/api/file", (req, res) => {
  const rel = req.query.path;
  if (!rel) return res.status(400).json({ error: "path required" });

  let abs;
  try {
    abs = resolveUnderRuns(String(rel));
  } catch {
    return res.status(403).end();
  }

  if (!fs.existsSync(abs)) return res.status(404).end();

  // v1: JSON-only for safety.
  res.json(safeReadJson(abs));
});

app.get("/api/raw", (req, res) => {
  const rel = req.query.path;
  if (!rel) return res.status(400).json({ error: "path required" });

  let abs;
  try {
    abs = resolveUnderRuns(String(rel));
  } catch {
    return res.status(403).end();
  }

  if (!fs.existsSync(abs)) return res.status(404).end();

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${path.basename(abs)}"`);
  fs.createReadStream(abs).pipe(res);
});

app.get("/api/export", (req, res) => {
  const rel = req.query.path;
  if (!rel) return res.status(400).json({ error: "path required" });

  let abs;
  try {
    abs = resolveUnderExports(String(rel));
  } catch {
    return res.status(403).end();
  }

  if (!fs.existsSync(abs)) return res.status(404).end();

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${path.basename(abs)}"`);
  fs.createReadStream(abs).pipe(res);
});

app.get("/api/execution/:executionId", (req, res) => {
  const executionId = String(req.params.executionId || "").trim();
  if (!executionId) return res.status(400).json({ error: "executionId required" });

  // Receipt: scan receipts.jsonl for the last matching line.
  let receipt = null;
  try {
    const p = path.join(RUNS_DIR, "receipts.jsonl");
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        try {
          const row = JSON.parse(lines[i]);
          if (row?.execution_id === executionId) {
            receipt = row;
            break;
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  const approvalAbs = path.join(RUNS_DIR, "approvals", `${executionId}.json`);
  const approval = fs.existsSync(approvalAbs) ? safeReadJson(approvalAbs) : null;

  const prestateDir = path.join(RUNS_DIR, "prestate");
  const prestate_paths = fs.existsSync(prestateDir)
    ? fs
        .readdirSync(prestateDir)
        .filter((f) => f.startsWith(`${executionId}.`) && f.endsWith(".json"))
        .map((f) => `prestate/${f}`)
        .sort((a, b) => a.localeCompare(b))
    : [];

  // Artifacts: walk one level under runs/ and include files with the execution prefix.
  const artifact_items = [];
  if (fs.existsSync(RUNS_DIR)) {
    for (const ent of fs.readdirSync(RUNS_DIR, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const dir = ent.name;
      if (dir === "approvals" || dir === "prestate" || dir === "scheduler-history") continue;
      const dirAbs = path.join(RUNS_DIR, dir);
      for (const f of fs.readdirSync(dirAbs)) {
        if (!f || (!f.startsWith(`${executionId}.`) && f !== `${executionId}.json`)) continue;
        const rel = `${dir}/${f}`;
        const json = safeReadJson(path.join(dirAbs, f));
        artifact_items.push({
          path: rel,
          timestamp: json ? bestTimestampIso(json) : null,
          kind: json?.kind || json?.event || null,
        });
      }
    }
  }
  artifact_items.sort((a, b) => String(a.path).localeCompare(String(b.path)));

  const zipAbs = findLatestAuditZipForExecution(executionId);
  const bundle = zipAbs
    ? {
        zip_path: zipAbs.replace(/\\/g, "/"),
        download_url: `/api/execution/${encodeURIComponent(executionId)}/bundle`,
      }
    : null;

  res.json({
    execution_id: executionId,
    receipt,
    approval,
    prestate_paths,
    artifact_items,
    rollback: null,
    bundle,
  });
});

app.get("/api/execution/:executionId/bundle", (req, res) => {
  const executionId = String(req.params.executionId || "").trim();
  if (!executionId) return res.status(400).json({ error: "executionId required" });

  const zipAbs = findLatestAuditZipForExecution(executionId);
  if (!zipAbs) return res.status(404).json({ error: "bundle not found" });

  let abs;
  try {
    abs = resolveUnderExports(zipAbs);
  } catch {
    return res.status(403).end();
  }

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${path.basename(abs)}"`);
  fs.createReadStream(abs).pipe(res);
});

// ---- COMMAND FORWARDER (SAFE) ----

app.post("/api/command", async (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== "string" || !message.startsWith("/")) {
    return res.status(400).json({ error: "command must start with /" });
  }

  const threadId = String(req.headers["x-thread-id"] || "ui_thread");

  const out = await sendMessage({
    type: "user_message",
    message,
    threadId,
  });

  res.json(out);
});

// ---- SCOPED LOCAL CLI: audit export (per execution) ----

app.post("/api/audit/export", (req, res) => {
  const execution_id = String(req.body?.execution_id || "").trim();
  if (!execution_id) return res.status(400).json({ error: "execution_id required" });
  if (!/^[a-zA-Z0-9_.:-]{1,220}$/.test(execution_id)) {
    return res.status(400).json({ error: "invalid execution_id" });
  }

  const cliEntry = path.join(process.cwd(), "src", "cli", "run-command.ts");
  const args = ["--loader", "tsx", cliEntry, `/audit export ${execution_id}`];

  const proc = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      // Ensure the UI-triggered export is deterministic and not sensitive to ambient strictness.
      STRICT_AGENT_OUTPUT: process.env.STRICT_AGENT_OUTPUT === "1" ? "1" : "0",
    },
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });

  const stdout = String(proc.stdout || "").trim();
  const stderr = String(proc.stderr || "").trim();

  if (proc.status !== 0) {
    return res.status(500).json({ error: "audit export failed", exit: proc.status, stderr: stderr.slice(0, 2000) });
  }

  try {
    const json = stdout ? JSON.parse(stdout) : null;
    return res.json({ ok: true, result: json, stderr: stderr || null });
  } catch {
    return res.json({ ok: true, result: null, raw_stdout: stdout.slice(0, 2000), stderr: stderr || null });
  }
});

// ---- Static UI ----

// Legacy: served under /legacy
if (fs.existsSync(LEGACY_PUBLIC)) {
  app.use("/legacy", express.static(LEGACY_PUBLIC));
}

// React build: served at /
if (fs.existsSync(CLIENT_DIST) && fs.existsSync(path.join(CLIENT_DIST, "index.html"))) {
  app.use(express.static(CLIENT_DIST));
  app.get("/", (_req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));
  app.get("/*", (_req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));
} else if (fs.existsSync(LEGACY_PUBLIC) && fs.existsSync(path.join(LEGACY_PUBLIC, "index.html"))) {
  // If React isn't built yet, serve legacy at /
  app.use(express.static(LEGACY_PUBLIC));
}

let _server = null;

function listenOnce(port) {
  return new Promise((resolve, reject) => {
    const srv = app.listen(port, HOST, () => resolve({ server: srv, port }));
    srv.on("error", (err) => {
      try {
        srv.close(() => reject(err));
      } catch {
        reject(err);
      }
    });
  });
}

async function startServer() {
  const maxTries = Number.isFinite(PORT_FALLBACK_RANGE) ? Math.max(0, PORT_FALLBACK_RANGE) : 20;
  let lastErr = null;

  for (let i = 0; i <= maxTries; i++) {
    const port = DESIRED_PORT + i;
    try {
      const { server, port: bound } = await listenOnce(port);
      _server = server;

      // Best-effort: set this node's URL for cluster views.
      try {
        setSelfUrl(`http://${HOST}:${bound}`);
      } catch {
        // ignore
      }

      // Best-effort: persist selected port for other tools/processes.
      try {
        if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });
        fs.writeFileSync(
          path.join(RUNS_DIR, "ui-port.json"),
          JSON.stringify({ port: bound, host: HOST, at: new Date().toISOString() }, null, 2),
          "utf8",
        );
      } catch {
        // ignore
      }

      console.log(`[UI] Operator console at http://localhost:${bound}`);
      if (fs.existsSync(LEGACY_PUBLIC)) console.log(`[UI] Legacy UI at http://localhost:${bound}/legacy`);
      if (bound !== DESIRED_PORT) {
        console.warn(`[UI] ⚠️ Port ${DESIRED_PORT} busy; using ${bound} instead.`);
      }
      return;
    } catch (err) {
      lastErr = err;
      if (err?.code === "EADDRINUSE") continue;
      throw err;
    }
  }

  const msg = lastErr?.message || String(lastErr || "unknown error");
  const e = new Error(`Unable to bind UI server after ${maxTries + 1} attempts: ${msg}`);
  e.cause = lastErr;
  throw e;
}

function shutdown(signal) {
  if (!_server) process.exit(0);
  _server.close(() => {
    // eslint-disable-next-line no-console
    console.log(`[UI] Server stopped (${signal || "shutdown"}).`);
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Crash-to-supervisor policy: log and exit non-zero so scripts/supervise-ui-server.mjs can restart.
process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("[UI] ❌ Uncaught exception:", err?.stack || err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[UI] ❌ Unhandled rejection:", reason);
  process.exit(1);
});

startServer().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[UI] ❌ Failed to start server:", err?.stack || err);
  process.exit(1);
});

import { spawn } from "node:child_process";

function mustString(v, name) {
  if (typeof v !== "string" || v.trim() === "") {
    throw new Error(`Missing ${name} (expected non-empty string)`);
  }
  return v;
}

function jsonEq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hintUnsetMockBaseUrl() {
  // Keep this PowerShell-centric since most local runs are on Windows.
  return "If MOCK_BASE_URL is set in your shell, unset it (PowerShell: Remove-Item Env:MOCK_BASE_URL) or set it to the running mock server (e.g. http://localhost:8787).";
}

async function httpJson(url, { method, headers, body }) {
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Non-JSON response (${res.status}) from ${url}: ${text.slice(0, 500)}`);
  }
  return { status: res.status, ok: res.ok, json };
}

async function waitForReady(statusUrl, timeoutMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(statusUrl, { method: "GET" });
      if (res.status === 200) return;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Mock server not reachable at ${statusUrl}`);
}

async function expectJsonErrorStatus(url, { method, headers, body, expectedStatus }) {
  const { status, json } = await httpJson(url, { method, headers, body });
  if (status !== expectedStatus) {
    throw new Error(
      `Expected HTTP ${expectedStatus} from ${url}; got ${status}: ${JSON.stringify(json).slice(0, 500)}`
    );
  }
  const err = json?.error;
  if (typeof err !== "string" || err.trim() === "") {
    throw new Error(
      `Expected JSON error string from ${url} (${expectedStatus}); got: ${JSON.stringify(json).slice(0, 500)}`
    );
  }
}

function runCliCommand(command, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "./src/cli/run-command.ts", command], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    child.on("error", reject);
    child.on("exit", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function expectCliFailure(command, env, { stderrIncludes }) {
  const res = await runCliCommand(command, env);
  if (res.code === 0) {
    throw new Error(
      `Expected CLI failure, but exit=0 for: ${command}\nSTDOUT:\n${res.stdout.slice(0, 800)}\nSTDERR:\n${res.stderr.slice(0, 800)}`
    );
  }
  if (stderrIncludes && !String(res.stderr).includes(stderrIncludes)) {
    throw new Error(
      `Expected CLI stderr to include '${stderrIncludes}', got:\n${res.stderr.slice(0, 1200)}`
    );
  }
}

function unwrapAgentResponse(envelope) {
  const responseText = envelope?.response;
  if (typeof responseText !== "string" || responseText.trim() === "") {
    throw new Error("Invalid webhook envelope: missing response string");
  }
  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid webhook envelope: response was not JSON: ${responseText.slice(0, 500)}`);
  }
}

async function main() {
  const secret = mustString(process.env.WEBHOOK_SECRET, "WEBHOOK_SECRET env var");
  const baseUrlRaw = process.env.MOCK_BASE_URL || "http://localhost:8787";
  const baseUrl = baseUrlRaw.replace(/\/$/, "");

  // Deterministic override: if MOCK_BASE_URL is set, use it as the source of truth
  // to avoid inheriting stale VALIDATION_WEBHOOK_URL/PLANNER_WEBHOOK_URL from other shells.
  const hasBaseOverride = typeof process.env.MOCK_BASE_URL === "string" && process.env.MOCK_BASE_URL.trim() !== "";
  const validationUrl = hasBaseOverride ? `${baseUrl}/validation` : (process.env.VALIDATION_WEBHOOK_URL || `${baseUrl}/validation`);
  const plannerUrl = hasBaseOverride ? `${baseUrl}/planner` : (process.env.PLANNER_WEBHOOK_URL || `${baseUrl}/planner`);

  try {
    await waitForReady(`${baseUrl}/status/200`, 2500);
  } catch (e) {
    const extra = hasBaseOverride
      ? `MOCK_BASE_URL is set to ${baseUrlRaw}. ${hintUnsetMockBaseUrl()}`
      : `Set MOCK_BASE_URL to the mock server base URL if it is not running on :8787.`;
    throw new Error(`${String(e?.message || e)}\n${extra}`);
  }

  const threadId = process.env.THREAD_ID || `smoke_dual_${Date.now()}`;
  const message = '/build document-intake {"path":"./docs"}';
  const expectedPath = "./docs";
  const statusMessage = "/status validation-agent";
  const expectedAgent = "validation-agent";
  const validateMessage = '/validate task-1 {"check":"syntax"}';

  const headers = {
    "Content-Type": "application/json",
    "X-Webhook-Secret": secret,
    "Cache-Control": "no-store",
  };

  // 0) Negative auth checks (contract hardening)
  {
    const headersMissingSecret = { ...headers };
    delete headersMissingSecret["X-Webhook-Secret"];

    const headersWrongSecret = { ...headers, "X-Webhook-Secret": `${secret}_wrong` };

    const body = JSON.stringify({ type: "user_message", threadId, message });

    await expectJsonErrorStatus(validationUrl, {
      method: "POST",
      headers: headersMissingSecret,
      body,
      expectedStatus: 401,
    });
    await expectJsonErrorStatus(validationUrl, {
      method: "POST",
      headers: headersWrongSecret,
      body,
      expectedStatus: 403,
    });

    await expectJsonErrorStatus(plannerUrl, {
      method: "POST",
      headers: headersMissingSecret,
      body,
      expectedStatus: 401,
    });
    await expectJsonErrorStatus(plannerUrl, {
      method: "POST",
      headers: headersWrongSecret,
      body,
      expectedStatus: 403,
    });
  }

  // 1) Direct validation endpoint
  {
    const { status, ok, json } = await httpJson(validationUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "user_message", threadId, message }),
    });

    if (!ok) {
      throw new Error(`POST /validation failed (${status}): ${JSON.stringify(json).slice(0, 500)}`);
    }

    const inner = unwrapAgentResponse(json);
    if (inner?.kind !== "ValidatedCommand") {
      throw new Error(`Expected ValidatedCommand from /validation; got: ${inner?.kind}`);
    }
    if (inner?.allowed !== true) {
      throw new Error("Expected validation allowed=true");
    }
    if (inner?.intent !== "document-intake") {
      throw new Error(`Expected intent=document-intake; got: ${inner?.intent}`);
    }
    if (!jsonEq(inner?.args, { path: expectedPath })) {
      throw new Error(`Expected args.path=${expectedPath}; got: ${JSON.stringify(inner?.args)}`);
    }
  }

  // 1b) Direct validation deny: unknown build target
  {
    const denyMessage = "/build does-not-exist {}";
    const { status, ok, json } = await httpJson(validationUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "user_message", threadId, message: denyMessage }),
    });

    if (!ok) {
      throw new Error(`POST /validation(deny) failed (${status}): ${JSON.stringify(json).slice(0, 500)}`);
    }

    const inner = unwrapAgentResponse(json);
    if (inner?.kind !== "ValidatedCommand") {
      throw new Error(`Expected ValidatedCommand deny from /validation; got: ${inner?.kind}`);
    }
    if (inner?.allowed !== false) {
      throw new Error("Expected validation allowed=false for unknown build target");
    }
    if (typeof inner?.denial_reason !== "string" || inner.denial_reason.trim() === "") {
      throw new Error("Expected denial_reason for unknown build target");
    }
  }

  // 1c) Invalid JSON request body to webhook should yield 400 JSON error
  {
    await expectJsonErrorStatus(validationUrl, {
      method: "POST",
      headers,
      body: "{",
      expectedStatus: 400,
    });
  }

  // 1d) Direct validation endpoint: /status
  {
    const { status, ok, json } = await httpJson(validationUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "user_message", threadId, message: statusMessage }),
    });

    if (!ok) {
      throw new Error(`POST /validation(/status) failed (${status}): ${JSON.stringify(json).slice(0, 500)}`);
    }

    const inner = unwrapAgentResponse(json);
    if (inner?.kind !== "ValidatedCommand" || inner?.allowed !== true) {
      throw new Error("Expected allowed ValidatedCommand for /status");
    }
    if (inner?.intent !== "status") {
      throw new Error(`Expected intent=status; got: ${inner?.intent}`);
    }
    if (!jsonEq(inner?.args, { agent: expectedAgent })) {
      throw new Error(`Expected args.agent=${expectedAgent}; got: ${JSON.stringify(inner?.args)}`);
    }
  }

  // 1e) Direct validation endpoint: /validate
  {
    const { status, ok, json } = await httpJson(validationUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "user_message", threadId, message: validateMessage }),
    });

    if (!ok) {
      throw new Error(`POST /validation(/validate) failed (${status}): ${JSON.stringify(json).slice(0, 500)}`);
    }

    const inner = unwrapAgentResponse(json);
    if (inner?.kind !== "ValidatedCommand" || inner?.allowed !== true) {
      throw new Error("Expected allowed ValidatedCommand for /validate");
    }
    if (inner?.intent !== "validate") {
      throw new Error(`Expected intent=validate; got: ${inner?.intent}`);
    }
    if (inner?.args?.taskId !== "task-1") {
      throw new Error(`Expected args.taskId=task-1; got: ${JSON.stringify(inner?.args).slice(0, 200)}`);
    }
  }

  // 1f) Direct validation endpoint: /validate missing taskId should return NeedInput
  {
    const { status, ok, json } = await httpJson(validationUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "user_message", threadId, message: "/validate" }),
    });

    if (!ok) {
      throw new Error(`POST /validation(/validate missing) failed (${status}): ${JSON.stringify(json).slice(0, 500)}`);
    }

    const inner = unwrapAgentResponse(json);
    if (inner?.kind !== "NeedInput") {
      throw new Error(`Expected NeedInput for missing taskId; got: ${inner?.kind}`);
    }
  }

  // 2) Direct planner endpoint
  {
    const { status, ok, json } = await httpJson(plannerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "user_message", threadId, message }),
    });

    if (!ok) {
      throw new Error(`POST /planner failed (${status}): ${JSON.stringify(json).slice(0, 500)}`);
    }

    const inner = unwrapAgentResponse(json);
    if (inner?.kind !== "ExecutionPlan") {
      throw new Error(`Expected ExecutionPlan from /planner; got: ${inner?.kind}`);
    }
    if (!Array.isArray(inner?.steps) || inner.steps.length < 1) {
      throw new Error("Expected planner to return at least 1 step for document-intake");
    }

    const step0 = inner.steps[0];
    if (step0?.action !== "scan_documents") {
      throw new Error(`Expected first step action=scan_documents; got: ${step0?.action}`);
    }
    if (step0?.url !== `${baseUrl}/intake/scan`) {
      throw new Error(`Expected first step url=${baseUrl}/intake/scan; got: ${step0?.url}`);
    }
    if (!jsonEq(step0?.payload, { path: expectedPath })) {
      throw new Error(`Expected first step payload.path=${expectedPath}; got: ${JSON.stringify(step0?.payload)}`);
    }
  }

  // 2b) Direct planner endpoint: /status
  {
    const { status, ok, json } = await httpJson(plannerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "user_message", threadId, message: statusMessage }),
    });

    if (!ok) {
      throw new Error(`POST /planner(/status) failed (${status}): ${JSON.stringify(json).slice(0, 500)}`);
    }

    const inner = unwrapAgentResponse(json);
    if (inner?.kind !== "ExecutionPlan") {
      throw new Error(`Expected ExecutionPlan from /planner(/status); got: ${inner?.kind}`);
    }
    if (!Array.isArray(inner?.steps) || inner.steps.length < 1) {
      throw new Error("Expected planner to return at least 1 step for /status");
    }
    const step0 = inner.steps[0];
    if (step0?.action !== "agent.status") {
      throw new Error(`Expected first step action=agent.status; got: ${step0?.action}`);
    }
    if (step0?.url !== `${baseUrl}/agent/status?agent=${expectedAgent}`) {
      throw new Error(`Expected first step url=${baseUrl}/agent/status?agent=${expectedAgent}; got: ${step0?.url}`);
    }
  }

  // 3) CLI run (executes validator + planner + executor against the mock server)
  {
    const env = {
      ...process.env,
      WEBHOOK_SECRET: secret,
      VALIDATION_WEBHOOK_URL: validationUrl,
      PLANNER_WEBHOOK_URL: plannerUrl,
      THREAD_ID: threadId,
    };

    const res = await runCliCommand(message, env);

    if (res.code !== 0) {
      throw new Error(
        `CLI command failed (exit ${res.code}).\nSTDOUT:\n${res.stdout.slice(0, 2000)}\nSTDERR:\n${res.stderr.slice(0, 2000)}`
      );
    }

    // CLI should fail fast on malformed JSON payload tails (before sending).
    await expectCliFailure('/build document-intake {"path":', env, {
      stderrIncludes: "Invalid JSON payload",
    });

    // CLI should successfully execute additional command types.
    const statusRes = await runCliCommand(statusMessage, env);
    if (statusRes.code !== 0) {
      throw new Error(
        `CLI /status failed (exit ${statusRes.code}).\nSTDOUT:\n${statusRes.stdout.slice(0, 2000)}\nSTDERR:\n${statusRes.stderr.slice(0, 2000)}`
      );
    }

    // CLI should emit deterministic usage errors for invalid syntax.
    await expectCliFailure("/status", env, { stderrIncludes: "Usage: /status <agent>" });
    await expectCliFailure("/config get", env, { stderrIncludes: "Usage: /config get <key>" });

    // JSON-tail enforcement should also cover /logs.
    await expectCliFailure('/logs validation-agent {"lines":', env, {
      stderrIncludes: "Invalid JSON payload",
    });

    // JSON-tail enforcement should also cover /validate and batch commands.
    await expectCliFailure('/validate task-1 {"check":', env, {
      stderrIncludes: "Invalid JSON payload",
    });
    await expectCliFailure('/validate-batch {"tasks":', env, {
      stderrIncludes: "Invalid JSON payload",
    });
    await expectCliFailure('/build-batch {"agents":', env, {
      stderrIncludes: "Invalid JSON payload",
    });

    // /validate-batch should return a deterministic per-item result list.
    const validateBatchCmd =
      '/validate-batch {"tasks":[{"taskId":"task-1","payload":{"check":"syntax"}},{"taskId":"bad-task","payload":{"check":"syntax"}}]}';
    const vbRes = await runCliCommand(validateBatchCmd, env);
    if (vbRes.code === 0) {
      // code 0 only when all items are allowed
      throw new Error(`Expected /validate-batch to report a failure for bad-task (non-zero exit), got 0.`);
    }
    let vbJson;
    try {
      vbJson = JSON.parse(vbRes.stdout);
    } catch {
      throw new Error(`Expected JSON stdout from /validate-batch, got:\n${vbRes.stdout.slice(0, 1200)}`);
    }
    if (vbJson?.kind !== "ValidateBatchResult" || !Array.isArray(vbJson?.results)) {
      throw new Error(`Unexpected /validate-batch output: ${JSON.stringify(vbJson).slice(0, 500)}`);
    }
    if (vbJson.results.length !== 2) {
      throw new Error(`Expected 2 /validate-batch results, got ${vbJson.results.length}`);
    }

    // /build-batch should run /build for each agent with isolation.
    const buildBatchCmd =
      '/build-batch {"agents":[{"agent":"validation-agent","payload":{}},{"agent":"document-intake","payload":{"path":"./docs"}}]}';
    const bbRes = await runCliCommand(buildBatchCmd, env);
    if (bbRes.code !== 0) {
      throw new Error(
        `CLI /build-batch failed (exit ${bbRes.code}).\nSTDOUT:\n${bbRes.stdout.slice(0, 2000)}\nSTDERR:\n${bbRes.stderr.slice(0, 2000)}`
      );
    }
    let bbJson;
    try {
      bbJson = JSON.parse(bbRes.stdout);
    } catch {
      throw new Error(`Expected JSON stdout from /build-batch, got:\n${bbRes.stdout.slice(0, 1200)}`);
    }
    if (bbJson?.kind !== "BuildBatchResult" || !Array.isArray(bbJson?.results)) {
      throw new Error(`Unexpected /build-batch output: ${JSON.stringify(bbJson).slice(0, 500)}`);
    }
    if (bbJson.results.length !== 2 || bbJson.results.some((r) => r?.ok !== true)) {
      throw new Error(`Expected both /build-batch items to succeed, got: ${JSON.stringify(bbJson.results).slice(0, 800)}`);
    }
  }

  // 4) Direct validation again (ensures repeated calls remain stable and authenticated)
  {
    const secondThread = `${threadId}_2`;
    const { status, ok, json } = await httpJson(validationUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "user_message", threadId: secondThread, message }),
    });

    if (!ok) {
      throw new Error(`Second POST /validation failed (${status}): ${JSON.stringify(json).slice(0, 500)}`);
    }

    const inner = unwrapAgentResponse(json);
    if (inner?.kind !== "ValidatedCommand" || inner?.allowed !== true) {
      throw new Error("Second validation did not return allowed ValidatedCommand");
    }
  }

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        plannerUrl,
        validationUrl,
        threadId,
        checks: [
          "POST /validation contract",
          "POST /validation /status contract",
          "POST /validation /validate contract",
          "POST /planner contract",
          "POST /planner /status contract",
          "CLI /build end-to-end",
          "CLI /status end-to-end",
          "CLI /validate-batch",
          "CLI /build-batch",
          "Repeat /validation stability",
        ],
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((err) => {
  process.exitCode = 1;
  console.error(String(err?.stack || err?.message || err));
});

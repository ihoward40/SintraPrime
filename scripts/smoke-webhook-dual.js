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
          "POST /planner contract",
          "CLI /build end-to-end",
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

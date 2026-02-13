import { spawn } from "node:child_process";
import net from "node:net";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isLocalhostUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  } catch {
    return false;
  }
}

function forceKillProcessTree(pid) {
  if (!pid) return;

  if (process.platform === "win32") {
    // Best-effort: kill the whole tree.
    try {
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      // ignore
    }
    return;
  }

  // On Unix, try process group first (when spawned with detached: true).
  try {
    process.kill(-pid, "SIGKILL");
    return;
  } catch {
    // ignore
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // ignore
  }
}

function runNodeScript(scriptPath, args = [], { timeoutMs } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: "inherit",
      env: process.env,
      windowsHide: true,
    });

    let timeout;
    if (typeof timeoutMs === "number" && timeoutMs > 0) {
      timeout = setTimeout(() => {
        console.error(`[integration] TIMEOUT running ${scriptPath} after ${timeoutMs}ms`);
        forceKillProcessTree(child.pid);
        resolve(124);
      }, timeoutMs);
    }

    child.on("exit", (code) => {
      if (timeout) clearTimeout(timeout);
      resolve(code ?? 1);
    });
    child.on("error", () => {
      if (timeout) clearTimeout(timeout);
      resolve(1);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function isPortOpen(host, port) {
  return await new Promise((resolve) => {
    const socket = net.connect({ host, port });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function waitForPort(host, port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await isPortOpen(host, port);
    if (ok) return;
    await sleep(250);
  }
  throw new Error(`mock server did not open ${host}:${port} within ${timeoutMs}ms`);
}

if (process.env.RUN_INTEGRATION_TESTS !== "1") {
  console.log('[skip] integration tests: set RUN_INTEGRATION_TESTS=1 to enable');
  process.exit(0);
}

let exitCode = 0;

const HOST = "127.0.0.1";
const PORT = 8787;
const localSecret = process.env.WEBHOOK_SECRET ?? "localdev";
const localUrl = process.env.WEBHOOK_URL ?? `http://${HOST}:${PORT}/validation`;

// Provide safe defaults for child scripts (test-build.js reads these).
process.env.WEBHOOK_SECRET = localSecret;
process.env.WEBHOOK_URL = localUrl;

let mockProc;
let shuttingDown = false;

async function stopMockServer() {
  if (!mockProc) return;

  if (mockProc.exitCode !== null) {
    mockProc = undefined;
    return;
  }

  mockProc.kill();

  const exited = await Promise.race([
    new Promise((resolve) => mockProc.once("exit", () => resolve(true))),
    sleep(2000).then(() => false),
  ]);

  if (!exited && mockProc.exitCode === null) {
    forceKillProcessTree(mockProc.pid);
  }

  mockProc = undefined;
}

async function shutdownWith(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await stopMockServer();
  } finally {
    process.exit(code);
  }
}

process.on("SIGINT", () => {
  console.log("\n[integration] received SIGINT; shutting down...");
  void shutdownWith(130);
});

process.on("SIGTERM", () => {
  console.log("\n[integration] received SIGTERM; shutting down...");
  void shutdownWith(143);
});

try {
  // Refuse to hit the internet unless explicitly allowed.
  if (!isLocalhostUrl(localUrl) && process.env.ALLOW_NONLOCAL_WEBHOOK_TESTS !== "1") {
    console.log(`[integration] SKIP webhook tests (refusing non-local WEBHOOK_URL: ${localUrl})`);
    console.log("[integration] Set ALLOW_NONLOCAL_WEBHOOK_TESTS=1 to override");
  } else {
    // Auto-start mock server when using localhost, unless something is already listening.
    if (isLocalhostUrl(localUrl)) {
      const alreadyUp = await isPortOpen(HOST, PORT);
      if (alreadyUp) {
        console.log(`[integration] mock server already listening on ${HOST}:${PORT}; not starting a new one`);
      } else {
        console.log(`[integration] starting mock server on ${HOST}:${PORT}...`);
        mockProc = spawn(process.execPath, ["./scripts/mock-server.js"], {
          stdio: "inherit",
          env: { ...process.env, WEBHOOK_SECRET: localSecret },
          windowsHide: true,
          detached: process.platform !== "win32",
        });

        if (mockProc.detached) {
          // Allow parent to exit without waiting on child,
          // while still permitting kill-by-process-group.
          mockProc.unref();
        }

        await waitForPort(HOST, PORT);
        console.log("[integration] mock server is up");
      }
    }

    // Run the webhook integration check (stays local by default).
    console.log("[integration] RUN test-build.js");
    const code = await runNodeScript("./test-build.js", [], { timeoutMs: 60_000 });
    exitCode = exitCode || code;
  }

  // 2) ElevenLabs diagnostic (optional)
  {
    const hasKey = isNonEmptyString(process.env.ELEVEN_API_KEY);

    if (!hasKey) {
      console.log("[integration] SKIP test-elevenlabs-complete.mjs (set ELEVEN_API_KEY to enable)");
    } else {
      console.log("[integration] RUN test-elevenlabs-complete.mjs");
      // Keep behavior consistent with the existing npm script `diag:elevenlabs`.
      const code = await runNodeScript(
        "./scripts/load-env.mjs",
        ["./test-elevenlabs-complete.mjs"],
        { timeoutMs: 5 * 60_000 }
      );
      exitCode = exitCode || code;
    }
  }
} finally {
  await stopMockServer();
}

if (exitCode !== 0) process.exit(exitCode);

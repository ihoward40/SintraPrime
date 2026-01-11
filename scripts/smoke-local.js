import { spawn } from "node:child_process";

const basePort = Number(process.env.MOCK_PORT || 8787);
const command =
  process.argv.slice(2).join(" ").trim() ||
  '/build validation-agent {"dry_run":true}';

const secret =
  (process.env.WEBHOOK_SECRET && String(process.env.WEBHOOK_SECRET)) ||
  "local_dev_secret";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res && res.status === 200) return;
    } catch {
      // ignore
    }
    await wait(100);
  }
  throw new Error(`Mock server did not become ready at ${url}`);
}

function runNode(args, env, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });
  });
}

async function startMockServer({ port, env }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["./scripts/mock-server.js"], {
      stdio: "inherit",
      env,
    });
    child.once("spawn", () => resolve(child));
  });
}

let mock = null;
let chosenPort = basePort;

try {
  // Try a small range of ports in case an old mock server is already running.
  for (let i = 0; i < 20; i++) {
    chosenPort = basePort + i;
    const validationUrl = `http://localhost:${chosenPort}/validation`;
    const plannerUrl = `http://localhost:${chosenPort}/planner`;

    const env = {
      ...process.env,
      WEBHOOK_SECRET: secret,
      VALIDATION_WEBHOOK_URL: validationUrl,
      PLANNER_WEBHOOK_URL: plannerUrl,
      MOCK_PORT: String(chosenPort),
    };

    mock = await startMockServer({ port: chosenPort, env });

    try {
      await waitForServer(`http://localhost:${chosenPort}/status/200`, 1500);
      await runNode(
        ["--import", "tsx", "./src/cli/run-command.ts", command],
        env,
        "run-command"
      );
      break;
    } catch (e) {
      // If the server failed to bind or isn't healthy, kill and try next port.
      try {
        mock.kill();
      } catch {
        // ignore
      }
      mock = null;
      if (i === 19) throw e;
    }
  }
} finally {
  if (mock) {
    try {
      mock.kill();
    } catch {
      // ignore
    }
  }
}

import { spawn } from "node:child_process";

function envNumber(name, fallback) {
  const raw = process.env[name];
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

const maxRestarts = envNumber("SINTRA_SUPERVISOR_MAX_RESTARTS", 50);
const baseDelayMs = envNumber("SINTRA_SUPERVISOR_BASE_DELAY_MS", 750);
const maxDelayMs = envNumber("SINTRA_SUPERVISOR_MAX_DELAY_MS", 30_000);

let restarts = 0;
let stopping = false;
let child = null;

function nextDelayMs() {
  // Exponential backoff with a cap.
  const d = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.min(restarts, 8)));
  // jitter 0-250ms
  return d + Math.floor(Math.random() * 250);
}

function spawnChild() {
  const nodeExec = process.execPath;
  const args = ["server.js"]; // root shim -> ui/server.js

  child = spawn(nodeExec, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });

  child.on("exit", (code, signal) => {
    child = null;
    if (stopping) return;

    // Normal exit: don’t restart.
    if (code === 0) {
      process.exit(0);
      return;
    }

    restarts += 1;
    if (restarts > maxRestarts) {
      // eslint-disable-next-line no-console
      console.error(`[supervisor] Max restarts exceeded (${maxRestarts}). Exiting.`);
      process.exit(code ?? 1);
      return;
    }

    const delay = nextDelayMs();
    // eslint-disable-next-line no-console
    console.error(`[supervisor] Server exited (code=${code}, signal=${signal}). Restarting in ${delay}ms…`);

    setTimeout(() => {
      if (stopping) return;
      spawnChild();
    }, delay);
  });
}

function stop(signal) {
  stopping = true;
  if (child) {
    try {
      child.kill(signal);
    } catch {
      // ignore
    }
  }
  process.exit(0);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

// eslint-disable-next-line no-console
console.log("[supervisor] Starting SintraPrime (supervised)…");
spawnChild();

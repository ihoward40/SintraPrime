import fs from "node:fs";

function sleepSync(ms: number) {
  // Cross-platform synchronous sleep without native deps.
  const sab = new SharedArrayBuffer(4);
  const ia = new Int32Array(sab);
  Atomics.wait(ia, 0, 0, ms);
}

export function withFileLockSync<T>(args: {
  lockPath: string;
  retries?: number;
  delayMs?: number;
  staleMs?: number;
  fn: () => T;
}): T {
  const retries = typeof args.retries === "number" ? args.retries : 25;
  const delayMs = typeof args.delayMs === "number" ? args.delayMs : 20;
  const staleMs = typeof args.staleMs === "number" ? args.staleMs : 60_000;

  let fd: number | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      fd = fs.openSync(args.lockPath, "wx");
      break;
    } catch (e: any) {
      if (e?.code !== "EEXIST") throw e;

      // Stale lock recovery: if the lock is older than staleMs, reclaim it.
      try {
        const st = fs.statSync(args.lockPath);
        const ageMs = Date.now() - st.mtimeMs;
        if (ageMs > staleMs) {
          try {
            fs.unlinkSync(args.lockPath);
            continue;
          } catch {
            // fall through to wait/retry
          }
        }
      } catch {
        // If we can't stat it, just wait/retry.
      }

      if (i === retries) throw new Error(`LOCK_FAIL: TIMEOUT (${args.lockPath})`);
      sleepSync(delayMs);
    }
  }

  try {
    try {
      fs.writeFileSync(fd!, `${process.pid}\n${new Date().toISOString()}\n`, "utf8");
    } catch {
      // best-effort
    }
    return args.fn();
  } finally {
    try {
      if (fd !== null) fs.closeSync(fd);
    } catch {
      // best-effort
    }
    try {
      fs.unlinkSync(args.lockPath);
    } catch {
      // best-effort
    }
  }
}

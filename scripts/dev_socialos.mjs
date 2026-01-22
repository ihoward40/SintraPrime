import { spawn } from "node:child_process";

function spawnLogged(cmd, args, { name, env }) {
  const child = spawn(cmd, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...(env || {}) },
    shell: process.platform === "win32"
  });

  const prefix = `[${name}] `;

  child.stdout.on("data", (buf) => {
    process.stdout.write(prefix + String(buf));
  });

  child.stderr.on("data", (buf) => {
    process.stderr.write(prefix + String(buf));
  });

  child.on("exit", (code, signal) => {
    const msg = signal ? `signal=${signal}` : `code=${code}`;
    process.stderr.write(`${prefix}exited (${msg})\n`);
  });

  return child;
}

function killAll(children, signal = "SIGTERM") {
  for (const c of children) {
    try {
      c.kill(signal);
    } catch {
      // ignore
    }
  }
}

const includeUi = process.env.SOCIALOS_UI !== "0";

const children = [];
children.push(
  spawnLogged("npm", ["--prefix", "socialos/api", "run", "dev"], {
    name: "socialos-api",
    env: {
      PORT: process.env.SOCIALOS_API_PORT || process.env.PORT || "8787"
    }
  })
);

if (includeUi) {
  children.push(spawnLogged("npm", ["--prefix", "socialos/ui", "run", "dev"], { name: "socialos-ui" }));
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  killAll(children, "SIGTERM");
  setTimeout(() => {
    killAll(children, "SIGKILL");
    process.exit(code);
  }, 1500).unref();
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

for (const c of children) {
  c.on("exit", (code) => {
    // If any child exits non-zero, bring everything down.
    if (typeof code === "number" && code !== 0) shutdown(code);
  });
}

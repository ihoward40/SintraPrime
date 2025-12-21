import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function repoRoot() {
  // scripts/dev.mjs lives in <repo>/scripts
  return path.resolve(__dirname, "..");
}

function withMockEnv(env = {}) {
  const port = String(process.env.MOCK_PORT || "8787");
  const merged = {
    ...process.env,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "local_test_secret",
    MOCK_PORT: port,
    PLANNER_WEBHOOK_URL: process.env.PLANNER_WEBHOOK_URL || `http://localhost:${port}/planner`,
    VALIDATION_WEBHOOK_URL: process.env.VALIDATION_WEBHOOK_URL || `http://localhost:${port}/validation`,
    NOTION_API_BASE: process.env.NOTION_API_BASE || `http://localhost:${port}`,
    NOTION_API_VERSION: process.env.NOTION_API_VERSION || "2022-06-28",
    NOTION_TOKEN: process.env.NOTION_TOKEN || "local_mock_token",
    NOTION_REDACT_KEYS: process.env.NOTION_REDACT_KEYS || "title,name",
    ...env,
  };

  // Match smoke harness behavior: `null` means "unset".
  for (const key of ["ALLOWED_DOMAINS", "ALLOWED_METHODS", "ENVIRONMENT", "NODE_ENV", "CONFIRM_PROD"]) {
    if (merged[key] == null || String(merged[key]).trim() === "") {
      delete merged[key];
    }
  }

  return merged;
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd || repoRoot(),
    env: opts.env || process.env,
    stdio: "inherit",
    shell: false,
  });
  process.exitCode = res.status ?? 1;
  if (res.error) throw res.error;
  return res.status ?? 1;
}

function runNpm(npmArgs, opts = {}) {
  if (process.platform === "win32") {
    // npm on Windows is typically a .cmd shim; invoke via cmd.exe for reliability.
    const cmd = process.env.ComSpec || "cmd.exe";
    const joined = npmArgs.map((a) => (a.includes(" ") ? `\"${a}\"` : a)).join(" ");
    return run(cmd, ["/d", "/s", "/c", `npm ${joined}`], opts);
  }
  return run("npm", npmArgs, opts);
}

function usage() {
  const rel = "node scripts/dev.mjs";
  console.log(`Usage:\n  ${rel} typecheck\n  ${rel} smoke\n  ${rel} mock\n  ${rel} cli <command>\n\nExamples:\n  ${rel} cli "/notion live db db_001"\n  ${rel} cli "/rankings compute 7"\n  ${rel} cli "/autonomy promote recommend"`);
}

const [task, ...rest] = process.argv.slice(2);

if (!task || task === "help" || task === "--help" || task === "-h") {
  usage();
  process.exit(0);
}

if (task === "typecheck") {
  runNpm(["run", "typecheck"]);
} else if (task === "smoke") {
  run(process.execPath, ["scripts/smoke-vectors.js"]);
} else if (task === "mock") {
  run(process.execPath, ["scripts/mock-server.js"], { env: withMockEnv() });
} else if (task === "cli") {
  const command = rest.join(" ").trim();
  if (!command) {
    console.error("Missing command string for cli task.");
    usage();
    process.exit(2);
  }
  const tsxEntrypoint = path.join(repoRoot(), "node_modules", "tsx", "dist", "cli.mjs");
  const cliEntry = path.join(repoRoot(), "src", "cli", "run-command.ts");
  run(process.execPath, [tsxEntrypoint, cliEntry, command], { env: withMockEnv() });
} else {
  console.error(`Unknown task: ${task}`);
  usage();
  process.exit(2);
}

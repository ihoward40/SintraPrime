import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const RUN_DIR = process.env.SINTRAPRIME_RUN_DIR || `runs/_ci_strict_arch_${Date.now()}`;
process.env.SINTRAPRIME_RUN_DIR = RUN_DIR;

// Default to running TS directly so CI doesn't have to build dist/.
const cmd = process.env.SINTRAPRIME_CLI_CMD || "node";
const args = (process.env.SINTRAPRIME_CLI_ARGS
  ? process.env.SINTRAPRIME_CLI_ARGS.split(" ")
  : ["--import", "tsx", "src/cli/run-command.ts"]
).filter(Boolean);

const res = spawnSync(cmd, [...args, "--strict-arch", "--arch", "__nope__"], {
  encoding: "utf8",
  env: { ...process.env },
});

if (res.status !== 2) {
  console.error("Expected exit code 2, got:", res.status);
  console.error("stdout:", res.stdout);
  console.error("stderr:", res.stderr);
  process.exit(1);
}

const refusalPath = path.resolve(process.cwd(), RUN_DIR, "refusal", "refusal.json");
const refusalMdPath = path.resolve(process.cwd(), RUN_DIR, "refusal", "refusal.md");
const receiptPath = path.resolve(process.cwd(), RUN_DIR, "receipt.json");
const eventsPath = path.resolve(process.cwd(), RUN_DIR, "events.jsonl");

for (const p of [refusalPath, refusalMdPath, receiptPath, eventsPath]) {
  if (!existsSync(p)) {
    console.error("Missing refusal-pack file:", p);
    process.exit(1);
  }
}

try {
  const refusal = JSON.parse(readFileSync(refusalPath, "utf8"));
  if (refusal?.type !== "REFUSE") throw new Error("refusal.type != REFUSE");
} catch (e) {
  console.error("Invalid refusal.json:", String(e?.message || e));
  process.exit(1);
}

console.log("OK: strict arch refusal produced refusal pack:", path.relative(process.cwd(), refusalPath));

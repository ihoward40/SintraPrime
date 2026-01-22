import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const RUN_DIR = process.env.SINTRAPRIME_RUN_DIR || `runs/_ci_strict_mode_${Date.now()}`;
process.env.SINTRAPRIME_RUN_DIR = RUN_DIR;

const cmd = process.env.SINTRAPRIME_CLI_CMD || "node";
const args = (process.env.SINTRAPRIME_CLI_ARGS
  ? process.env.SINTRAPRIME_CLI_ARGS.split(" ")
  : ["--import", "tsx", "src/cli/run-command.ts"]
).filter(Boolean);

const res = spawnSync(cmd, [...args, "--strict-mode", "--mode", "__nope__"], {
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
  if (String(refusal?.code ?? "").toUpperCase() !== "MODE_UNKNOWN") {
    throw new Error(`refusal.code != MODE_UNKNOWN (got ${String(refusal?.code ?? "")})`);
  }
} catch (e) {
  console.error("Invalid refusal.json:", String(e?.message || e));
  process.exit(1);
}

console.log("OK: strict mode refusal produced refusal pack:", path.relative(process.cwd(), refusalPath));

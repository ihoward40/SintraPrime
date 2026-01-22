import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cmd = process.env.SINTRAPRIME_CLI_CMD || "node";
const args = (process.env.SINTRAPRIME_CLI_ARGS
  ? process.env.SINTRAPRIME_CLI_ARGS.split(" ")
  : ["--import", "tsx", "src/cli/run-command.ts"]
).filter(Boolean);

const prefix = process.env.SINTRAPRIME_RUN_DIR || `runs/_ci_strict_any_${Date.now()}`;

function runWithDir(runDir, extraArgs) {
  const res = spawnSync(cmd, [...args, ...extraArgs], {
    encoding: "utf8",
    env: { ...process.env, SINTRAPRIME_RUN_DIR: runDir },
  });
  if (res.status !== 2) {
    console.error(`[${runDir}] Expected exit code 2, got:`, res.status);
    console.error("stdout:", res.stdout);
    console.error("stderr:", res.stderr);
    process.exit(1);
  }

  const refusalPath = path.resolve(process.cwd(), runDir, "refusal", "refusal.json");
  const refusalMdPath = path.resolve(process.cwd(), runDir, "refusal", "refusal.md");
  const receiptPath = path.resolve(process.cwd(), runDir, "receipt.json");
  const eventsPath = path.resolve(process.cwd(), runDir, "events.jsonl");

  for (const p of [refusalPath, refusalMdPath, receiptPath, eventsPath]) {
    if (!existsSync(p)) {
      console.error("Missing refusal-pack file:", p);
      process.exit(1);
    }
  }

  try {
    const refusal = JSON.parse(readFileSync(refusalPath, "utf8"));
    return refusal;
  } catch (e) {
    console.error("Invalid refusal.json:", String(e?.message || e));
    process.exit(1);
  }
}

const r1 = runWithDir(`${prefix}_arch_missing`, ["--strict-any"]);
if (String(r1?.code ?? "").toUpperCase() !== "ARCH_MISSING") {
  console.error(`Expected ARCH_MISSING, got: ${String(r1?.code ?? "")}`);
  process.exit(1);
}

// Provide a real arch id so strict-any reaches mode selection.
const r2 = runWithDir(`${prefix}_mode_unknown`, ["--strict-any", "--arch", "synergy-7", "--mode", "__nope__"]);
if (String(r2?.code ?? "").toUpperCase() !== "MODE_UNKNOWN") {
  console.error(`Expected MODE_UNKNOWN, got: ${String(r2?.code ?? "")}`);
  process.exit(1);
}

console.log("OK: strict-any enforces strict-arch + strict-mode refusals (exit=2).");

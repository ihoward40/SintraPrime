import fs from "node:fs";
import path from "node:path";

function mustExist(p, label) {
  if (!fs.existsSync(p)) throw new Error(`missing ${label}: ${p}`);
}

function findVisualizeRuns(rootDir) {
  if (!fs.existsSync(rootDir)) return [];

  /** @type {{ dir: string; plan: string; preflight: string; mtimeMs: number }[]} */
  const found = [];

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(rootDir, ent.name);
    const plan = path.join(dir, "visualize.plan.txt");
    const preflight = path.join(dir, "visualize.notion-preflight.txt");

    if (fs.existsSync(plan)) {
      const st = fs.statSync(plan);
      found.push({ dir, plan, preflight, mtimeMs: st.mtimeMs });
    }
  }

  found.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return found;
}

function main() {
  const runsDir = path.resolve(process.cwd(), "runs");
  const candidates = findVisualizeRuns(runsDir);
  if (!candidates.length) {
    throw new Error(`no runs found under: ${runsDir}`);
  }

  const run = candidates[0];

  mustExist(run.plan, "visualize.plan.txt");
  const planText = fs.readFileSync(run.plan, "utf8");
  if (!planText.includes("# ClickOps Visualize")) {
    throw new Error(`visualize.plan.txt does not look like a ClickOps visualize output: ${run.plan}`);
  }
  if (!planText.includes("# Notion Preflight")) {
    throw new Error(`visualize.plan.txt missing Notion Preflight section: ${run.plan}`);
  }

  mustExist(run.preflight, "visualize.notion-preflight.txt");
  const preflightText = fs.readFileSync(run.preflight, "utf8");

  const required = [
    "intent: openSortMenu",
    "intent: sortBy",
    "intent: addProperty.trigger",
    "intent: addProperty.type",
  ];
  for (const r of required) {
    if (!preflightText.includes(r)) throw new Error(`preflight missing: ${r}`);
  }

  if (preflightText.includes("result=not_found")) {
    throw new Error(`preflight contains unresolved targets (result=not_found)`);
  }

  process.stdout.write(`[clickops.notion.preflight.mock] PASS\n`);
  process.stdout.write(`[clickops.notion.preflight.mock] run_dir=${run.dir.replace(/\\/g, "/")}\n`);
}

try {
  main();
} catch (e) {
  process.stderr.write(String(e?.message ?? e) + "\n");
  process.exitCode = 2;
}
